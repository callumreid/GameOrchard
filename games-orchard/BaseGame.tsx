"use client";
import React, { useState, useEffect, useCallback } from "react";
import { GameProps, GameState } from "./types";

interface BaseGameProps extends GameProps {
  title: string;
  instructions: string;
  duration?: number; // in seconds, defaults to 10
  children: React.ReactNode;
}

export default function BaseGame({
  title,
  instructions,
  duration = 10,
  onGameEnd,
  sendPlayerText,
  playSound,
  children,
}: BaseGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    timeRemaining: duration,
    score: 0,
    message: instructions,
  });

  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showHorrorBanner, setShowHorrorBanner] = useState(false);
  const [horrorFlickerCount, setHorrorFlickerCount] = useState(0);
  const [finalResult, setFinalResult] = useState<{
    success: boolean;
    score: number;
  }>({ success: false, score: 0 });

  // Countdown before game starts
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        if (playSound) {
          playSound("countdown-beep");
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      startGame();
    }
  }, [countdown, showCountdown, playSound]);

  // Game timer - only runs when timer is explicitly started
  useEffect(() => {
    if (
      gameState.status === "playing" &&
      gameState.timeRemaining > 0 &&
      timerStarted
    ) {
      const timer = setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (
      gameState.status === "playing" &&
      gameState.timeRemaining === 0
    ) {
      endGame(false, "Time's up!");
    }
  }, [gameState.status, gameState.timeRemaining, timerStarted]);

  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: "playing",
      // Don't set message here - let the game component handle it
    }));

    if (sendPlayerText) {
      sendPlayerText(`${title} begins now! ${instructions}`);
    }

    if (playSound) {
      playSound("game-start");
    }
  }, [title, instructions, sendPlayerText, playSound]);

  const endGame = useCallback(
    (success: boolean, message?: string, score?: number) => {
      const finalScore = score ?? gameState.score;
      const timeElapsed = duration - gameState.timeRemaining;

      console.log("🎬 BaseGame endGame called - starting horror sequence:", {
        success,
        message,
        score: finalScore,
      });

      // Store final result
      setFinalResult({ success, score: finalScore });

      // Start horror sequence
      setShowHorrorBanner(true);
      console.log("🎬 Horror banner state set to true");

      // Flicker effect
      let currentFlicker = 0;
      const flickerInterval = setInterval(() => {
        setHorrorFlickerCount((prev) => prev + 1);
        currentFlicker++;

        if (currentFlicker >= 8) {
          // 8 flickers
          clearInterval(flickerInterval);
        }
      }, 150); // Flicker every 150ms

      if (playSound) {
        playSound(success ? "game-win" : "game-lose");
      }

      // Hide horror banner and end game after 6 seconds
      setTimeout(() => {
        setShowHorrorBanner(false);
        setHorrorFlickerCount(0);

        setGameState((prev) => ({
          ...prev,
          status: success ? "completed" : "failed",
          score: finalScore,
          message:
            message || (success ? "Well done!" : "Better luck next time!"),
        }));

        onGameEnd({
          success,
          score: finalScore,
          message: message,
          timeElapsed,
        });
      }, 6000);
    },
    [gameState.score, gameState.timeRemaining, duration, onGameEnd, playSound]
  );

  // Provide game control functions to children
  const gameControls = {
    endGame,
    updateScore: (score: number) =>
      setGameState((prev) => ({ ...prev, score })),
    updateMessage: (message: string) =>
      setGameState((prev) => ({ ...prev, message })),
    startTimer: () => setTimerStarted(true),
    gameState,
    sendPlayerText,
    playSound,
  };

  if (showCountdown) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <h1 className="text-4xl font-bold mb-8">{title}</h1>
        <div className="text-8xl font-bold mb-4">{countdown}</div>
        <p className="text-xl text-center max-w-md">{instructions}</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Normal Game UI - Hidden when horror banner is active */}
      <div
        className={`flex flex-col h-full bg-gradient-to-br from-blue-600 to-purple-600 text-white ${
          showHorrorBanner ? "hidden" : ""
        }`}
      >
        {/* Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {React.cloneElement(children as React.ReactElement, {
            ...gameControls,
          })}
        </div>

        {/* Status Message */}
        <div className="p-4 bg-black bg-opacity-20 text-center">
          <p className="text-lg">{gameState.message}</p>
          {gameState.status === "playing" && (
            <div className="mt-2">
              <div className="h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(gameState.timeRemaining / duration) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Horror Banner - Full Screen Takeover */}
      {showHorrorBanner &&
        (() => {
          console.log(
            "🎬 HORROR BANNER RENDERING - flickerCount:",
            horrorFlickerCount
          );
          return (
            <div
              className="fixed inset-0 w-screen h-screen flex items-center justify-center"
              style={{
                zIndex: 999999,
                backgroundColor:
                  horrorFlickerCount % 2 === 0 ? "#000000" : "#ffffff",
                transition: "background-color 0.05s",
              }}
            >
              {horrorFlickerCount >= 8 && (
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    style={{
                      backgroundColor: finalResult.success
                        ? "#00ff00"
                        : "#ff0000",
                      color: "#000000",
                      fontSize: "4rem",
                      fontWeight: "900",
                      border: "10px solid #000000",
                      borderRadius: "20px",
                      minWidth: "800px",
                      minHeight: "500px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      padding: "40px",
                    }}
                  >
                    <div style={{ fontSize: "8rem", marginBottom: "30px" }}>
                      {finalResult.success ? "🏆" : "😢"}
                    </div>
                    <div
                      style={{
                        fontSize: "4rem",
                        fontWeight: "900",
                        lineHeight: "1.2",
                      }}
                    >
                      {finalResult.success ? "WINNER WINNER" : "LOSER LOSER"}
                    </div>
                    <div
                      style={{
                        fontSize: "4rem",
                        fontWeight: "900",
                        lineHeight: "1.2",
                      }}
                    >
                      {finalResult.success
                        ? "CHICKEN DINNER!"
                        : "CHICKEN HOOSIER!"}
                    </div>
                    <div style={{ fontSize: "3rem", marginTop: "30px" }}>
                      Score: {finalResult.score}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
