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
      sessionRef.current.on(
        "agent_tool_start",
        historyHandlers.handleAgentToolStart
      );
      sessionRef.current.on(
        "agent_tool_end",
        historyHandlers.handleAgentToolEnd
      );
      sessionRef.current.on(
        "history_updated",
        historyHandlers.handleHistoryUpdated
      );
      sessionRef.current.on(
        "history_added",
        historyHandlers.handleHistoryAdded
      );
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
        model: "gpt-4o-realtime-preview-2025-06-03",
        config: {
          inputAudioFormat: audioFormat,
          outputAudioFormat: audioFormat,
          inputAudioTranscription: {
            model: "gpt-4o-mini-transcribe",
          },
          turnDetection: undefined,
        },
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
