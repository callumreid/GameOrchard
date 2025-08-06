"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  allPlannedGames,
  getGameById,
  isGameImplemented,
  getImplementedGames,
} from "../../../games-orchard";
import { GameMetadata } from "../../../games-orchard/types";
import { useGameSession } from "../providers/GameSessionProvider";
import PTTAnimation from "./PTTAnimation";

// Fire TV mic key plugin
const MicKey = Capacitor.isNativePlatform()
  ? registerPlugin<any>("MicKey")
  : undefined;

export default function Games() {
  const [gameState, setGameState] = useState<
    "landing" | "spinning" | "playing" | "orchard" | "transition"
  >("landing");
  const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
  const [GameComponent, setGameComponent] =
    useState<React.ComponentType<any> | null>(null);

  // Multi-game sequence state
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [implementedGames] = useState<GameMetadata[]>(() =>
    getImplementedGames()
  );
  const [currentTransitionVideo, setCurrentTransitionVideo] = useState(0);
  const transitionVideos = [
    "/bg-video.mp4",
    "/bg-video-1.mp4",
    "/bg-video-2.mp4",
    "/bg-video-3.mp4",
    "/bg-video-4.mp4",
    "/bg-video-5.mp4",
  ];

  // Auto-start sequence state
  const [showContent, setShowContent] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // PTT state
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const mKeyPressedRef = useRef(false);

  const {
    sendUserText,
    sessionStatus,
    isWebRTCReady,
    interrupt,
    pushToTalkStartNative,
    pushToTalkStopNative,
  } = useGameSession();

  // Debug logging for session state
  useEffect(() => {
    console.log("[Games] Session state update:", {
      sessionStatus,
      isWebRTCReady,
    });
  }, [sessionStatus, isWebRTCReady]);

  // Control video playback based on ready state and game state
  useEffect(() => {
    if (videoRef.current) {
      const isReady = sessionStatus === "CONNECTED" && isWebRTCReady;

      // Play video during transition state or when ready on landing
      if (gameState === "transition" || (gameState === "landing" && isReady)) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }
  }, [sessionStatus, isWebRTCReady, gameState]);

  // Control background music based on game state
  useEffect(() => {
    if (audioRef.current) {
      // Play music during landing, spinning, orchard, and transition states
      // Pause during playing state
      if (gameState === "playing") {
        audioRef.current.pause();
      } else {

        console.log("🔥🎵🚀🎶✨🔥🎵🚀🎶✨🔥🎵🚀🎶✨🔥🎵🚀🎶✨🔥🎵🚀🎶✨");
        console.log("🔥🎵🚀 DROP THE REAL QOTD BACKEND IN!!! 🚀🎵🔥");
        console.log("🔥🎵🚀 https://suno.com/song/75a92eac-0bcb-4e86-96f2-3c1ef80fbc36 🚀🎵🔥");
        console.log("🔥🎵🚀🎶✨🔥🎵🚀🎶✨🔥🎵🚀🎶✨🔥🎵🚀🎶✨🔥🎵🚀🎶✨");
        audioRef.current.play().catch((error) => {
          console.log("Audio play failed:", error);
        });
      }
    }
  }, [gameState]);

  // Auto-start sequence
  useEffect(() => {
    if (
      gameState === "landing" &&
      sessionStatus === "CONNECTED" &&
      isWebRTCReady
    ) {
      // After 1 second, start flashing the title
      const flashTimer = setTimeout(() => {
        setIsFlashing(true);
      }, 1000);

      // After 6 seconds, fade out content and overlay
      const fadeOutTimer = setTimeout(() => {
        setShowContent(false);
        setShowOverlay(false);
      }, 6000);

      // After 8 seconds, start the game
      const startGameTimer = setTimeout(() => {
        if (selectedGame && GameComponent) {
          setGameState("playing");
        }
      }, 8000);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(fadeOutTimer);
        clearTimeout(startGameTimer);
      };
    }
  }, [gameState, sessionStatus, isWebRTCReady, selectedGame, GameComponent]);

  // Initialize game sequence
  useEffect(() => {
    if (implementedGames.length === 0) {
      console.warn("No implemented games found!");
      return;
    }

    // Check for specific game in URL hash
    const gameId = window.location.hash.replace("#", "");
    if (gameId) {
      const game = allPlannedGames.find((g) => g.id === gameId);
      if (game && isGameImplemented(game.id)) {
        setSelectedGame(game);
        const component = getGameById(game.id);
        setGameComponent(() => component);
        return;
      }
    }

    // Default to first implemented game for the sequence
    const firstGame = implementedGames[0];
    setSelectedGame(firstGame);
    const component = getGameById(firstGame.id);
    setGameComponent(() => component);
    setCurrentGameIndex(0);
  }, [implementedGames]);

  // PTT handlers
  const handleTalkButtonDown = useCallback(async () => {
    console.log("[PTT] handleTalkButtonDown");
    console.log("[PTT] sessionStatus", sessionStatus);
    console.log("[PTT] isWebRTCReady", isWebRTCReady);
    if (sessionStatus !== "CONNECTED" || !isWebRTCReady) return;

    // Prevent multiple simultaneous PTT sessions
    if (isPTTUserSpeaking) {
      console.log("[PTT] Already speaking, ignoring additional keydown");
      return;
    }

    interrupt();
    setIsPTTUserSpeaking(true);
    await pushToTalkStartNative();
    console.log("[PTT] Starting push-to-talk");
  }, [
    sessionStatus,
    isWebRTCReady,
    isPTTUserSpeaking,
    interrupt,
    pushToTalkStartNative,
  ]);

  const handleTalkButtonUp = useCallback(async () => {
    console.log("[PTT] handleTalkButtonUp");
    if (sessionStatus !== "CONNECTED" || !isPTTUserSpeaking) return;

    setIsPTTUserSpeaking(false);
    await pushToTalkStopNative();
    console.log("[PTT] Stopping push-to-talk");
  }, [sessionStatus, isPTTUserSpeaking, pushToTalkStopNative]);

  // Handle native Fire TV mic key events
  useEffect(() => {
    if (!MicKey) return; // Only run on native platforms

    const handleNativeMicKey = (event: { type: string }) => {
      console.log(
        `[NativeMicKey] Event: ${event.type}, mKeyPressed: ${mKeyPressedRef.current}, isPTTUserSpeaking: ${isPTTUserSpeaking}`
      );

      if (event.type === "down") {
        // Prevent multiple calls when key is held down
        if (mKeyPressedRef.current) {
          console.log("[NativeMicKey] Key already pressed, ignoring repeat");
          return;
        }

        mKeyPressedRef.current = true;
        handleTalkButtonDown();
      } else if (event.type === "up") {
        mKeyPressedRef.current = false;
        handleTalkButtonUp();
      }
    };

    const listener = MicKey.addListener("micKey", handleNativeMicKey);

    return () => {
      listener?.remove();
    };
  }, [isPTTUserSpeaking, handleTalkButtonDown, handleTalkButtonUp]);

  const _handleStartGame = () => {
    if (selectedGame && GameComponent) {
      setGameState("playing");
    }
  };

  const handleBackToLanding = () => {
    setGameState("landing");
    // Reset game sequence
    setCurrentGameIndex(0);
    setCurrentTransitionVideo(0);
    setShowContent(true);
    setShowOverlay(true);

    // Reset to first game
    if (implementedGames.length > 0) {
      const firstGame = implementedGames[0];
      setSelectedGame(firstGame);
      const component = getGameById(firstGame.id);
      setGameComponent(() => component);
    }
  };

  const _handleVisitOrchard = () => {
    setGameState("orchard");
  };

  const handleSelectGameFromOrchard = (game: GameMetadata) => {
    setSelectedGame(game);

    // Load component if implemented
    if (isGameImplemented(game.id)) {
      const component = getGameById(game.id);
      setGameComponent(() => component);
    } else {
      setGameComponent(null);
    }

    setGameState("playing");
  };

  const handleGameEnd = (_result: any) => {
    console.log("Game ended:", _result, "Current index:", currentGameIndex);

    // Wait for BaseGame banner to finish (6 seconds) before starting transition
    setTimeout(() => {
      // Check if there's a next game in the sequence
      if (currentGameIndex < implementedGames.length - 1) {
        // Cycle to next transition video
        setCurrentTransitionVideo(
          (prev) => (prev + 1) % transitionVideos.length
        );

        // Start transition to next game
        setGameState("transition");

        // Play transition video
        if (videoRef.current) {
          videoRef.current.currentTime = 0; // Rewind to start
          videoRef.current.play();
        }

        // After 8 seconds, start next game
        setTimeout(() => {
          const nextIndex = currentGameIndex + 1;
          const nextGame = implementedGames[nextIndex];

          setCurrentGameIndex(nextIndex);
          setSelectedGame(nextGame);

          const component = getGameById(nextGame.id);
          setGameComponent(() => component);

          setGameState("playing");
        }, 8000);
      } else {
        // All games completed, return to landing
        setTimeout(() => {
          handleBackToLanding();
        }, 3000);
      }
    }, 6000); // Wait for BaseGame banner to complete
  };

  const renderLandingPage = () => {
    const getConnectionStatus = () => {
      if (sessionStatus === "DISCONNECTED")
        return "Connecting to AI Game Host...";
      if (sessionStatus === "CONNECTING") return "Establishing connection...";
      if (sessionStatus === "CONNECTED" && !isWebRTCReady)
        return "Preparing game engine...";
      return "Ready to play!";
    };

    const isReady = sessionStatus === "CONNECTED" && isWebRTCReady;

    return (
      <div className="relative flex flex-col items-center justify-center h-full text-white">
        {/* Background Video */}
        <video
          ref={videoRef}
          loop
          // muted
          playsInline
          preload="metadata"
          poster="/video-frame-0.jpg"
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay for better text readability */}
        <div
          className={`absolute top-0 left-0 w-full h-full bg-black bg-opacity-40 z-10 transition-opacity duration-1000 ${
            showOverlay ? "opacity-100" : "opacity-0"
          }`}
        ></div>

        {/* Content overlay */}
        <div
          className={`relative z-20 flex flex-col items-center justify-center transition-opacity duration-1000 ${
            showContent ? "opacity-100" : "opacity-0"
          }`}
        >
          <h1
            className={`text-8xl font-bold mb-12 text-center ${
              isFlashing ? "animate-pulse" : ""
            }`}
            style={{
              color: isFlashing ? "#ffffff" : "#ffffff",
              animation: isFlashing ? "flashText 0.3s infinite" : "none",
            }}
          >
            <span className={isFlashing ? "animate-bounce inline-block" : ""}>
              G
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.1s" }}
            >
              a
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.2s" }}
            >
              m
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.3s" }}
            >
              e
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.4s" }}
            >
              &nbsp;
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.5s" }}
            >
              O
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.6s" }}
            >
              r
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.7s" }}
            >
              c
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.8s" }}
            >
              h
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "0.9s" }}
            >
              a
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "1.0s" }}
            >
              r
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "1.1s" }}
            >
              d
            </span>
            <span
              className={isFlashing ? "animate-bounce inline-block" : ""}
              style={{ animationDelay: "1.2s" }}
            >
              !
            </span>
          </h1>

          {/* CSS for flashing animation */}
          <style jsx>{`
            @keyframes flashText {
              0% {
                color: #ffffff;
              }
              50% {
                color: #000000;
              }
              100% {
                color: #ffffff;
              }
            }
          `}</style>

          {/* Connection Status */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              {!isReady && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
              )}
              <span className="text-xl">
                {getConnectionStatus() !== "Ready to play!" &&
                  getConnectionStatus()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-600 to-teal-600 text-white">
      <h2 className="text-4xl font-bold mb-8">Spinning...</h2>
      <div className="relative">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-red-500"></div>
        </div>
      </div>
    </div>
  );

  const renderOrchard = () => (
    <div className="h-full bg-gradient-to-br from-orange-600 to-amber-600 text-white p-8 overflow-y-auto">
      {/* <button
        onClick={handleBackToLanding}
        className="absolute top-4 left-4 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-medium transition-colors z-10"
      >
        ← Back to Games
      </button> */}

      <div className="text-center mb-8 pt-16">
        <h1 className="text-6xl font-bold mb-4">🌳 The Orchard 🌳</h1>
        <p className="text-xl opacity-90">Choose your microgame adventure!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {allPlannedGames.map((game) => (
          <div
            key={game.id}
            onClick={() => handleSelectGameFromOrchard(game)}
            className={`bg-white bg-opacity-20 rounded-lg p-6 cursor-pointer transition-all transform hover:scale-105 hover:bg-opacity-30 ${
              isGameImplemented(game.id)
                ? "border-2 border-green-400"
                : "border-2 border-gray-400 opacity-75"
            }`}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2 line-clamp-2">
                {game.name}
              </h3>
              <p className="text-sm opacity-90 mb-4 line-clamp-3">
                {game.description}
              </p>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium">{game.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty:</span>
                  <span className="font-medium">
                    {"★".repeat(game.difficulty)}
                    {"☆".repeat(5 - game.difficulty)}
                  </span>
                </div>
                {game.requiresVoice && (
                  <div className="text-yellow-300 font-medium">
                    🎤 Voice Required
                  </div>
                )}
              </div>

              <div className="mt-4">
                {isGameImplemented(game.id) ? (
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    ✓ Ready to Play
                  </span>
                ) : (
                  <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGamePlay = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-red-600 to-pink-600 text-white p-8">
      {/* <button
        onClick={handleBackToLanding}
        className="absolute top-4 left-4 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-medium transition-colors"
      >
        ← Back to Games
      </button> */}

      {selectedGame && (
        <div className="w-full h-full">
          {GameComponent ? (
            <GameComponent
              onGameEnd={handleGameEnd}
              sendPlayerText={sendUserText}
              isPTTUserSpeaking={isPTTUserSpeaking}
            />
          ) : (
            <div className="text-center max-w-2xl mx-auto flex flex-col justify-center h-full">
              <h2 className="text-5xl font-bold mb-4">{selectedGame.name}</h2>
              <p className="text-xl mb-8">{selectedGame.description}</p>

              <div className="bg-white bg-opacity-20 rounded-lg p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4">Game Coming Soon!</h3>
                <p className="text-lg">
                  This game is currently under development. Each game will be a
                  10-second voice-interactive experience using the realtime AI
                  capabilities.
                </p>
                <p className="text-sm mt-4 opacity-75">
                  Category: {selectedGame.category} | Difficulty:{" "}
                  {selectedGame.difficulty}/5
                  {selectedGame.requiresVoice && " | Voice Required"}
                </p>
              </div>

              <button
                onClick={handleBackToLanding}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold text-xl transition-colors"
              >
                Play Another Game
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTransition = () => (
    <div className="relative flex flex-col items-center justify-center h-full text-white">
      {/* Background Video - Full screen during transition */}
      <video
        ref={videoRef}
        loop
        // muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        key={transitionVideos[currentTransitionVideo]} // Force re-render when video changes
      >
        <source
          src={transitionVideos[currentTransitionVideo]}
          type="video/mp4"
        />
      </video>

      {/* Dark overlay for better text readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-60 z-10"></div>

      {/* Transition content */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold mb-8 text-center animate-pulse">
          Next Game Loading...
        </h1>
        <div className="text-xl opacity-90 text-center">
          {currentGameIndex < implementedGames.length - 1 && (
            <p>Up Next: {implementedGames[currentGameIndex + 1]?.name}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen">
      {/* Background Music */}
      <audio ref={audioRef} loop preload="auto" className="hidden">
        <source src="https://suno.com/song/75a92eac-0bcb-4e86-96f2-3c1ef80fbc36" type="audio/mpeg" />
      </audio>

      {/* PTT Animation */}
      <PTTAnimation isActive={isPTTUserSpeaking} />

      {gameState === "landing" && renderLandingPage()}
      {gameState === "spinning" && renderSpinner()}
      {gameState === "orchard" && renderOrchard()}
      {gameState === "playing" && renderGamePlay()}
      {gameState === "transition" && renderTransition()}
    </div>
  );
}
