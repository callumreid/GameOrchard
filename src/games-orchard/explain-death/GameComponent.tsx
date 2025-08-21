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

function ExplainDeathGame(props: Partial<GameControlProps>) {
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
    gameType: "explain-death",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️");
      console.log("⚰️⚰️⚰️ EXPLAIN DEATH GAME IS ON! ⚰️⚰️⚰️");
      console.log("⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️⚰️");
      updateMessage?.(
        "Your daughter is asking about death. Listen to her question and prepare your explanation!"
      );

      // Start timer after daughter finishes asking (estimated 10 seconds for question)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to explain! You have 30 seconds. Remember: nihilistic or bizarrist approaches win. Avoid heaven/afterlife!"
        );
      }, 10000);
    },
    onGameFinish: (result: GameFinishResult) => {
      console.log("🎮 ExplainDeath onGameFinish called with result:", result);

      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;

      let message: string;
      if (success) {
        message =
          result.message ||
          "Your daughter says 'oh.... okay....' then starts crying. Dark but honest truth delivered.";
      } else {
        message =
          result.message ||
          "Your daughter says 'oh.... okay....' then starts crying. Too conventional or religious.";
      }

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
      "Welcome to Explain Death. Your daughter has an innocent but difficult question..."
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
      backgroundClassName="bg-gradient-to-br from-gray-200 via-slate-300 to-gray-400"
      cardClassName="bg-white shadow-lg"
      headerCenter={
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          💭⚰️ Explain Death
        </h2>
      }
      headerRight={
        <div className="text-lg font-semibold text-gray-800 p-3 bg-gray-100 rounded-lg">
          Time: {gameState?.timeRemaining || 30}s
        </div>
      }
      speechAreaClassName="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 min-h-[200px] flex flex-col justify-center"
      ptt={{
        show:
          hostFinishedSpeaking &&
          sessionStatus === "CONNECTED" &&
          isWebRTCReady,
        containerClassName: "bg-gray-50 border-2 border-gray-200",
        label: "Hold to Explain",
        isActive: isPTTUserSpeaking,
        buttonClassName: isPTTUserSpeaking
          ? "w-16 h-16 rounded-full border-4 border-gray-400 transition-all duration-150 bg-red-500 scale-110 shadow-lg"
          : "w-16 h-16 rounded-full border-4 border-gray-400 transition-all duration-150 bg-gray-200 hover:bg-gray-300",
        idleIcon: "💭",
        activeIcon: "🔴",
        onPressStart: handleTalkButtonDown,
        onPressEnd: handleTalkButtonUp,
      }}
      footer={
        <div className="flex justify-center space-x-3 text-lg opacity-30">
          <span>👧</span>
          <span>💭</span>
          <span>⚰️</span>
          <span>🖤</span>
        </div>
      }
    >
      <SpeechBubbles
        latestHost={latestHost}
        latestUser={latestUser}
        isUserSpeaking={isPTTUserSpeaking}
        speakingText="🎤 Explaining death..."
        userReadyHint="Press mic to explain death to your daughter"
        hostConfig={{
          label: <span>👧 Your Daughter:</span>,
          bubbleClassName: "bg-pink-100 border-2 border-pink-300 text-black",
          labelClassName: "text-sm text-pink-800 font-medium mb-1",
          textClassName: "text-pink-900 text-lg",
        }}
        userConfig={{
          label: <span>👨‍👩 You (Parent):</span>,
          bubbleClassName: "bg-gray-100 border-2 border-gray-300 text-black",
          labelClassName: "text-sm text-gray-800 font-medium mb-1",
          textClassName: "text-gray-900 text-lg",
        }}
        emptyStateText="A serious parent-child conversation will appear here..."
      />
    </GameScreen>
  );
}

export default function ExplainDeathGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Explain Death"
      instructions="Your daughter asks 'what is death?' after her friend's grandma died. Explain it honestly. "
      duration={30}
      {...props}
    >
      <ExplainDeathGame isPTTUserSpeaking={props.isPTTUserSpeaking} />
    </BaseGame>
  );
}
