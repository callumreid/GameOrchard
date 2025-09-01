import { useCallback, useRef, useState, useEffect } from "react";
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from "@openai/agents/realtime";

import { audioFormatForCodec, applyCodecPreferences } from "../lib/codecUtils";
import { useEvent } from "../contexts/EventContext";
import { useHandleSessionHistory } from "./useHandleSessionHistory";
import { usePermissions } from "./usePermissions";
import { SessionStatus } from "../types";

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  initialAgents: RealtimeAgent[];
  audioElement?: HTMLAudioElement;
  extraContext?: Record<string, any>;
  outputGuardrails?: any[];
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("DISCONNECTED");
  const { logClientEvent } = useEvent();
  const { requestMicrophonePermission, checkSecureContext } = usePermissions();

  // Tracks whether a game started/finished so we can enforce finish_* tool calls
  const gameStateRef = useRef<{
    currentStartFunction: string | null;
    currentFinishFunction: string | null;
    finishCalled: boolean;
    enforcementSent: boolean;
  }>({
    currentStartFunction: null,
    currentFinishFunction: null,
    finishCalled: false,
    enforcementSent: false,
  });

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks]
  );

  const { logServerEvent } = useEvent();

  const historyHandlers = useHandleSessionHistory().current;

  function extractGameSuffixFromStart(fnName?: string | null): string | null {
    if (!fnName) return null;
    const m = fnName.match(/^start_(.*)_game$/);
    return m ? m[1] : null;
  }

  function extractGameSuffixFromFinish(fnName?: string | null): string | null {
    if (!fnName) return null;
    const m = fnName.match(/^finish_(.*)_game$/);
    return m ? m[1] : null;
  }

  function containsCelebrationOrJudgement(text: string): boolean {
    const t = text.toLowerCase();
    return (
      /ho+ra+y/.test(t) || // HOOOOOORAYYYY variants
      /bo+o+/.test(t) || // BOOOOO variants
      t.includes("unicorn alert") ||
      t.includes("big dogs bark") ||
      t.includes("soul saved") ||
      t.includes("vests exploding") ||
      t.includes("you win") ||
      t.includes("you lose")
    );
  }

  async function enforceFinishIfNeeded(text: string) {
    const state = gameStateRef.current;
    if (!state.currentFinishFunction) return;
    if (state.finishCalled) return;
    if (state.enforcementSent) return;
    if (!containsCelebrationOrJudgement(text)) return;

    try {
      // Stop current output and instruct the agent to call the finish tool only
      sessionRef.current?.interrupt();
      const finishFn = state.currentFinishFunction;
      // Provide a terse corrective instruction
      sessionRef.current?.sendMessage(
        `Call ${finishFn}({success, score, message}) now. Only call the function, no additional words.`
      );
      state.enforcementSent = true;
    } catch (err) {
      console.warn("Failed to enforce finish tool call:", err);
    }
  }

  function handleTransportEvent(event: any) {
    // Handle additional server events that aren't managed by the session
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        historyHandlers.handleTranscriptionCompleted(event);
        break;
      }
      case "response.audio_transcript.done": {
        historyHandlers.handleTranscriptionCompleted(event);
        break;
      }
      case "response.audio_transcript.delta": {
        historyHandlers.handleTranscriptionDelta(event);
        break;
      }
      default: {
        logServerEvent(event);
        break;
      }
    }
  }

  const codecParamRef = useRef<string>(
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("codec") ?? "opus"
      : "opus"
    ).toLowerCase()
  );

  // Wrapper to pass current codec param
  const applyCodec = useCallback(
    (pc: RTCPeerConnection) => applyCodecPreferences(pc, codecParamRef.current),
    []
  );

  const handleAgentHandoff = (item: any) => {
    const history = item.context.history;
    const lastMessage = history[history.length - 1];
    const agentName = lastMessage.name.split("transfer_to_")[1];
    callbacks.onAgentHandoff?.(agentName);
  };

  useEffect(() => {
    if (sessionRef.current) {
      // Log server errors
      sessionRef.current.on("error", (...args: any[]) => {
        logServerEvent({
          type: "error",
          message: args[0],
        });
      });

      // history events
      sessionRef.current.on("agent_handoff", handleAgentHandoff);

      // Wrap tool events to maintain game state for finish enforcement
      sessionRef.current.on(
        "agent_tool_start",
        (details: any, agent: any, fn: any) => {
          const fnName: string | undefined = fn?.name;
          const startSuffix = extractGameSuffixFromStart(fnName ?? null);
          if (startSuffix) {
            gameStateRef.current.currentStartFunction = `start_${startSuffix}_game`;
            gameStateRef.current.currentFinishFunction = `finish_${startSuffix}_game`;
            gameStateRef.current.finishCalled = false;
            gameStateRef.current.enforcementSent = false;
          }
          historyHandlers.handleAgentToolStart(details, agent, fn);
        }
      );

      sessionRef.current.on(
        "agent_tool_end",
        (details: any, agent: any, fn: any, result: any) => {
          const fnName: string | undefined = fn?.name;
          const finishSuffix = extractGameSuffixFromFinish(fnName ?? null);
          if (finishSuffix) {
            // Mark finished and clear enforcement flag
            gameStateRef.current.finishCalled = true;
            gameStateRef.current.enforcementSent = false;
          }
          historyHandlers.handleAgentToolEnd(details, agent, fn, result);
        }
      );

      sessionRef.current.on("history_updated", (items: any[]) => {
        // Check for celebratory text before finish tool call
        try {
          items.forEach((item: any) => {
            if (!item || item.type !== "message" || item.role !== "assistant")
              return;
            const content: any[] = item.content ?? [];
            const text = content
              .map((c: any) => (c?.type === "input_text" ? c.text ?? "" : ""))
              .filter(Boolean)
              .join("\n");
            if (text) enforceFinishIfNeeded(text);
          });
        } catch (e) {
          console.error("Error in history_updated:", e);
        }
        historyHandlers.handleHistoryUpdated(items);
      });

      sessionRef.current.on("history_added", (item: any) => {
        try {
          if (item && item.type === "message" && item.role === "assistant") {
            const content: any[] = item.content ?? [];
            const text = content
              .map((c: any) => (c?.type === "input_text" ? c.text ?? "" : ""))
              .filter(Boolean)
              .join("\n");
            if (text) enforceFinishIfNeeded(text);
          }
        } catch (e) {
          console.error("Error in history_updated:", e);
        }
        historyHandlers.handleHistoryAdded(item);
      });

      sessionRef.current.on(
        "guardrail_tripped",
        historyHandlers.handleGuardrailTripped
      );

      // additional transport events
      sessionRef.current.on("transport_event", handleTransportEvent);
    }
  }, [sessionRef.current]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
      outputGuardrails,
    }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      // Check secure context and permissions before connecting
      if (!checkSecureContext()) {
        console.error("Cannot connect: not in secure context");
        updateStatus("DISCONNECTED");
        return;
      }

      // Request microphone permission before establishing WebRTC connection
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        console.error("Cannot connect: microphone permission denied");
        updateStatus("DISCONNECTED");
        return;
      }

      updateStatus("CONNECTING");

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      // This lets you use the codec selector in the UI to force narrow-band (8 kHz) codecs to
      //  simulate how the voice agent sounds over a PSTN/SIP phone call.
      const codecParam = codecParamRef.current;
      const audioFormat = audioFormatForCodec(codecParam);
      console.log(
        `[RealtimeSession] Using codec: ${codecParam}, audio format: ${audioFormat}`
      );

      sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          // Set preferred codec before offer creation
          changePeerConnection: async (pc: RTCPeerConnection) => {
            applyCodec(pc);

            // Set up the connection to support audio but initially mute it to prevent automatic transcription
            console.log(
              "[RealtimeSession] Setting up WebRTC with muted microphone initially - will unmute on PTT"
            );

            return pc;
          },
        }),
        model: "gpt-realtime",
        config: {
          inputAudioFormat: audioFormat,
          outputAudioFormat: audioFormat,
          inputAudioTranscription: {
            model: "gpt-4o-mini-transcribe",
          },
          turnDetection: undefined,
        },
        // Add a lightweight guardrail that nudges the agent to call the finish_* tool
        outputGuardrails: outputGuardrails ?? [],
        context: extraContext ?? {},
      });

      await sessionRef.current.connect({ apiKey: ek });

      // Initially mute the session to prevent automatic transcription
      console.log("[RealtimeSession] Muting WebRTC session initially");
      sessionRef.current.mute(true);

      updateStatus("CONNECTED");
    },
    [callbacks, updateStatus, checkSecureContext, requestMicrophonePermission]
  );

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    updateStatus("DISCONNECTED");
  }, [updateStatus]);

  const assertconnected = () => {
    if (!sessionRef.current) throw new Error("RealtimeSession not connected");
  };

  /* ----------------------- message helpers ------------------------- */

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const sendUserText = useCallback((text: string) => {
    assertconnected();
    sessionRef.current!.sendMessage(text);
  }, []);

  const sendEvent = useCallback((ev: any) => {
    sessionRef.current?.transport.sendEvent(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(async () => {
    if (!sessionRef.current) return;

    // Unmute the session for push-to-talk
    console.log("[PTT] Unmuting WebRTC session");
    sessionRef.current.mute(false);

    sessionRef.current.transport.sendEvent({
      type: "input_audio_buffer.clear",
    } as any);
  }, []);

  const pushToTalkStop = useCallback(async () => {
    if (!sessionRef.current) return;

    // Mute the session again
    console.log("[PTT] Muting WebRTC session");
    sessionRef.current.mute(true);

    sessionRef.current.transport.sendEvent({
      type: "input_audio_buffer.commit",
    } as any);
    sessionRef.current.transport.sendEvent({ type: "response.create" } as any);
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } as const;
}
