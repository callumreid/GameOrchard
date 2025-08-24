"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  allPlannedGames,
  getGameById,
  isGameImplemented,
  getImplementedGames,
} from "@/games-orchard";
import { GameMetadata } from "@/games-orchard/types";
import { useGameSession } from "../providers/GameSessionProvider";
import PTTAnimation from "./PTTAnimation";

const FlyingFruitsBackground = dynamic(
  () => import("./FlyingFruitsBackground"),
  { ssr: false }
);

export default function Games() {
  const [gameState, setGameState] = useState<
    "landing" | "playing" | "transition"
  >("landing");
  const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
  const [GameComponent, setGameComponent] =
    useState<React.ComponentType<any> | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // Multi-game sequence state
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [implementedGames] = useState<GameMetadata[]>(() => {
    const games = getImplementedGames();
    // Shuffle the games array for random order
    return [...games].sort(() => Math.random() - 0.5);
  });
  const [currentTransitionVideo, setCurrentTransitionVideo] = useState(0);
  const transitionVideos = [
    "/bg-video-apple.mp4",
    "/bg-video-banana.mp4",
    "/bg-video-lemon.mp4",
    "/bg-video-watermelon.mp4",
    "/bg-video-kiwi.mp4",
    "/bg-video-strawberry.mp4",
  ];

  const fruitForVideo = (videoSrc: string) => {
    if (videoSrc.includes("apple"))
      return { model: "/apple.glb", color: "#ff4d4d" };
    if (videoSrc.includes("banana"))
      return { model: "/banana.glb", color: "#ffbf40" };
    if (videoSrc.includes("lemon"))
      return { model: "/lemon.glb", color: "#fff176" };
    if (videoSrc.includes("watermelon"))
      return { model: "/watermelon.glb", color: "#ff6b6b" };
    if (videoSrc.includes("kiwi"))
      return { model: "/kiwi.glb", color: "#a3e635" };
    if (videoSrc.includes("strawberry"))
      return { model: "/strawberry.glb", color: "#ff3b3b" };
    return { model: "/banana.glb", color: "#ffbf40" };
  };

  const currentFruit = fruitForVideo(
    transitionVideos[currentTransitionVideo] ?? ""
  );

  // Auto-start sequence state
  const [showContent, setShowContent] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // PTT state
  const [isPTTUserSpeaking] = useState<boolean>(false);

  // Former gradient background has been replaced with a 3D bananas scene

  const { sendUserText, sessionStatus, isWebRTCReady } = useGameSession();

  // Debug logging for session state
  useEffect(() => {
    console.log("[Games] Session state update:", {
      sessionStatus,
      isWebRTCReady,
    });
  }, [sessionStatus, isWebRTCReady]);

  // Control video playback based on ready state and game state
  useEffect(() => {
    if (!isStarted) return;
    if (videoRef.current) {
      const isReady = sessionStatus === "CONNECTED" && isWebRTCReady;

      // Play video during transition state or when ready on landing
      if (gameState === "transition" || (gameState === "landing" && isReady)) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [sessionStatus, isWebRTCReady, gameState, isStarted]);

  // Control background music based on game state
  useEffect(() => {
    if (!isStarted) return;
    if (audioRef.current) {
      // Pause during playing state
      if (gameState === "playing") {
        audioRef.current.pause();
      } else {
        if (!hasUserInteracted) return;
        audioRef.current.play().catch((error) => {
          console.log("Audio play failed:", error);
        });
      }
    }
  }, [gameState, hasUserInteracted, isStarted]);

  // Auto-start sequence
  useEffect(() => {
    if (
      gameState === "landing" &&
      sessionStatus === "CONNECTED" &&
      isWebRTCReady &&
      isStarted
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
  }, [
    gameState,
    sessionStatus,
    isWebRTCReady,
    selectedGame,
    GameComponent,
    isStarted,
  ]);

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

        // Play transition video (handled by effect/autoplay)
        if (videoRef.current) {
          videoRef.current.currentTime = 0; // Rewind to start
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
    const handleStart = () => {
      setHasUserInteracted(true);
      setIsStarted(true);
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    };

    return (
      <div className="relative flex flex-col items-center justify-center h-full text-white">
        {/* Background Video */}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="metadata"
          poster="/video-frame-0.jpg"
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
        >
          <source src="/bg-video-apple.mp4" type="video/mp4" />
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
            {!isStarted && (
              <button
                onClick={handleStart}
                disabled={!isReady}
                className={`px-8 py-3 rounded-lg font-bold text-xl transition-colors ${
                  isReady
                    ? "bg-green-500 hover:bg-green-600 text-black"
                    : "bg-gray-600 text-gray-300 cursor-not-allowed"
                }`}
              >
                Start
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGamePlay = () => {
    return (
      <>
        {selectedGame && GameComponent && (
          <div className="relative z-10 w-full h-full">
            <GameComponent
              onGameEnd={handleGameEnd}
              sendPlayerText={sendUserText}
              isPTTUserSpeaking={isPTTUserSpeaking}
            />
          </div>
        )}
      </>
    );
  };

  const renderTransition = () => (
    <div className="relative flex flex-col items-center justify-center h-full text-white">
      {/* Background Video - Full screen during transition */}
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        key={transitionVideos[currentTransitionVideo]} // Force re-render when video changes
        autoPlay
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
        <source src="/bg-music-full.mp3" type="audio/mpeg" />
      </audio>

      {/* PTT Animation */}
      <PTTAnimation isActive={isPTTUserSpeaking} />

      <FlyingFruitsBackground
        className="absolute inset-0 z-0"
        speed={2.5}
        count={80}
        depth={50}
        modelPath={currentFruit.model}
        backgroundColor={currentFruit.color}
        isVisible={gameState === "playing"}
      />

      {gameState === "landing" && renderLandingPage()}
      {gameState === "playing" && renderGamePlay()}
      {gameState === "transition" && renderTransition()}
    </div>
  );
}
