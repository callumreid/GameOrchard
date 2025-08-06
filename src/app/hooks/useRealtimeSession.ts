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
import { useNativeAudioInput } from "./useNativeAudioInput";
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
  const nativeAudioInput = useNativeAudioInput();

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
      // Skip microphone permission check if native audio is available
      if (!nativeAudioInput.isAvailable) {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          console.error("Cannot connect: microphone permission denied");
          updateStatus("DISCONNECTED");
          return;
        }
      } else {
        console.log(
          "[RealtimeSession] Using native audio, skipping WebRTC microphone permission"
        );
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

            // For web (when native audio is not available), we need to set up the connection
            // to support audio but initially mute it to prevent automatic transcription
            if (!nativeAudioInput.isAvailable) {
              console.log(
                "[RealtimeSession] Setting up WebRTC with muted microphone initially - will unmute on PTT"
              );
              // We'll handle muting/unmuting via the session.mute() method instead of removing tracks
            } else {
              console.log(
                "[RealtimeSession] Disabling WebRTC microphone - using native audio"
              );
              // For native audio, we can safely disable WebRTC microphone
              pc.getTransceivers().forEach((transceiver) => {
                if (
                  transceiver.sender &&
                  transceiver.sender.track?.kind === "audio"
                ) {
                  transceiver.sender.replaceTrack(null);
                  transceiver.direction = "recvonly"; // Only receive audio, don't send
                }
              });
            }

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

      // For web users, initially mute the session to prevent automatic transcription
      if (!nativeAudioInput.isAvailable) {
        console.log("[RealtimeSession] Muting WebRTC session initially");
        sessionRef.current.mute(true);
      }

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

    // For web (when native audio is not available), unmute the session
    if (!nativeAudioInput.isAvailable) {
      console.log("[PTT] Unmuting WebRTC session for web");
      sessionRef.current.mute(false);
    }

    sessionRef.current.transport.sendEvent({
      type: "input_audio_buffer.clear",
    } as any);
  }, [nativeAudioInput.isAvailable]);

  const pushToTalkStop = useCallback(async () => {
    if (!sessionRef.current) return;

    // For web (when native audio is not available), mute the session again
    if (!nativeAudioInput.isAvailable) {
      console.log("[PTT] Muting WebRTC session for web");
      sessionRef.current.mute(true);
    }

    sessionRef.current.transport.sendEvent({
      type: "input_audio_buffer.commit",
    } as any);
    sessionRef.current.transport.sendEvent({ type: "response.create" } as any);
  }, [nativeAudioInput.isAvailable]);

  // Native audio push-to-talk methods
  const pushToTalkStartNative = useCallback(async () => {
    if (!sessionRef.current) return false;

    // Check if native audio is available
    if (nativeAudioInput.isAvailable) {
      // Clear the audio buffer first
      sessionRef.current.transport.sendEvent({
        type: "input_audio_buffer.clear",
      } as any);

      // Start native audio recording at 24kHz (OpenAI Realtime API expects 24kHz for PCM16)
      console.log(
        "[NativeAudio] Starting recording at 24kHz for OpenAI Realtime API"
      );
      const success = await nativeAudioInput.startRecording(
        24000,
        (audioData: ArrayBuffer) => {
          if (sessionRef.current) {
            // Convert ArrayBuffer to base64 string (required by OpenAI Realtime API)
            const uint8Array = new Uint8Array(audioData);

            // Debug: Check if audio data contains actual sound (not silence)
            const samples = new Int16Array(audioData);
            const maxAmplitude = Math.max(...Array.from(samples).map(Math.abs));
            const hasSound = maxAmplitude > 100; // Threshold for detecting sound

            console.log(
              `[NativeAudio] Chunk: ${samples.length} samples, max amplitude: ${maxAmplitude}, has sound: ${hasSound}`
            );

            const base64Audio = btoa(
              String.fromCharCode.apply(null, Array.from(uint8Array))
            );

            // Send base64-encoded PCM16 audio to OpenAI
            sessionRef.current.transport.sendEvent({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            } as any);

            console.log(
              `[NativeAudio] Sent ${base64Audio.length} chars of base64 audio to OpenAI`
            );
          }
        }
      );

      return success;
    } else {
      // Use WebRTC PTT for web
      console.log("push to start no native");
      await pushToTalkStart();
      return true;
    }
  }, [nativeAudioInput, pushToTalkStart]);

  const pushToTalkStopNative = useCallback(async () => {
    if (!sessionRef.current) return;

    // Check if native audio is available
    if (nativeAudioInput.isAvailable) {
      // Stop native audio recording
      await nativeAudioInput.stopRecording();

      // Commit the audio buffer and create response
      sessionRef.current.transport.sendEvent({
        type: "input_audio_buffer.commit",
      } as any);
      sessionRef.current.transport.sendEvent({
        type: "response.create",
      } as any);
    } else {
      // Use WebRTC PTT for web
      await pushToTalkStop();
    }
  }, [nativeAudioInput, pushToTalkStop]);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    pushToTalkStartNative,
    pushToTalkStopNative,
    isNativeAudioAvailable: nativeAudioInput.isAvailable,
    interrupt,
  } as const;
}
