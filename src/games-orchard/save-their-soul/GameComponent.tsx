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
        message =
          result.message ||
          "Another glorious soul saved! Stock price rising! Confetti cannons fire, and a celestial saxophone riff plays!";
      } else {
        message =
          result.message ||
          "Congrats, heathen—eternal hold music for you. The bus splashes you with gutter water as it speeds off.";
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
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-amber-900 via-yellow-900 to-amber-950">
      <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg shadow-lg p-6 max-w-4xl w-full mt-16 border-4 border-amber-800">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-4 text-center text-amber-900">
            🙏✨ Save Their Soul
          </h2>
          <div className="text-lg font-semibold text-yellow-100 p-3 bg-amber-900 rounded-lg border-2 border-amber-700">
            Time: {gameState?.timeRemaining || 30}s
          </div>
        </div>
        {/* Speech Bubble - 3 a.m. bus stop theme */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-4 border-amber-700 rounded-lg p-6 mb-4 min-h-[200px] flex flex-col justify-center">
          {/* Host/Stranger Speech Bubble */}
          {latestHost && (
            <div className="mb-4">
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-amber-800 to-yellow-800 border-3 border-amber-600 rounded-2xl rounded-bl-none p-4 max-w-md text-yellow-100 shadow-lg">
                  <div className="text-sm text-yellow-200 font-medium mb-1">
                    😞 Lost Stranger:
                  </div>
                  <div className="text-yellow-100 text-lg font-bold">
                    {latestHost}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Speech Bubble */}
          {(latestUser || isPTTUserSpeaking) && (
            <div className="mb-2">
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-yellow-700 to-amber-700 border-3 border-yellow-600 rounded-2xl rounded-br-none p-4 max-w-md text-yellow-100 shadow-lg">
                  <div className="text-sm text-yellow-200 font-medium mb-1">
                    🙏 You (Head of God's Sales team):
                  </div>
                  <div className="text-yellow-100 text-lg font-semibold">
                    {isPTTUserSpeaking
                      ? currentTranscriptionText ||
                        "🎤 Spreading the good word..."
                      : latestUser || "Press mic to save their soul"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No conversation yet */}
          {!latestHost && !latestUser && !isPTTUserSpeaking && (
            <div className="text-center text-amber-700 text-lg font-medium">
              Ancient scrolls await... the spirit calls... salvation beckons...
            </div>
          )}
        </div>
      </div>

      {/* Push-to-Talk Button - Web */}
      { sessionStatus === "CONNECTED" &&
        isWebRTCReady && (
          <div className="fixed bottom-1/4 right-6 z-10">
          <div className="flex flex-col items-center mt-8">
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onMouseLeave={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
              className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-amber-700 transition-all duration-150 shadow-lg ${
                isPTTUserSpeaking
                  ? "bg-yellow-600 scale-110"
                  : "bg-amber-200 hover:bg-amber-300"
              }`}
            >
              <div className="text-8xl sm:text-9xl">
                {isPTTUserSpeaking ? "🔴" : "🙏"}
              </div>
            </button>
            <div className="text-sm text-amber-900 mt-2 font-bold">
              Hold to Preach
            </div>
          </div>
          </div>
        )}

      
     
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
