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
}

function SaveTheirSoulGame(props: Partial<GameControlProps>) {
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
    pushToTalkStartNative,
    pushToTalkStopNative,
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
    gameType: "save-their-soul",
    onGameStart: (scenario: GameScenario) => {
      console.log("Game started with scenario:", scenario);
      console.log("🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏");
      console.log("🙏🙏🙏 SAVE THEIR SOUL GAME IS ON! 🙏🙏🙏");
      console.log("🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏");
      updateMessage?.(
        "Welcome to the desolate 3 a.m. bus stop! The stranger looks lost in their phone..."
      );

      // Start timer after scene setup (estimated 12 seconds)
      setTimeout(() => {
        setHostFinishedSpeaking(true);
        startTimer?.();
        updateMessage?.(
          "Time to save their soul! Approach the stranger and convert them to your religion!"
        );
      }, 12000);
    },
    onGameFinish: (result: GameFinishResult) => {
      console.log("🎮 SaveTheirSoul onGameFinish called with result:", result);

      // Use the actual result values, handle undefined properly
      const success = result.success === true; // Ensure boolean
      const score = result.score || 0;
      
      let message: string;
      if (success) {
        message = result.message || "Another glorious soul saved! Stock price rising! Confetti cannons fire, and a celestial saxophone riff plays!";
      } else {
        message = result.message || "Congrats, heathen—eternal hold music for you. The bus splashes you with gutter water as it speeds off.";
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
      "Welcome to Save Their Soul! The flickering neon light casts shadows on the cracked pavement..."
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
    console.log("PTT stopped. Final text:", currentTranscriptionText);
  }, [
    sessionStatus,
    isPTTUserSpeaking,
    pushToTalkStopNative,
    currentTranscriptionText,
  ]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 max-w-4xl w-full mt-16 border-4 border-purple-600">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-4 text-center text-purple-200">
            🙏✨ Save Their Soul
          </h2>
          <div className="text-lg font-semibold text-purple-200 p-3 bg-purple-900 rounded-lg border-2 border-purple-500">
            Time: {gameState?.timeRemaining || 30}s
          </div>
        </div>
        {/* Speech Bubble - 3 a.m. bus stop theme */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 border-4 border-purple-500 rounded-lg p-6 mb-4 min-h-[200px] flex flex-col justify-center">
          {/* Host/Stranger Speech Bubble */}
          {latestHost && (
            <div className="mb-4">
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-gray-600 to-gray-700 border-3 border-gray-500 rounded-2xl rounded-bl-none p-4 max-w-md text-white shadow-lg">
                  <div className="text-sm text-gray-300 font-medium mb-1">
                    😞 Lost Stranger:
                  </div>
                  <div className="text-gray-100 text-lg font-bold">{latestHost}</div>
                </div>
              </div>
            </div>
          )}

          {/* User Speech Bubble */}
          {(latestUser || isPTTUserSpeaking) && (
            <div className="mb-2">
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 border-3 border-purple-500 rounded-2xl rounded-br-none p-4 max-w-md text-white shadow-lg">
                  <div className="text-sm text-purple-200 font-medium mb-1">
                    🙏 You (Missionary):
                  </div>
                  <div className="text-purple-100 text-lg font-semibold">
                    {isPTTUserSpeaking
                      ? currentTranscriptionText || "🎤 Spreading the good word..."
                      : latestUser || "Press mic to save their soul"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No conversation yet */}
          {!latestHost && !latestUser && !isPTTUserSpeaking && (
            <div className="text-center text-purple-300 text-lg font-medium">
              The neon light flickers... pigeons judge from above... your moment approaches...
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
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 border-4 border-purple-500 rounded-full p-4 shadow-xl">
              <div className="text-center">
                <div className="text-xs text-purple-800 mb-1 font-bold">
                  Hold to Preach
                </div>
                <button
                  onMouseDown={handleTalkButtonDown}
                  onMouseUp={handleTalkButtonUp}
                  onMouseLeave={handleTalkButtonUp}
                  onTouchStart={handleTalkButtonDown}
                  onTouchEnd={handleTalkButtonUp}
                  className={`w-16 h-16 rounded-full border-4 border-purple-600 transition-all duration-150 ${
                    isPTTUserSpeaking
                      ? "bg-red-500 scale-110 shadow-lg"
                      : "bg-purple-400 hover:bg-purple-500"
                  }`}
                >
                  <div className="text-5xl">
                    {isPTTUserSpeaking ? "🔴" : "🙏"}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Decorative elements - 3 a.m. bus stop themed */}
      <div className="flex justify-center space-x-3 text-2xl opacity-40 mt-4">
        <span>🚏</span>
        <span>🌙</span>
        <span>📱</span>
        <span>🕐</span>
        <span>🙏</span>
        <span>✨</span>
      </div>
    </div>
  );
}

export default function SaveTheirSoulGameComponent(props: GameProps) {
  return (
    <BaseGame
      title="Save Their Soul"
      instructions="A forlorn stranger slumps on a wobbly bus-stop bench at 3 a.m., scrolling doom-posts on a cracked phone. Armed with nothing but your holy elevator pitch, you must convert them to your highly questionable religion!"
      duration={30}
      {...props}
    >
      <SaveTheirSoulGame />
    </BaseGame>
  );
}