"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import BaseGame from "../BaseGame";
import { GameProps } from "../types";
import GameScreen from "../components/GameScreen";
import SpeechBubbles from "../components/SpeechBubbles";
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
  sendPlayerText?: (text: string) => void;
  updateScore?: (score: number) => void;
  startTimer?: () => void;
  gameState?: any;
  playSound?: (soundId: string) => void;
  isPTTUserSpeaking?: boolean;
}

function EvaluateYourselfGame(props: Partial<GameControlProps>) {
  const {
    endGame,
    updateMessage,
    updateScore,
    startTimer,
    sendPlayerText: _sendPlayerText,
    gameState,
  } = props;
  const [hostFinishedSpeaking, setHostFinishedSpeaking] = useState(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
  const pttStartTimeRef = useRef<number>(0);

  // Push-to-talk functionality
  const {
    sessionStatus,
    isWebRTCReady,
    interrupt,
    pushToTalkStart,
    pushToTalkStop,
  } = useGameSession();

  // Real-time transcription display
  const { transcriptItems } = useTranscript();

  // Get latest host and user messages for speech bubble
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

    return {
      latestHost: hostItems[0]?.title || "",
      latestUser: userItems[0]?.title || "",
    };
  }, [transcriptItems]);

  const { latestHost, latestUser } = getLatestTranscripts();

  const {
    startGame,
    sendPlayerText: _sendAgentText,
    isGameActive: _isGameActive,
  } = useGameAgent({
    gameType: "evaluate-yourself",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊");
      console.log("📊📊📊 EVALUATE YOURSELF GAME IS ON! 📊📊📊");
      console.log("📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊");
      updateMessage?.(
        "Your manager is ready for your quarterly self-evaluation. Listen carefully to their instructions!"
      );

      // Start timer after host finishes speaking (estimated 8 seconds for host to speak)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to defend your performance! Choose your rating and explain yourself in 30 seconds!"
        );
      }, 8000);
    },
    onGameFinish: (result: GameFinishResult) => {
      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;
      const message = result.message || "Your performance review is complete!";

      console.log("🎮 Processed values:", { success, score, message });

      updateScore?.(score);

      // Let BaseGame handle the banner - just end the game
      console.log("🎮 Calling endGame with:", { success, message, score });
      endGame?.(success, message, score);
    },
  });

  // Start the game when component mounts (user has already clicked START GAME)
  useEffect(() => {
    updateMessage?.(
      "Welcome to your quarterly performance review! Your manager has been waiting..."
    );

    // Start the game after a brief delay
    const timer = setTimeout(() => {
      startGame();
    }, 1000);

    return () => clearTimeout(timer);
  }, [startGame]);

  // Push-to-talk handlers
  const handleTalkButtonDown = useCallback(async () => {
    if (sessionStatus !== "CONNECTED" || !isWebRTCReady) return;
    if (isPTTUserSpeaking) return;
    interrupt();
    pttStartTimeRef.current = Date.now(); // Mark when PTT started
    setIsPTTUserSpeaking(true);
    await pushToTalkStart();
    console.log("PTT started at:", pttStartTimeRef.current);
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
    <GameScreen
      backgroundClassName="bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800"
      cardClassName="bg-white border-4 border-gray-400 shadow-2xl"
      headerCenter={
        <h2 className="text-2xl font-bold text-center text-gray-800">
          💼 Quarterly Self-Evaluation 📊
        </h2>
      }
      headerRight={
        <div className="text-lg font-semibold text-gray-800 p-3 bg-gray-100 rounded-lg border border-gray-300">
          Time: {gameState?.timeRemaining || 30}s
        </div>
      }
      speechAreaClassName="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 min-h-[200px] flex flex-col justify-center"
      ptt={{
        show:
          hostFinishedSpeaking &&
          sessionStatus === "CONNECTED" &&
          isWebRTCReady,
        containerClassName: "bg-blue-100 border-2 border-blue-300",
        label: "Hold to Self-Evaluate",
        isActive: isPTTUserSpeaking,
        buttonClassName: isPTTUserSpeaking
          ? "w-16 h-16 rounded-full border-4 border-blue-400 transition-all duration-150 bg-red-500 scale-110 shadow-lg"
          : "w-16 h-16 rounded-full border-4 border-blue-400 transition-all duration-150 bg-blue-200 hover:bg-blue-300",
        idleIcon: "🎤",
        activeIcon: "🔴",
        onPressStart: handleTalkButtonDown,
        onPressEnd: handleTalkButtonUp,
      }}
      footer={
        <div className="flex justify-center space-x-3 text-lg opacity-30">
          <span>💼</span>
          <span>📊</span>
          <span>💰</span>
          <span>📋</span>
          <span>⏰</span>
        </div>
      }
    >
      <SpeechBubbles
        latestHost={latestHost}
        latestUser={latestUser}
        isUserSpeaking={isPTTUserSpeaking}
        speakingText="🎤 Self-evaluating..."
        userReadyHint="Press mic to evaluate yourself"
        hostConfig={{
          label: <span>👔 Manager:</span>,
          bubbleClassName: "bg-blue-100 border-2 border-blue-300 text-black",
          labelClassName: "text-sm text-blue-800 font-medium mb-1",
          textClassName: "text-blue-900 text-lg",
        }}
        userConfig={{
          label: <span>👤 Employee (You):</span>,
          bubbleClassName: "bg-green-100 border-2 border-green-300 text-black",
          labelClassName: "text-sm text-green-800 font-medium mb-1",
          textClassName: "text-green-900 text-lg",
        }}
        emptyStateText="Performance review conversation will appear here..."
      />
    </GameScreen>
  );
}

export default function EvaluateYourselfGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Evaluate Yourself"
      instructions="Time for your quarterly self-evaluation! Choose your performance rating and defend it!"
      duration={30}
      {...props}
    >
      <EvaluateYourselfGame />
    </BaseGame>
  );
}
