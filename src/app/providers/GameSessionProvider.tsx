"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useRealtimeSession } from "../hooks/useRealtimeSession";
import { useTranscript } from "../contexts/TranscriptContext";
import { SessionStatus } from "../types";
import { defaultGameAgentSet } from "../agentConfigs/gameHost";
// import { createModerationGuardrail } from "../agentConfigs/guardrails";

interface GameSessionContextValue {
  sessionStatus: SessionStatus;
  isWebRTCReady: boolean;
  sendUserText: (text: string) => void;
  mute: (muted: boolean) => void;
  interrupt: () => void;
  pushToTalkStart: () => Promise<void>;
  pushToTalkStop: () => Promise<void>;
  isPTTUserSpeaking: boolean;
  resumeOutputAudio: () => void;
}

const GameSessionContext = createContext<GameSessionContextValue | undefined>(
  undefined
);

interface GameSessionProviderProps {
  children: ReactNode;
}

export function GameSessionProvider({ children }: GameSessionProviderProps) {
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");
  const { addTranscriptBreadcrumb } = useTranscript();
  const connectionAttemptedRef = useRef(false);
  const [isWebRTCReady, setIsWebRTCReady] = useState(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const {
    connect,
    disconnect,
    sendUserText,
    mute,
    interrupt,
    pushToTalkStart,
    pushToTalkStop,
    pauseMicHardware,
    resumeOutputAudio,
  } = useRealtimeSession({
    onConnectionChange: (status) => {
      console.log("[GameSession] Connection status changed to:", status);
      setSessionStatus(status);
      if (status === "CONNECTED") {
        console.log(
          "[GameSession] Session connected, waiting for WebRTC to be ready..."
        );
        // Give WebRTC a moment to fully establish the data channel
        setTimeout(() => {
          setIsWebRTCReady(true);
          console.log(
            "[GameSession] WebRTC data channel ready for game operations"
          );
        }, 2000);
      } else {
        setIsWebRTCReady(false);
        console.log("[GameSession] WebRTC not ready (session not connected)");
      }
    },
  });

  // Wrap PTT controls to expose speaking state in context
  const wrappedPushToTalkStart = async () => {
    if (sessionStatus !== "CONNECTED" || !isWebRTCReady) return;
    setIsPTTUserSpeaking(true);
    await pushToTalkStart();
  };

  const wrappedPushToTalkStop = async () => {
    if (sessionStatus !== "CONNECTED") return;
    setIsPTTUserSpeaking(false);
    await pushToTalkStop();
  };

  // Auto-connect to game host agent on mount
  useEffect(() => {
    const connectToGameHost = async () => {
      if (connectionAttemptedRef.current) return;
      connectionAttemptedRef.current = true;

      console.log("[GameSession] Starting connection to game host...");
      setSessionStatus("CONNECTING");

      try {
        // Fetch ephemeral key
        const fetchUrl = process.env.NEXT_PUBLIC_API_URL
          ? `http://${process.env.NEXT_PUBLIC_API_URL}/api/session/`
          : "/api/session/";

        console.log("[GameSession] Fetching ephemeral key from:", fetchUrl);
        const tokenResponse = await fetch(fetchUrl);
        const data = await tokenResponse.json();

        if (!data.client_secret?.value) {
          console.error(
            "[GameSession] No ephemeral key provided by the server"
          );
          setSessionStatus("DISCONNECTED");
          connectionAttemptedRef.current = false;
          return;
        }

        const ephemeralKey = data.client_secret.value;
        console.log(
          "[GameSession] Got ephemeral key, connecting to realtime session..."
        );

        // Create audio element for SDK
        const audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        audioElement.style.display = "none";
        document.body.appendChild(audioElement);
        audioElementRef.current = audioElement;

        console.log(
          "[GameSession] Connecting with agents:",
          defaultGameAgentSet.map((a) => a.name)
        );

        // Connect to game host agent
        await connect({
          getEphemeralKey: async () => ephemeralKey,
          initialAgents: defaultGameAgentSet,
          audioElement,
          extraContext: {
            addTranscriptBreadcrumb,
          },
        });

        console.log("[GameSession] Connected to game host agent successfully");
      } catch (error) {
        console.error("[GameSession] Failed to connect to game host:", error);
        setSessionStatus("DISCONNECTED");
        connectionAttemptedRef.current = false;
      }
    };

    connectToGameHost();

    // Cleanup on unmount
    return () => {
      console.log("[GameSession] Cleaning up connection...");
      disconnect();
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle backgrounding/foregrounding: stop mic and mute audio when hidden
  useEffect(() => {
    const handleHidden = () => {
      try {
        // Mute upstream and release microphone hardware to avoid iOS orange dot
        mute(true);
        pauseMicHardware();
      } catch (err) {
        console.warn(
          "[GameSessionProvider] Failed to pause on background:",
          err
        );
      }
      const el = audioElementRef.current;
      if (el) {
        try {
          el.muted = true;
          el.pause();
        } catch (_) {}
      }
    };

    const handleVisible = () => {
      // Do not auto-resume mic; PTT will restore it on user gesture
      const el = audioElementRef.current;
      if (el) {
        try {
          el.muted = false;
          el.play().catch(() => {});
        } catch (_) {}
      }
      try {
        // Best-effort: ensure SDK element resumes on iOS
        resumeOutputAudio();
      } catch (_) {}
      try {
        // Unmute any server-side output mute that may have been toggled
        mute(false);
      } catch (_) {}
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleHidden();
      else handleVisible();
    };

    window.addEventListener("pagehide", handleHidden);
    window.addEventListener("pageshow", handleVisible);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handleHidden);
      window.removeEventListener("pageshow", handleVisible);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mute, pauseMicHardware, resumeOutputAudio]);

  // Debug logging for state changes
  useEffect(() => {
    console.log("[GameSessionProvider] State update:", {
      sessionStatus,
      isWebRTCReady,
    });
  }, [sessionStatus, isWebRTCReady]);

  const contextValue: GameSessionContextValue = {
    sessionStatus,
    isWebRTCReady,
    sendUserText,
    mute,
    interrupt,
    pushToTalkStart: wrappedPushToTalkStart,
    pushToTalkStop: wrappedPushToTalkStop,
    isPTTUserSpeaking,
    resumeOutputAudio,
  };

  return (
    <GameSessionContext.Provider value={contextValue}>
      {children}
    </GameSessionContext.Provider>
  );
}

export function useGameSession() {
  const context = useContext(GameSessionContext);
  if (!context) {
    throw new Error("useGameSession must be used within a GameSessionProvider");
  }
  return context;
}
