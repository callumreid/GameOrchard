"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import BaseGame from "./BaseGame";
import { GameProps, GameDefinitionMeta } from "./types";
import {
  useGameAgent,
  GameScenario,
  GameFinishResult,
} from "@/app/hooks/useGameAgent";
import { useGameSession } from "@/app/providers/GameSessionProvider";
import { useTranscript } from "@/app/contexts/TranscriptContext";

interface GameControlProps {
  endGame: (success: boolean, message?: string, score?: number) => void;
  updateMessage: (message: string) => void;
  updateScore?: (score: number) => void;
  startTimer?: () => void;
  gameState?: any;
  playSound?: (soundId: string) => void;
  isPTTUserSpeaking?: boolean;
  userColor?: string;
}

function ConversationPane({
  hostLabel,
  userLabel,
  isPTTUserSpeaking,
  userActiveBubbleText,
  userHintBubbleText,
  userColor,
}: {
  hostLabel: string;
  userLabel: string;
  isPTTUserSpeaking: boolean;
  userActiveBubbleText?: string;
  userHintBubbleText?: string;
  userColor?: string;
}) {
  const { transcriptItems } = useTranscript();
  const hostScrollRef = useRef<HTMLDivElement | null>(null);

  const getLatestTranscripts = useCallback(() => {
    const hostItems = transcriptItems
      .filter(
        (item) =>
          item.role === "assistant" && item.title && item.title.trim() !== ""
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    const userItems = transcriptItems
      .filter(
        (item) =>
          item.role === "user" &&
          item.title &&
          item.title.trim() !== "" &&
          item.title.trim() !== "[inaudible]"
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    const latestUser = userItems[0]?.title?.startsWith(
      "Hello! I'm ready to play"
    )
      ? userHintBubbleText
      : userItems[0]?.title;
    const latestHost = hostItems[0]?.title || "";

    return { latestHost, latestUser };
  }, [transcriptItems, userHintBubbleText]);

  const { latestHost, latestUser } = getLatestTranscripts();

  useEffect(() => {
    const element = hostScrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [latestHost]);

  return (
    <div
      className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-2 min-h-[220px] flex flex-col justify-center"
      style={{
        backgroundColor: userColor ? `${userColor}20` : undefined,
        borderColor: userColor ? userColor : undefined,
      }}
    >
      {latestHost && (
        <div className="mb-4">
          <div className="flex justify-start gap-1">
            <div
              ref={hostScrollRef}
              className="bg-gray-100 border-2 border-gray-300 rounded-2xl rounded-bl-none p-4 max-w-lg text-black max-h-60 overflow-y-auto"
            >
              <div className="text-xs sm:text-sm text-gray-800 font-semibold">
                {hostLabel}:
              </div>
              <div className="text-gray-900 text-sm sm:text-base">
                {latestHost}
              </div>
            </div>
          </div>
        </div>
      )}

      {(latestUser || isPTTUserSpeaking) && (
        <div className="mb-2">
          <div className="flex justify-end gap-1">
            <div
              className="rounded-2xl rounded-br-none p-2 sm:p-4 max-w-lg text-black border-2"
              style={{
                backgroundColor: userColor ? `${userColor}20` : undefined,
                borderColor: userColor ? userColor : undefined,
              }}
            >
              <div className="text-xs sm:text-sm font-semibold">
                {userLabel}:
              </div>
              <div className="text-sm sm:text-base">
                {isPTTUserSpeaking
                  ? userActiveBubbleText || "🎤 Speaking..."
                  : latestUser}
              </div>
            </div>
          </div>
        </div>
      )}

      {!latestHost && !latestUser && !isPTTUserSpeaking && (
        <div className="text-center text-gray-500 text-lg">
          {userHintBubbleText || "Conversation will appear here..."}
        </div>
      )}
    </div>
  );
}

function UnifiedRuntime({
  definition,
  ...controls
}: { definition: GameDefinitionMeta } & Partial<GameControlProps>) {
  const {
    title,
    instructions,
    startDelayMs,
    startMessage,
    activeMessage,
    hostLabel,
    userLabel,
    talkButtonIdleEmoji,
    talkButtonActiveEmoji,
    talkButtonLabel,
    backgroundGradient,
    gameType,
    estimatedDuration,
    userActiveBubbleText,
    userHintBubbleText,
  } = definition;

  const {
    sessionStatus,
    isWebRTCReady,
    interrupt,
    pushToTalkStart,
    pushToTalkStop,
  } = useGameSession();
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
  const pttStartTimeRef = useRef<number>(0);

  const { startGame } = useGameAgent({
    gameType,
    onGameStart: (_scenario: GameScenario) => {
      controls.updateMessage?.(startMessage);
      setTimeout(() => {
        controls.startTimer?.();
        controls.updateMessage?.(activeMessage);
      }, Math.max(0, startDelayMs));
    },
    onGameFinish: (result: GameFinishResult) => {
      const success = result.success === true;
      const score = result.score || 0;
      const message = result.message || "Game completed!";
      controls.updateScore?.(score);
      controls.endGame?.(success, message, score);
    },
  });

  useEffect(() => {
    controls.updateMessage?.(instructions);
    const t = setTimeout(() => startGame(), 800);
    return () => clearTimeout(t);
  }, [startGame]);

  const handleTalkButtonDown = useCallback(async () => {
    if (sessionStatus !== "CONNECTED" || !isWebRTCReady) return;
    if (isPTTUserSpeaking) return;
    interrupt();
    pttStartTimeRef.current = Date.now();
    setIsPTTUserSpeaking(true);
    await pushToTalkStart();
  }, [
    sessionStatus,
    isWebRTCReady,
    isPTTUserSpeaking,
    interrupt,
    pushToTalkStart,
  ]);

  const handleTalkButtonUp = useCallback(async () => {
    if (sessionStatus !== "CONNECTED" || !isPTTUserSpeaking) return;
    setIsPTTUserSpeaking(false);
    await pushToTalkStop();
  }, [sessionStatus, isPTTUserSpeaking, pushToTalkStop]);

  return (
    <div
      className={`h-full flex flex-col justify-center items-center bg-gradient-to-br ${backgroundGradient}`}
    >
      <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 max-w-5xl w-full">
        <div className="flex justify-between items-center mb-2 sm:mb-4">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
            {title}
          </h2>
          <div className="text-xs sm:text-lg font-semibold text-gray-800 p-3 bg-gray-100 rounded-lg">
            Time: {controls.gameState?.timeRemaining || estimatedDuration}s
          </div>
        </div>

        <ConversationPane
          hostLabel={hostLabel}
          userLabel={userLabel}
          isPTTUserSpeaking={isPTTUserSpeaking}
          userActiveBubbleText={userActiveBubbleText}
          userHintBubbleText={userHintBubbleText}
          userColor={controls.userColor}
        />
        {sessionStatus === "CONNECTED" && isWebRTCReady && (
          <button
            onMouseDown={handleTalkButtonDown}
            onMouseUp={handleTalkButtonUp}
            onMouseLeave={handleTalkButtonUp}
            onTouchStart={handleTalkButtonDown}
            onTouchEnd={handleTalkButtonUp}
            className="flex flex-col items-center justify-center border-2 bg-gray-100 border-gray-200 rounded-xl py-0.5 sm:py-2 px-4 sm:px-8 mx-auto hover:bg-gray-200"
          >
            <div className="text-4xl md:text-5xl sm:md:text-6xl">
              {isPTTUserSpeaking ? talkButtonActiveEmoji : talkButtonIdleEmoji}
            </div>
            <div className="text-sm text-gray-600 font-medium">
              {talkButtonLabel}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export default function UnifiedGame({
  definition,
  ...props
}: GameProps & { definition: GameDefinitionMeta }) {
  return (
    <BaseGame
      title={definition.title}
      instructions={definition.instructions}
      duration={definition.estimatedDuration}
      {...props}
    >
      <UnifiedRuntime definition={definition} />
    </BaseGame>
  );
}
