"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import BaseGame from "../BaseGame";
import { GameProps } from "../types";
import {
  useGameAgent,
  GameScenario,
  GameFinishResult,
} from "../../src/app/hooks/useGameAgent";
import { useGameSession } from "../../src/app/providers/GameSessionProvider";
import { useTranscript } from "../../src/app/contexts/TranscriptContext";

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
    isPTTUserSpeaking: nativeIsPTTUserSpeaking,
  } = props;
  const [hostFinishedSpeaking, setHostFinishedSpeaking] = useState(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
  const pttStartTimeRef = useRef<number>(0);

  // Push-to-talk functionality
  const {
    sessionStatus,
    isWebRTCReady,
    interrupt,
    pushToTalkStartNative,
    pushToTalkStopNative,
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
    await pushToTalkStartNative();
    console.log("PTT started at:", pttStartTimeRef.current);
  }, [
    sessionStatus,
    isWebRTCReady,
    isPTTUserSpeaking,
    interrupt,
    pushToTalkStartNative,
  ]);

  const handleTalkButtonUp = useCallback(async () => {
    if (sessionStatus !== "CONNECTED" || !isPTTUserSpeaking) return;

    setIsPTTUserSpeaking(false);
    await pushToTalkStopNative();
  }, [sessionStatus, isPTTUserSpeaking, pushToTalkStopNative]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <div className="bg-gray-900 border-4 border-green-400 rounded-lg shadow-2xl p-6 max-w-4xl w-full mt-16">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold text-green-400 p-3 bg-black rounded-lg border border-green-400">
            Human Score: {gameState?.score || 0}
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-green-400">
            👽 Convince The Aliens 🛸
          </h2>
        </div>

        {/* Speech Bubble - Centered and Prominent */}
        <div className="bg-black border-2 border-green-400 rounded-lg p-6 mb-4 min-h-[200px] flex flex-col justify-center">
          {/* Host Speech Bubble */}
          {latestHost && (
            <div className="mb-4">
              <div className="flex justify-start">
                <div className="bg-purple-900 border-2 border-purple-400 rounded-2xl rounded-bl-none p-4 max-w-md text-white">
                  <div className="text-sm text-purple-300 font-medium mb-1">
                    👽 Alien Overlord:
                  </div>
                  <div className="text-purple-100 text-lg">{latestHost}</div>
                </div>
              </div>
            </div>
          )}

          {/* User Speech Bubble */}
          {(latestUser || isPTTUserSpeaking) && (
            <div className="mb-2">
              <div className="flex justify-end">
                <div className="bg-blue-900 border-2 border-blue-400 rounded-2xl rounded-br-none p-4 max-w-md text-white">
                  <div className="text-sm text-blue-300 font-medium mb-1">
                    🌍 Human Ambassador:
                  </div>
                  <div className="text-blue-100 text-lg">
                    {isPTTUserSpeaking || nativeIsPTTUserSpeaking
                      ? "🎤 Pleading for humanity..."
                      : latestUser.startsWith("Hello! I'm ready to play")
                      ? "Press mic to plead for humanity"
                      : latestUser}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No conversation yet */}
          {!latestHost && !latestUser && !isPTTUserSpeaking && (
            <div className="text-center text-green-400 text-lg">
              Alien-Human diplomacy will appear here...
            </div>
          )}
        </div>
      </div>

      {/* Push-to-Talk Button - Only on Web, Fixed Position */}
      {!Capacitor.isNativePlatform() &&
        hostFinishedSpeaking &&
        sessionStatus === "CONNECTED" &&
        isWebRTCReady && (
          <div className="fixed bottom-1/4 right-6 z-10">
            <div className="bg-green-900 border-2 border-green-400 rounded-full p-4 shadow-lg">
              <div className="text-center">
                <div className="text-xs text-green-300 mb-1">
                  Hold to Save Earth
                </div>
                <button
                  onMouseDown={handleTalkButtonDown}
                  onMouseUp={handleTalkButtonUp}
                  onMouseLeave={handleTalkButtonUp}
                  onTouchStart={handleTalkButtonDown}
                  onTouchEnd={handleTalkButtonUp}
                  className={`w-16 h-16 rounded-full border-4 border-green-400 transition-all duration-150 ${
                    isPTTUserSpeaking
                      ? "bg-red-500 scale-110 shadow-lg"
                      : "bg-green-700 hover:bg-green-600"
                  }`}
                >
                  <div className="text-5xl">
                    {isPTTUserSpeaking ? "🔴" : "🎤"}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Decorative elements - Space themed */}
      <div className="flex justify-center space-x-3 text-lg opacity-30 mt-4">
        <span>🛸</span>
        <span>👽</span>
        <span>🌍</span>
        <span>💫</span>
        <span>🚀</span>
      </div>
    </div>
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
