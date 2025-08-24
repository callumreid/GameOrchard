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
}

function ConversationPane({
  hostLabel,
  userLabel,
  isPTTUserSpeaking,
  userActiveBubbleText,
  userHintBubbleText,
}: {
  hostLabel: string;
  userLabel: string;
  isPTTUserSpeaking: boolean;
  userActiveBubbleText?: string;
  userHintBubbleText?: string;
}) {
  const { transcriptItems } = useTranscript();

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

  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-4 min-h-[220px] flex flex-col justify-center">
      {latestHost && (
        <div className="mb-4">
          <div className="flex justify-start">
            <div className="bg-blue-100 border-2 border-blue-300 rounded-2xl rounded-bl-none p-4 max-w-lg text-black">
              <div className="text-sm text-blue-800 font-medium mb-1">
                {hostLabel}:
              </div>
              <div className="text-blue-900 text-lg">{latestHost}</div>
            </div>
          </div>
        </div>
      )}

      {(latestUser || isPTTUserSpeaking) && (
        <div className="mb-2">
          <div className="flex justify-end">
            <div className="bg-green-100 border-2 border-green-300 rounded-2xl rounded-br-none p-4 max-w-lg text-black">
              <div className="text-sm text-green-800 font-medium mb-1">
                {userLabel}:
              </div>
              <div className="text-green-900 text-lg">
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
      className={`min-h-screen flex flex-col justify-center items-center p-4 pb-24 bg-gradient-to-br ${backgroundGradient}`}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl w-full mt-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-center text-gray-800">
            {title}
          </h2>
          <div className="text-lg font-semibold text-gray-800 p-3 bg-gray-100 rounded-lg">
            Time: {controls.gameState?.timeRemaining || estimatedDuration}s
          </div>
        </div>

        <ConversationPane
          hostLabel={hostLabel}
          userLabel={userLabel}
          isPTTUserSpeaking={isPTTUserSpeaking}
          userActiveBubbleText={userActiveBubbleText}
          userHintBubbleText={userHintBubbleText}
        />
      </div>

      {sessionStatus === "CONNECTED" && isWebRTCReady && (
        <div className="flex flex-col items-center mt-8 md:mt-8 md:relative fixed bottom-4 left-1/2 transform -translate-x-1/2 md:transform-none md:left-auto md:bottom-auto z-50">
          <button
            onMouseDown={handleTalkButtonDown}
            onMouseUp={handleTalkButtonUp}
            onMouseLeave={handleTalkButtonUp}
            onTouchStart={handleTalkButtonDown}
            onTouchEnd={handleTalkButtonUp}
          >
            <div className="text-6xl md:text-8xl sm:md:text-9xl">
              {isPTTUserSpeaking ? talkButtonActiveEmoji : talkButtonIdleEmoji}
            </div>
          </button>
          <div className="text-sm text-gray-600 mt-2 font-medium">
            {talkButtonLabel}
          </div>
        </div>
      )}
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
