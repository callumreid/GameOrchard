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

function ConvinceTheAliensGame(props: Partial<GameControlProps>) {
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
    gameType: "convince-the-aliens",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽");
      console.log("👽👽👽 CONVINCE THE ALIENS GAME IS ON! 👽👽👽");
      console.log("👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽");
      updateMessage?.(
        "The alien overlords have arrived! Listen to their demands and convince them not to destroy Earth!"
      );

      // Start timer after host finishes speaking (estimated 8 seconds for host to speak)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Quick! You have 30 seconds to save humanity with your words!"
        );
      }, 8000);
    },
    onGameFinish: (result: GameFinishResult) => {
      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;
      const message = result.message || "The aliens have made their decision!";

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
      "Welcome to Convince The Aliens! Alien ships are approaching Earth..."
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
      backgroundClassName="bg-gradient-to-br from-purple-900 via-indigo-900 to-black"
      cardClassName="bg-gray-900 border-4 border-green-400 shadow-2xl"
      headerLeft={
        <div className="text-lg font-semibold text-green-400 p-3 bg-black rounded-lg border border-green-400">
          Human Score: {gameState?.score || 0}
        </div>
      }
      headerCenter={
        <h2 className="text-2xl font-bold mb-4 text-center text-green-400">
          👽 Convince The Aliens 🛸
        </h2>
      }
      speechAreaClassName="bg-black border-2 border-green-400 rounded-lg p-6 min-h-[200px] flex flex-col justify-center"
      ptt={{
        show:
          hostFinishedSpeaking &&
          sessionStatus === "CONNECTED" &&
          isWebRTCReady,
        containerClassName: "bg-green-900 border-2 border-green-400",
        label: "Hold to Save Earth",
        isActive: isPTTUserSpeaking,
        buttonClassName: isPTTUserSpeaking
          ? "w-16 h-16 rounded-full border-4 border-green-400 transition-all duration-150 bg-red-500 scale-110 shadow-lg"
          : "w-16 h-16 rounded-full border-4 border-green-400 transition-all duration-150 bg-green-700 hover:bg-green-600",
        idleIcon: "🎤",
        activeIcon: "🔴",
        onPressStart: handleTalkButtonDown,
        onPressEnd: handleTalkButtonUp,
      }}
      footer={
        <div className="flex justify-center space-x-3 text-lg opacity-30">
          <span>🛸</span>
          <span>👽</span>
          <span>🌍</span>
          <span>💫</span>
          <span>🚀</span>
        </div>
      }
    >
      <SpeechBubbles
        latestHost={latestHost}
        latestUser={latestUser}
        isUserSpeaking={isPTTUserSpeaking}
        speakingText="🎤 Pleading for humanity..."
        userReadyHint="Press mic to plead for humanity"
        hostConfig={{
          label: <span>👽 Alien Overlord:</span>,
          bubbleClassName:
            "bg-purple-900 border-2 border-purple-400 text-white",
          labelClassName: "text-sm text-purple-300 font-medium mb-1",
          textClassName: "text-purple-100 text-lg",
        }}
        userConfig={{
          label: <span>🌍 Human Ambassador:</span>,
          bubbleClassName: "bg-blue-900 border-2 border-blue-400 text-white",
          labelClassName: "text-sm text-blue-300 font-medium mb-1",
          textClassName: "text-blue-100 text-lg",
        }}
        emptyStateText="Alien-Human diplomacy will appear here..."
        emptyStateClassName="text-center text-green-400 text-lg"
      />
    </GameScreen>
  );
}

export default function ConvinceTheAliensGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Convince The Aliens"
      instructions="Alien invaders have arrived! Convince them not to destroy Earth and humanity!"
      duration={30}
      {...props}
    >
      <ConvinceTheAliensGame isPTTUserSpeaking={props.isPTTUserSpeaking} />
    </BaseGame>
  );
}
