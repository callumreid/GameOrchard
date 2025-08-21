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

function PwnTheBullyGame(props: Partial<GameControlProps>) {
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
    gameType: "pwn-the-bully",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪");
      console.log("💪💪💪 PWN THE BULLY GAME IS ON! 💪💪💪");
      console.log("💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪💪");
      updateMessage?.(
        "A mean bully approaches! Listen to their insult and prepare your comeback!"
      );

      // Start timer after host finishes speaking (estimated 10 seconds for bully to speak)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to deliver your comeback! You have 30 seconds to totally pwn this bully!"
        );
      }, 10000);
    },
    onGameFinish: (result: GameFinishResult) => {
      console.log("🎮 PwnTheBully onGameFinish called with result:", result);

      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;

      let message: string;
      if (success) {
        message =
          result.message ||
          "BOOM! You totally pwned that bully! You're the one with power now!";
      } else {
        message =
          result.message ||
          "Weak comeback, buttered up slug chump! The bully owns you now!";
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
    updateMessage?.("Welcome to Pwn The Bully! A mean bully is approaching...");

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
      backgroundClassName="bg-gradient-to-br from-red-200 via-orange-200 to-yellow-200"
      cardClassName="bg-white shadow-lg"
      headerCenter={
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          💪😤 Pwn the Bully
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
        containerClassName: "bg-orange-50 border-2 border-orange-200",
        label: "Hold to Clap Back",
        isActive: isPTTUserSpeaking,
        buttonClassName: isPTTUserSpeaking
          ? "w-16 h-16 rounded-full border-4 border-orange-400 transition-all duration-150 bg-red-500 scale-110 shadow-lg"
          : "w-16 h-16 rounded-full border-4 border-orange-400 transition-all duration-150 bg-orange-200 hover:bg-orange-300",
        idleIcon: "💪",
        activeIcon: "🔴",
        onPressStart: handleTalkButtonDown,
        onPressEnd: handleTalkButtonUp,
      }}
      footer={
        <div className="flex justify-center space-x-3 text-lg opacity-30">
          <span>😤</span>
          <span>💪</span>
          <span>🔥</span>
          <span>💥</span>
        </div>
      }
    >
      <SpeechBubbles
        latestHost={latestHost}
        latestUser={latestUser}
        isUserSpeaking={isPTTUserSpeaking}
        speakingText="🎤 Crafting your comeback..."
        userReadyHint="Press mic to deliver your comeback"
        hostConfig={{
          label: <span>😈 Bully:</span>,
          bubbleClassName: "bg-red-100 border-2 border-red-300 text-black",
          labelClassName: "text-sm text-red-800 font-medium mb-1",
          textClassName: "text-red-900 text-lg font-bold",
        }}
        userConfig={{
          label: <span>💪 You:</span>,
          bubbleClassName: "bg-blue-100 border-2 border-blue-300 text-black",
          labelClassName: "text-sm text-blue-800 font-medium mb-1",
          textClassName: "text-blue-900 text-lg",
        }}
        emptyStateText="The confrontation will appear here..."
      />
    </GameScreen>
  );
}

export default function PwnTheBullyGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Pwn the Bully"
      instructions="A mean bully calls you a 'buttered up slug chump' - deliver the perfect comeback to totally pwn them!"
      duration={30}
      {...props}
    >
      <PwnTheBullyGame isPTTUserSpeaking={props.isPTTUserSpeaking} />
    </BaseGame>
  );
}
