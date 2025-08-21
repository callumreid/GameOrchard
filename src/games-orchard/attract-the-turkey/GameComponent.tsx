"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import BaseGame from "../BaseGame";
import { GameProps } from "../types";
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

function AttractTheTurkeyGame(props: Partial<GameControlProps>) {
  const {
    endGame,
    updateMessage,
    updateScore,
    startTimer,
    sendPlayerText: _sendPlayerText,
    gameState,
  } = props;
  const [_hostFinishedSpeaking, setHostFinishedSpeaking] = useState(false);
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
    gameType: "attract-the-turkey",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);

      // Display turkey emojis in console
      console.log("🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃");
      console.log("🦃🦃🦃 TURKEY GAME IS ON! 🦃🦃🦃");
      console.log("🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃🦃");

      updateMessage?.(
        "A bashful turkey lurks beyond the trees! Listen to the setup and prepare your charismatic gobbles!"
      );

      // Start timer after host finishes speaking (estimated 12 seconds for turkey scenario)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to gobble! You have 30 seconds to make those gobbles irresistibly thicc!"
        );
      }, 12000);
    },
    onGameFinish: (result: GameFinishResult) => {
      console.log(
        "🎮 AttractTheTurkey onGameFinish called with result:",
        result
      );

      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;

      let message: string;
      if (success) {
        message =
          result.message ||
          "The turkey prances out and nuzzles your knee! Gobble on, legend!";
      } else {
        message =
          result.message ||
          "The turkey wants nothing to do with you. Gobble off, loser.";
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
      "Welcome to Attract the Turkey! Thanksgiving is 3 days away and you need protein..."
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
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-amber-100 via-orange-200 to-yellow-300">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full mt-16">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
            🦃🍂 Attract the Turkey
          </h2>
          <div className="text-lg font-semibold text-gray-800 p-3 bg-gray-100 rounded-lg">
            Time: {gameState?.timeRemaining || 30}s
          </div>
        </div>
        {/* Speech Bubble - Centered and Prominent */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-4 min-h-[200px] flex flex-col justify-center">
          {/* Host/Narrator Speech Bubble */}
          {latestHost && (
            <div className="mb-4">
              <div className="flex justify-start">
                <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl rounded-bl-none p-4 max-w-md text-black">
                  <div className="text-sm text-amber-800 font-medium mb-1">
                    🎭 Game Host:
                  </div>
                  <div className="text-amber-900 text-lg">{latestHost}</div>
                </div>
              </div>
            </div>
          )}

          {/* User Speech Bubble */}
          {(latestUser || isPTTUserSpeaking) && (
            <div className="mb-2">
              <div className="flex justify-end">
                <div className="bg-orange-100 border-2 border-orange-300 rounded-2xl rounded-br-none p-4 max-w-md text-black">
                  <div className="text-sm text-orange-800 font-medium mb-1">
                    🧍 You (Turkey Temptress):
                  </div>
                  <div className="text-orange-900 text-lg">
                    {isPTTUserSpeaking
                      ? "🎤 Gobbling careless whispers..."
                      : latestUser.startsWith("Hello! I'm ready to play")
                      ? "Press mic to gobble at the turkey"
                      : latestUser}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No conversation yet */}
          {!latestHost && !latestUser && !isPTTUserSpeaking && (
            <div className="text-center text-gray-500 text-lg">
              The turkey hunt will appear here...
            </div>
          )}
        </div>
      </div>

      {/* Push-to-Talk Button - Web */}
      {sessionStatus === "CONNECTED" &&
        isWebRTCReady && (
          <div className="flex flex-col items-center mt-8">
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onMouseLeave={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
            >
              <div className="text-8xl sm:text-9xl">
                {isPTTUserSpeaking ? "🦃" : "🫦"}
              </div>
            </button>
            <div className="text-sm text-amber-800 mt-2 font-bold">
              Hold to Gobble
            </div>
          </div>
        )}


    </div>
  );
}

export default function AttractTheTurkeyGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Attract the Turkey"
      instructions="Thanksgiving is 3 days away! Squat in the leaves and gobble charismatically to lure a bashful wild turkey with your irresistible vocal charisma."
      duration={30}
      {...props}
    >
      <AttractTheTurkeyGame isPTTUserSpeaking={props.isPTTUserSpeaking} />
    </BaseGame>
  );
}
