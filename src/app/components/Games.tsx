"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  getGameById,
  getImplementedGames,
  getGameMetadata,
} from "@/games-orchard";
import { GameMetadata } from "@/games-orchard/types";
import { useGameSession } from "../providers/GameSessionProvider";
import PTTAnimation from "./PTTAnimation";
import { useTranscript } from "../contexts/TranscriptContext";

const FlyingFruitsBackground = dynamic(
  () => import("./FlyingFruitsBackground"),
  { ssr: false }
);

export default function Games() {
  const [gameState, setGameState] = useState<
    "landing" | "playing" | "transition" | "end"
  >("landing");
  const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
  const [GameComponent, setGameComponent] =
    useState<React.ComponentType<any> | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // Target background music volumes
  const BG_VOLUME_MOBILE = 0.25;
  const BG_VOLUME_DESKTOP = 0.45;

  // Multi-game sequence state
  // Note: kept for compatibility with existing props, mirrors currentRoundIndex
  const [, setCurrentGameIndex] = useState<number>(0);
  const [implementedGames] = useState<GameMetadata[]>(() => {
    const games = getImplementedGames();
    // Shuffle the games array for random order
    return [...games].sort(() => Math.random() - 0.5);
  });
  // Current loop of 3 rounds
  const TOTAL_ROUNDS = 3;
  const [roundGames, setRoundGames] = useState<GameMetadata[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundResults, setRoundResults] = useState<
    Array<{
      id: string;
      name: string;
      success: boolean;
      score: number;
      message?: string;
      timeElapsed?: number;
      conversation?: string;
    }>
  >([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string>("");
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
  const [requiresResume, setRequiresResume] = useState(false);
  const didBackgroundRef = useRef(false);
  // WebAudio pipeline for reliable volume control on mobile
  const bgAudioContextRef = useRef<AudioContext | null>(null);
  const bgGainNodeRef = useRef<GainNode | null>(null);
  const bgSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bgConnectedRef = useRef(false);

  function setupMobileWebAudio() {
    if (!isMobileBrowser()) return;
    if (!audioRef.current) return;
    try {
      // Recreate context if closed or missing
      if (
        !bgAudioContextRef.current ||
        (bgAudioContextRef.current as any).state === "closed"
      ) {
        bgAudioContextRef.current = new AudioContext();
        bgSourceNodeRef.current = null;
        bgGainNodeRef.current = null;
        bgConnectedRef.current = false;
      }
      const ctx = bgAudioContextRef.current;
      // Resume must happen inside user gesture for iOS
      if (ctx && ctx.state === "suspended") {
        // Intentionally not awaiting to keep gesture chain synchronous
        ctx.resume().catch(() => {});
      }
      if (ctx && !bgSourceNodeRef.current) {
        bgSourceNodeRef.current = ctx.createMediaElementSource(
          audioRef.current
        );
      }
      if (ctx && !bgGainNodeRef.current) {
        bgGainNodeRef.current = ctx.createGain();
      }
      if (
        ctx &&
        bgSourceNodeRef.current &&
        bgGainNodeRef.current &&
        !bgConnectedRef.current
      ) {
        try {
          bgSourceNodeRef.current.connect(bgGainNodeRef.current);
          bgGainNodeRef.current.connect(ctx.destination);
          bgConnectedRef.current = true;
        } catch (_) {}
      }
      if (bgGainNodeRef.current) {
        bgGainNodeRef.current.gain.value = BG_VOLUME_MOBILE;
      }
      // Avoid double playback using element volume=0 instead of muted (iOS bug avoidance)
      audioRef.current.volume = 0;
    } catch (_) {}
  }

  const {
    sendUserText,
    sessionStatus,
    isWebRTCReady,
    isPTTUserSpeaking,
    resumeOutputAudio,
    mute,
  } = useGameSession();
  const { transcriptItems, addTranscriptBreadcrumb } = useTranscript();
  const [currentRoundStartMs, setCurrentRoundStartMs] = useState<number>(0);

  function startCurrentRound() {
    setCurrentRoundStartMs(Date.now());
    const roundNumber = currentRoundIndex + 1;
    if (selectedGame) {
      addTranscriptBreadcrumb(
        `[Round ${roundNumber}] Start: ${selectedGame.name}`,
        {
          round: roundNumber,
          gameId: selectedGame.id,
          gameName: selectedGame.name,
        }
      );
    } else {
      addTranscriptBreadcrumb(`[Round ${roundNumber}] Start`, {
        round: roundNumber,
      });
    }
    setGameState("playing");
  }

  function collectRoundConversation(startMs: number, endMs: number): string {
    const lines = transcriptItems
      .filter(
        (t) =>
          t.type === "MESSAGE" &&
          t.createdAtMs >= startMs &&
          t.createdAtMs <= endMs
      )
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((t) => {
        const speaker =
          t.role === "assistant" ? "Host" : t.role === "user" ? "You" : "Other";
        return `${speaker}: ${t.title ?? ""}`;
      });
    return lines.join("\n");
  }

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
        if (isMobileBrowser()) {
          setupMobileWebAudio();
        } else {
          audioRef.current.volume = BG_VOLUME_DESKTOP;
          audioRef.current.muted = false;
        }
        audioRef.current.play().catch(() => {
          // If autoplay fails on resume, show resume prompt
          if (isMobileBrowser()) setRequiresResume(true);
        });
      }
    }
  }, [gameState, hasUserInteracted, isStarted]);

  // Mute/pause background music when the app goes to the background
  useEffect(() => {
    const handleHidden = () => {
      const el = audioRef.current;
      if (!el) return;
      try {
        el.muted = true;
        el.pause();
      } catch (_) {}
      didBackgroundRef.current = true;
    };
    const handleVisible = () => {
      // On mobile, gate resumption behind explicit user gesture
      if (isMobileBrowser() && didBackgroundRef.current) {
        setRequiresResume(true);
        didBackgroundRef.current = false;
        return;
      }

      const el = audioRef.current;
      if (!el) return;
      try {
        if (isMobileBrowser()) {
          // Cannot reliably resume outside gesture; show resume prompt above if needed
          if (bgGainNodeRef.current) {
            bgGainNodeRef.current.gain.value = BG_VOLUME_MOBILE;
          }
          // Keep element volume at 0 to avoid double audio
          el.volume = 0;
        } else {
          el.muted = false;
          el.volume = BG_VOLUME_DESKTOP;
        }
        if (hasUserInteracted && isStarted && gameState !== "playing") {
          el.play().catch(() => {
            if (isMobileBrowser()) setRequiresResume(true);
          });
        }
      } catch (_) {}

      try {
        resumeOutputAudio();
      } catch (_) {}
      try {
        mute(false);
      } catch (_) {}
    };
    const onVisibilityChange = () => {
      if (document.hidden) handleHidden();
      else handleVisible();
    };
    window.addEventListener("pagehide", handleHidden);
    window.addEventListener("pageshow", handleVisible);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handleHidden);
      window.removeEventListener("pageshow", handleVisible);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    hasUserInteracted,
    isStarted,
    gameState,
    sessionStatus,
    resumeOutputAudio,
    mute,
  ]);

  const handleResumeClick = () => {
    try {
      resumeOutputAudio();
    } catch (_) {}
    try {
      mute(false);
    } catch (_) {}
    const el = audioRef.current;
    if (el) {
      try {
        if (isMobileBrowser()) {
          setupMobileWebAudio();
        } else {
          el.muted = false;
          el.volume = BG_VOLUME_DESKTOP;
        }
        if (hasUserInteracted && isStarted && gameState !== "playing") {
          el.play().catch(() => {
            if (isMobileBrowser()) setRequiresResume(true);
          });
        }
      } catch (_) {}
    }
    setRequiresResume(false);
  };

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

      // After 10 seconds, start the game
      const startGameTimer = setTimeout(() => {
        if (selectedGame && GameComponent) {
          startCurrentRound();
        }
      }, 10000);

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

  // Initialize 3-round game loop
  useEffect(() => {
    if (implementedGames.length === 0) {
      console.warn("No implemented games found!");
      return;
    }

    // FTUE: On first play, force a specific sequence of 3 games
    const isFirstTime = (() => {
      try {
        if (typeof window === "undefined") return false;
        const stored = window.localStorage.getItem("ftueCompleted");
        return !stored;
      } catch (_) {
        return false;
      }
    })();

    if (isFirstTime) {
      const ftueIds = [
        "advise-the-child",
        "attract-the-turkey",
        "convince-the-aliens",
      ];
      const ftueGames = ftueIds
        .map((id) => getGameMetadata(id))
        .filter(Boolean) as GameMetadata[];

      if (ftueGames.length > 0) {
        setRoundGames(ftueGames);
        setCurrentRoundIndex(0);
        setTotalScore(0);
        setRoundResults([]);
        setSummaryText("");
        setSummaryError("");

        const first = ftueGames[0];
        setSelectedGame(first);
        const component = getGameById(first.id);
        setGameComponent(() => component);
        setCurrentGameIndex(0);
        return;
      }
    }

    const pickRoundGames = (pool: GameMetadata[], count: number) => {
      const unique = [...pool];
      // Already shuffled in implementedGames; make a fresh shallow copy and re-shuffle
      for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
      }
      return unique.slice(0, Math.min(count, unique.length));
    };

    const initialRoundGames = pickRoundGames(implementedGames, TOTAL_ROUNDS);
    setRoundGames(initialRoundGames);
    setCurrentRoundIndex(0);
    setTotalScore(0);
    setRoundResults([]);
    setSummaryText("");
    setSummaryError("");

    // Allow URL hash override to force a single specific game as first round
    const gameId = window.location.hash.replace("#", "");
    const first =
      initialRoundGames.find((g) => g.id === gameId) || initialRoundGames[0];
    setSelectedGame(first);
    const component = getGameById(first.id);
    setGameComponent(() => component);
    setCurrentGameIndex(0);
  }, [implementedGames]);

  const handleGameEnd = (_result: any) => {
    console.log("Game ended:", _result, "Current round:", currentRoundIndex);

    // Accumulate score and store result
    const score = Number(_result?.score || 0);
    const success = !!_result?.success;
    const message = _result?.message as string | undefined;
    const timeElapsed = _result?.timeElapsed as number | undefined;
    const endedGame = roundGames[currentRoundIndex];
    const nowMs = Date.now();
    const conversation = collectRoundConversation(
      currentRoundStartMs || 0,
      nowMs
    );
    if (endedGame) {
      setRoundResults((prev) => [
        ...prev,
        {
          id: endedGame.id,
          name: endedGame.name,
          score,
          success,
          message,
          timeElapsed,
          conversation,
        },
      ]);
    }
    setTotalScore((prev) => prev + score);

    // Wait for BaseGame banner to finish (6 seconds) before starting transition/end
    setTimeout(() => {
      const isLastRound =
        currentRoundIndex >= Math.min(TOTAL_ROUNDS, roundGames.length) - 1;
      if (!isLastRound) {
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

        // After 8 seconds, start next round
        setTimeout(() => {
          const nextIndex = currentRoundIndex + 1;
          const nextGame = roundGames[nextIndex];

          setCurrentRoundIndex(nextIndex);
          setCurrentGameIndex(nextIndex);
          setSelectedGame(nextGame);

          const component = getGameById(nextGame.id);
          setGameComponent(() => component);

          startCurrentRound();
        }, 8000);
      } else {
        // All 3 rounds completed → show end screen, generate summary
        setGameState("end");
        // Mark FTUE complete after finishing a 3-round session
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("ftueCompleted", "true");
          }
        } catch (_) {}
        setIsGeneratingSummary(true);
        setSummaryError("");
        // Kick off summary generation
        const generate = async () => {
          try {
            const res = await fetch("/api/summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                results: [
                  ...roundResults,
                  {
                    id: endedGame?.id,
                    name: endedGame?.name,
                    score,
                    success,
                    message,
                    timeElapsed,
                    conversation,
                  },
                ],
                totalScore: totalScore + score,
                rounds: Math.min(TOTAL_ROUNDS, roundGames.length),
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to summarize");
            setSummaryText(data?.summary || "");
          } catch (e: any) {
            console.error("Summary generation failed", e);
            setSummaryError(e?.message || "Failed to generate summary");
          } finally {
            setIsGeneratingSummary(false);
          }
        };
        generate();
      }
    }, 6000);
  };

  const handlePlayMore = () => {
    // Start a fresh 3-round loop immediately
    if (implementedGames.length === 0) return;
    // Prefer games the player hasn't played yet
    const playedIds = new Set(roundResults.map((r) => r.id));
    const unplayed = implementedGames.filter((g) => !playedIds.has(g.id));
    const played = implementedGames.filter((g) => playedIds.has(g.id));
    const shuffledUnplayed = [...unplayed].sort(() => Math.random() - 0.5);
    const shuffledPlayed = [...played].sort(() => Math.random() - 0.5);
    const combined = [...shuffledUnplayed, ...shuffledPlayed];
    const chosen = combined.slice(0, Math.min(TOTAL_ROUNDS, combined.length));
    setRoundGames(chosen);
    setCurrentRoundIndex(0);
    setCurrentGameIndex(0);
    setTotalScore(0);
    setRoundResults([]);
    setSummaryText("");
    setSummaryError("");
    setCurrentTransitionVideo((prev) => (prev + 1) % transitionVideos.length);
    const firstGame = chosen[0];
    setSelectedGame(firstGame);
    const component = getGameById(firstGame.id);
    setGameComponent(() => component);
    startCurrentRound();
  };

  function isMobileBrowser() {
    if (typeof navigator === "undefined") return false;
    const ua = (navigator.userAgent || "").toLowerCase();
    const uaIsMobile =
      /android|iphone|ipad|ipod|iemobile|blackberry|opera mini/.test(ua);
    const hasTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator as any).maxTouchPoints > 0);
    return uaIsMobile || hasTouch;
  }

  const handleShareToX = async () => {
    const url = "https://gameorchard.beer";
    const text =
      summaryText && summaryText.trim().length > 0
        ? summaryText
        : `I played Game Orchard! Total Score: ${totalScore}`;
    const maxText = text.slice(0, 240);

    try {
      if (
        typeof navigator !== "undefined" &&
        isMobileBrowser() &&
        (navigator as any).share
      ) {
        await (navigator as any).share({
          title: "Game Orchard",
          text: maxText,
          url,
        });
        return;
      }
    } catch (_) {
      // Ignore and fallback
    }

    const baseUrl = "https://twitter.com/intent/tweet";
    const shareUrl = `${baseUrl}?text=${encodeURIComponent(
      maxText
    )}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const renderLandingPage = () => {
    const getConnectionStatus = () => {
      if (sessionStatus === "DISCONNECTED")
        return "Refresh to grant mic permission to play!!!";
      if (sessionStatus === "CONNECTING") return "Establishing connection...";
      if (sessionStatus === "CONNECTED" && !isWebRTCReady)
        return "Preparing game engine...";
      return "Ready to play!";
    };

    const isReady = sessionStatus === "CONNECTED" && isWebRTCReady;
    const handleStart = () => {
      setHasUserInteracted(true);
      setIsStarted(true);
      // Mark FTUE as completed on first explicit start
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ftueCompleted", "true");
        }
      } catch (_) {}
      // Ensure SDK output audio element resumes on user gesture (required in IG/Safari)
      try {
        resumeOutputAudio();
      } catch (_) {}
      if (audioRef.current) {
        if (isMobileBrowser()) {
          setupMobileWebAudio();
        } else {
          audioRef.current.volume = BG_VOLUME_DESKTOP;
          audioRef.current.muted = false;
        }
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
          className={`relative z-20 max-w-[95%] flex flex-col items-center justify-center transition-opacity duration-1000 ${
            showContent ? "opacity-100" : "opacity-0"
          }`}
        >
          <h1
            className={`text-6xl sm:text-7xl md:text-8xl font-bold mb-12 text-center text-shadow-lg ${
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
              className={isFlashing ? "animate-bounce" : ""}
              style={{ animationDelay: "0.4s" }}
            >
              {" "}
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
            <div className="flex items-center justify-center mb-4 -mt-4">
              {!isReady && sessionStatus !== "DISCONNECTED" && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
              )}
              <span className="text-lg sm:text-xl">
                {getConnectionStatus() !== "Ready to play!"
                  ? getConnectionStatus()
                  : "Talk Your Way Out of Anything"}
              </span>
            </div>
            {!isStarted && (
              <button
                onClick={handleStart}
                disabled={!isReady}
                className={`group relative inline-flex items-center justify-center px-10 py-4 rounded-full font-extrabold text-2xl tracking-wide transition-all ${
                  isReady
                    ? "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-black shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300 active:scale-95 animate-bounce"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed opacity-70"
                }`}
                aria-label="Start game"
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
              userColor={currentFruit.color}
              roundIndex={currentRoundIndex}
              totalRounds={Math.min(
                TOTAL_ROUNDS,
                roundGames.length || TOTAL_ROUNDS
              )}
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
        <h1 className="text-5xl sm:text-6xl font-bold mb-2 text-center animate-pulse">
          Next Round Loading...
        </h1>
        <div className="text-xl opacity-90 text-center mb-6">
          Round{" "}
          {Math.min(
            currentRoundIndex + 2,
            Math.min(TOTAL_ROUNDS, roundGames.length)
          )}{" "}
          of {Math.min(TOTAL_ROUNDS, roundGames.length || TOTAL_ROUNDS)}
        </div>
        <div className="text-xl opacity-90 text-center">
          {currentRoundIndex <
            Math.min(TOTAL_ROUNDS, roundGames.length) - 1 && (
            <p>Up Next: {roundGames[currentRoundIndex + 1]?.name}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderEndScreen = () => {
    return (
      <div className="relative flex flex-col items-center justify-center h-full text-white">
        {/* Background Video */}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          key={transitionVideos[currentTransitionVideo]}
          autoPlay
        >
          <source
            src={transitionVideos[currentTransitionVideo]}
            type="video/mp4"
          />
        </video>

        {/* Dark overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-70 z-10" />

        <div className="relative z-20 max-w-3xl mx-auto p-4 text-center">
          <h2 className="text-5xl sm:text-7xl font-extrabold mb-6">
            Game Over
          </h2>
          <div className="text-2xl sm:text-3xl mb-4">
            Total Score: {totalScore}
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-base sm:text-lg text-left">
            {isGeneratingSummary && (
              <div>Summarizing your legendary performance...</div>
            )}
            {!isGeneratingSummary && summaryError && (
              <div className="text-red-300">{summaryError}</div>
            )}
            {!isGeneratingSummary && !summaryError && (
              <div className="whitespace-pre-wrap">
                {summaryText || "That was epic. (No summary available)"}
              </div>
            )}
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={handlePlayMore}
              className="bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-black px-8 py-3 rounded-full font-extrabold text-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300 active:scale-95"
            >
              Play More
            </button>
            <button
              onClick={handleShareToX}
              className="bg-[#000000] text-white px-6 py-3 rounded-full text-lg hover:bg-gray-800"
              aria-label="Share"
              title="Share"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-dvh">
      {/* Background Music */}
      <audio ref={audioRef} loop preload="auto" className="hidden">
        <source src="/bg-music-full.mp3" type="audio/mpeg" />
      </audio>

      {/* PTT Animation */}
      <PTTAnimation isActive={isPTTUserSpeaking} />

      <FlyingFruitsBackground
        className="absolute inset-0 z-0"
        speed={isPTTUserSpeaking ? 7.5 : 2.5}
        count={80}
        depth={50}
        modelPath={currentFruit.model}
        backgroundColor={currentFruit.color}
        isVisible={gameState === "playing"}
      />

      {gameState === "landing" && renderLandingPage()}
      {gameState === "playing" && renderGamePlay()}
      {gameState === "transition" && renderTransition()}
      {gameState === "end" && renderEndScreen()}
      {(gameState === "landing" || gameState === "end") && (
        <footer className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 text-xs text-white px-3 py-1 text-shadow-lg text-nowrap">
          Made with ❤️ by{" "}
          <a
            href="https://github.com/callumreid"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            🐄 cal
          </a>{" "}
          and{" "}
          <a
            href="https://github.com/kevinshen56714"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            🐈 kev
          </a>
        </footer>
      )}
      {requiresResume && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-[90%] text-center shadow-xl">
            <div className="text-gray-600 mb-5">Tap Resume to continue.</div>
            <button
              onClick={handleResumeClick}
              className="text-white px-5 py-2 rounded-lg font-medium"
              style={{ backgroundColor: currentFruit.color }}
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
