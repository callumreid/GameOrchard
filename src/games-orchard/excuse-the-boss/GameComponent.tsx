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
  isPTTUserSpeaking?: boolean;
}

function ExcuseTheBossGame(props: Partial<GameControlProps>) {
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
    gameType: "excuse-the-boss",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞");
      console.log("📞📞📞 EXCUSE THE BOSS GAME IS ON! 📞📞📞");
      console.log("📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞📞");
      updateMessage?.(
        "RING RING! Your boss is calling! You're half-dressed with cereal milk on your chin..."
      );

      // Start timer after boss finishes demanding explanation (estimated 10 seconds)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to spin your excuse! You have 30 seconds to dazzle them with your creativity!"
        );
      }, 10000);
    },
    onGameFinish: (result: GameFinishResult) => {
      console.log("🎮 ExcuseTheBoss onGameFinish called with result:", result);

      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;

      let message: string;
      if (success) {
        message =
          result.message ||
          "Boss sighs: 'Wow... take the day, champ.' HR is already planning the folklore podcast!";
      } else {
        message =
          result.message ||
          "Boss laughs, then tells IT to revoke your badge. 'YER CANNED, JOHNNY!'";
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
      "Welcome to Excuse for the Boss! Your phone is ringing... oh no, it's the boss!"
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
      backgroundClassName="bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-300"
      cardClassName="bg-white shadow-lg"
      headerCenter={
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          📞💼 Excuse for the Boss
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
        containerClassName: "bg-blue-50 border-2 border-blue-200",
        label: "Hold to Excuse",
        isActive: isPTTUserSpeaking,
        buttonClassName: isPTTUserSpeaking
          ? "w-16 h-16 rounded-full border-4 border-blue-400 transition-all duration-150 bg-red-500 scale-110 shadow-lg"
          : "w-16 h-16 rounded-full border-4 border-blue-400 transition-all duration-150 bg-blue-200 hover:bg-blue-300",
        idleIcon: "📞",
        activeIcon: "🔴",
        onPressStart: handleTalkButtonDown,
        onPressEnd: handleTalkButtonUp,
      }}
      footer={
        <div className="flex justify-center space-x-3 text-lg opacity-30">
          <span>📞</span>
          <span>💼</span>
          <span>🥛</span>
          <span>😰</span>
        </div>
      }
    >
      <SpeechBubbles
        latestHost={latestHost}
        latestUser={latestUser}
        isUserSpeaking={isPTTUserSpeaking}
        speakingText="🎤 Spinning your excuse..."
        userReadyHint="Press mic to give your legendary excuse"
        hostConfig={{
          label: <span>👔 Your Boss:</span>,
          bubbleClassName: "bg-red-100 border-2 border-red-300 text-black",
          labelClassName: "text-sm text-red-800 font-medium mb-1",
          textClassName: "text-red-900 text-lg font-bold",
        }}
        userConfig={{
          label: <span>🥛 You (Half-dressed):</span>,
          bubbleClassName: "bg-blue-100 border-2 border-blue-300 text-black",
          labelClassName: "text-sm text-blue-800 font-medium mb-1",
          textClassName: "text-blue-900 text-lg",
        }}
        emptyStateText="The dreaded boss call will appear here..."
      />
    </GameScreen>
  );
}

export default function ExcuseTheBossGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Excuse for the Boss"
      instructions="RING RING! Your boss calls while you're half-dressed with cereal milk on your chin. Spin an excuse so dazzling that HR starts a folklore podcast!"
      duration={30}
      {...props}
    >
      <ExcuseTheBossGame isPTTUserSpeaking={props.isPTTUserSpeaking} />
    </BaseGame>
  );
}
