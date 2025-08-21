"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import BaseGame from "../BaseGame";
import { GameProps } from "../types";
import SpeechBubbles from "../components/SpeechBubbles";
import GameScreen from "../components/GameScreen";
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
}

function PitchStartupGame(props: Partial<GameControlProps>) {
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
  const [currentTranscriptionText, setCurrentTranscriptionText] = useState("");
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

  // Monitor transcription items - only capture user speech during PTT
  useEffect(() => {
    if (!isPTTUserSpeaking) {
      return;
    }

    // Find items that appeared since PTT started AND are marked as user role
    const userItemsSincePTT = transcriptItems
      .filter(
        (item) =>
          item.title &&
          item.title.trim() !== "" &&
          item.role === "user" &&
          item.createdAtMs > pttStartTimeRef.current
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    if (userItemsSincePTT.length > 0) {
      const latestUserText = userItemsSincePTT[0].title;
      console.log("User speech during PTT:", latestUserText);
      setCurrentTranscriptionText(latestUserText || "");
    }
  }, [transcriptItems, isPTTUserSpeaking]);

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
        (item) => item.role === "user" && item.title && item.title.trim() !== ""
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
    gameType: "pitch-startup",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄");
      console.log("🦄🦄🦄 PITCH STARTUP GAME IS ON! 🦄🦄🦄");
      console.log("🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄");
      updateMessage?.(
        "Welcome to the mahogany boardroom! VCs are tapping their Apple Pencils..."
      );

      // Start timer after VCs finish setup (estimated 12 seconds)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to pitch! You have 30 seconds to blow their minds with your disruptive vision!"
        );
      }, 12000);
    },
    onGameFinish: (result: GameFinishResult) => {
      console.log("🎮 PitchStartup onGameFinish called with result:", result);

      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;

      let message: string;
      if (success) {
        message =
          result.message ||
          "The VCs' Patagonia vests literally burst at the seams! Venture capital thrown like confetti! You're the next unicorn!";
      } else {
        message =
          result.message ||
          "The VCs yawn in unison. 'That's just... profitable.' Security escorts you out past the kombucha fountain.";
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
      "Welcome to Pitch Startup! You're entering the mahogany boardroom of Silicon Valley legends..."
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
    setCurrentTranscriptionText(""); // Clear previous text
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
    console.log("PTT stopped. Final text:", currentTranscriptionText);
  }, [
    sessionStatus,
    isPTTUserSpeaking,
    pushToTalkStop,
    currentTranscriptionText,
  ]);

  return (
    <GameScreen
      backgroundClassName="bg-gradient-to-br from-gray-800 via-blue-900 to-gray-900"
      cardClassName="bg-gradient-to-br from-gray-50 to-blue-50 border-4 border-blue-600 shadow-2xl"
      headerCenter={
        <h2 className="text-2xl font-bold mb-4 text-center text-slate-900">
          🏢💰 Pitch Startup
        </h2>
      }
      headerRight={
        <div className="text-lg font-semibold text-slate-900 p-3 bg-slate-200 rounded-lg border-2 border-slate-400">
          Time: {gameState?.timeRemaining || 30}s
        </div>
      }
      speechAreaClassName="bg-gradient-to-br from-slate-100 to-gray-50 border-4 border-slate-400 rounded-lg p-6 min-h-[200px] flex flex-col justify-center"
      ptt={{
        show:
          hostFinishedSpeaking &&
          sessionStatus === "CONNECTED" &&
          isWebRTCReady,
        containerClassName:
          "bg-gradient-to-br from-slate-100 to-gray-100 border-4 border-slate-400",
        label: "Hold to Pitch",
        isActive: isPTTUserSpeaking,
        buttonClassName: isPTTUserSpeaking
          ? "w-16 h-16 rounded-full border-4 border-slate-600 transition-all duration-150 bg-red-500 scale-110 shadow-lg"
          : "w-16 h-16 rounded-full border-4 border-slate-600 transition-all duration-150 bg-slate-300 hover:bg-slate-400",
        idleIcon: "💡",
        activeIcon: "🔴",
        onPressStart: handleTalkButtonDown,
        onPressEnd: handleTalkButtonUp,
      }}
      footer={
        <div className="flex justify-center space-x-3 text-2xl opacity-40">
          <span>🏢</span>
          <span>💰</span>
          <span>🦄</span>
          <span>📈</span>
          <span>☕</span>
          <span>💡</span>
        </div>
      }
    >
      <SpeechBubbles
        latestHost={latestHost}
        latestUser={latestUser}
        isUserSpeaking={isPTTUserSpeaking}
        speakingText={
          currentTranscriptionText || "🎤 Disrupting the paradigm..."
        }
        userReadyHint="Press mic to pitch your unicorn startup"
        hostConfig={{
          label: <span>🤵 Venture Capitalists:</span>,
          bubbleClassName:
            "bg-gradient-to-br from-slate-200 to-gray-200 border-3 border-slate-500 text-black shadow-lg",
          labelClassName: "text-sm text-slate-800 font-medium mb-1",
          textClassName: "text-slate-900 text-lg font-bold",
        }}
        userConfig={{
          label: <span>💡 You (Visionary):</span>,
          bubbleClassName:
            "bg-gradient-to-br from-blue-200 to-indigo-200 border-3 border-blue-500 text-black shadow-lg",
          labelClassName: "text-sm text-blue-800 font-medium mb-1",
          textClassName: "text-blue-900 text-lg font-semibold",
        }}
        emptyStateText="The mahogany boardroom awaits your disruptive vision..."
        emptyStateClassName="text-center text-slate-700 text-lg font-medium"
      />
    </GameScreen>
  );
}

export default function PitchStartupGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Pitch Startup"
      instructions="Mahogany boardroom. VCs tapping Apple Pencils against $9 lattes. You have 30 seconds to pitch a startup so ludicrously visionary that their Patagonia vests burst at the seams!"
      duration={30}
      {...props}
    >
      <PitchStartupGame />
    </BaseGame>
  );
}
