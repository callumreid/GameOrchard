import { useCallback, useEffect, useState } from "react";
import { useGameSession } from "../providers/GameSessionProvider";
import { useTranscript } from "../contexts/TranscriptContext";

export interface GameScenario {
  id: string;
  problem: string;
  childQuote?: string;
  policeQuote?: string;
  alienQuote?: string;
  customerQuote?: string;
  bullyQuote?: string;
  daughterQuote?: string;
  turkeyQuote?: string;
  bossQuote?: string;
  vcQuote?: string;
  context: string;
  goodAdviceKeywords?: string[];
  badAdviceKeywords?: string[];
  goodStallKeywords?: string[];
  badStallKeywords?: string[];
  goodConvinceKeywords?: string[];
  badConvinceKeywords?: string[];
  goodSaleKeywords?: string[];
  badSaleKeywords?: string[];
  goodComebackKeywords?: string[];
  badComebackKeywords?: string[];
  goodDeathKeywords?: string[];
  badDeathKeywords?: string[];
  goodTurkeyKeywords?: string[];
  badTurkeyKeywords?: string[];
  goodExcuseKeywords?: string[];
  badExcuseKeywords?: string[];
  goodPitchKeywords?: string[];
  badPitchKeywords?: string[];
}

export interface GameFinishResult {
  success: boolean;
  score: number;
  message: string;
}

export interface UseGameAgentOptions {
  onGameStart?: (scenario: GameScenario) => void;
  onGameFinish?: (result: GameFinishResult) => void;
  gameType?:
    | "save-their-soul"
    | "pitch-startup"
    | "excuse-the-boss"
    | "attract-the-turkey"
    | "pwn-the-bully"
    | "explain-death"
    | "advise-the-child"
    | "stall-the-police"
    | "convince-the-aliens"
    | "evaluate-yourself"
    | "point-the-task"
    | "sell-the-lemon";
}

export function useGameAgent(options: UseGameAgentOptions = {}) {
  const { onGameStart, onGameFinish, gameType = "point-the-task" } = options;
  const { sendUserText, isWebRTCReady } = useGameSession();
  const { transcriptItems } = useTranscript();
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<GameScenario | null>(
    null
  );
  const [processedItemIds, setProcessedItemIds] = useState<Set<string>>(
    new Set()
  );

  // Listen for game tool calls in the transcript items
  useEffect(() => {
    if (!transcriptItems || transcriptItems.length === 0) return;

    // Look for recent breadcrumb items with tool call results
    const recentBreadcrumbs = transcriptItems
      .filter(
        (item) =>
          item.type === "BREADCRUMB" && !processedItemIds.has(item.itemId)
      )
      .slice(-10); // Check last 10 breadcrumbs

    for (const item of recentBreadcrumbs) {
      if (item.title?.includes("function call result:")) {
        // Handle child advice game
        if (
          item.title.includes("start_child_advice_game") &&
          item.data &&
          gameType === "advise-the-child"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse child advice game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_child_advice_game") &&
          gameType === "advise-the-child"
        ) {
          try {
            console.log("🔍 Found finish_child_advice_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse child advice game finish result:",
              e
            );
          }
        }
        // Handle police stall game
        else if (
          item.title.includes("start_police_stall_game") &&
          item.data &&
          gameType === "stall-the-police"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse police stall game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_police_stall_game") &&
          gameType === "stall-the-police"
        ) {
          try {
            console.log("🔍 Found finish_police_stall_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse police stall game finish result:",
              e
            );
          }
        }
        // Handle alien convince game
        else if (
          item.title.includes("start_alien_convince_game") &&
          item.data &&
          gameType === "convince-the-aliens"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse alien convince game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_alien_convince_game") &&
          gameType === "convince-the-aliens"
        ) {
          try {
            console.log(
              "🔍 Found finish_alien_convince_game breadcrumb:",
              item
            );
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse alien convince game finish result:",
              e
            );
          }
        }
        // Handle self-evaluation game
        else if (
          item.title.includes("start_self_evaluation_game") &&
          item.data &&
          gameType === "evaluate-yourself"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse self-evaluation game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_self_evaluation_game") &&
          gameType === "evaluate-yourself"
        ) {
          try {
            console.log(
              "🔍 Found finish_self_evaluation_game breadcrumb:",
              item
            );
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse self-evaluation game finish result:",
              e
            );
          }
        }
        // Handle point-the-task game
        else if (
          item.title.includes("start_point_task_game") &&
          item.data &&
          gameType === "point-the-task"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse point-the-task game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_point_task_game") &&
          gameType === "point-the-task"
        ) {
          try {
            console.log("🔍 Found finish_point_task_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse point-the-task game finish result:",
              e
            );
          }
        }
        // Handle pwn-the-bully game
        else if (
          item.title.includes("start_bully_pwn_game") &&
          item.data &&
          gameType === "pwn-the-bully"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse pwn-the-bully game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_bully_pwn_game") &&
          gameType === "pwn-the-bully"
        ) {
          try {
            console.log("🔍 Found finish_bully_pwn_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse pwn-the-bully game finish result:",
              e
            );
          }
        }
        // Handle explain-death game
        else if (
          item.title.includes("start_death_explanation_game") &&
          item.data &&
          gameType === "explain-death"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse explain-death game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_death_explanation_game") &&
          gameType === "explain-death"
        ) {
          try {
            console.log(
              "🔍 Found finish_death_explanation_game breadcrumb:",
              item
            );
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse explain-death game finish result:",
              e
            );
          }
        }
        // Handle excuse-the-boss game
        else if (
          item.title.includes("start_boss_excuse_game") &&
          item.data &&
          gameType === "excuse-the-boss"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse excuse-the-boss game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_boss_excuse_game") &&
          gameType === "excuse-the-boss"
        ) {
          try {
            console.log("🔍 Found finish_boss_excuse_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse excuse-the-boss game finish result:",
              e
            );
          }
        }
        // Handle attract-the-turkey game
        else if (
          item.title.includes("start_turkey_attraction_game") &&
          item.data &&
          gameType === "attract-the-turkey"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse attract-the-turkey game start scenario:",
              e
            );
          }
        } else if (
          item.title.includes("finish_turkey_attraction_game") &&
          gameType === "attract-the-turkey"
        ) {
          try {
            console.log(
              "🔍 Found finish_turkey_attraction_game breadcrumb:",
              item
            );
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error(
              "Failed to parse attract-the-turkey game finish result:",
              e
            );
          }
        }
        // Handle lemon sale game
        else if (
          item.title.includes("start_lemon_sale_game") &&
          item.data &&
          gameType === "sell-the-lemon"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error("Failed to parse lemon sale game start scenario:", e);
          }
        } else if (
          item.title.includes("finish_lemon_sale_game") &&
          gameType === "sell-the-lemon"
        ) {
          try {
            console.log("🔍 Found finish_lemon_sale_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error("Failed to parse lemon sale game finish result:", e);
          }
        }
        // Handle save-their-soul game
        else if (
          item.title.includes("start_soul_saving_game") &&
          item.data &&
          gameType === "save-their-soul"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error("Failed to parse save-their-soul game start scenario:", e);
          }
        } else if (
          item.title.includes("finish_soul_saving_game") &&
          gameType === "save-their-soul"
        ) {
          try {
            console.log("🔍 Found finish_soul_saving_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error("Failed to parse save-their-soul game finish result:", e);
          }
        }
        // Handle pitch-startup game
        else if (
          item.title.includes("start_startup_pitch_game") &&
          item.data &&
          gameType === "pitch-startup"
        ) {
          try {
            const scenario = item.data as GameScenario;
            setCurrentScenario(scenario);
            setIsGameActive(true);
            onGameStart?.(scenario);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error("Failed to parse pitch-startup game start scenario:", e);
          }
        } else if (
          item.title.includes("finish_startup_pitch_game") &&
          gameType === "pitch-startup"
        ) {
          try {
            console.log("🔍 Found finish_startup_pitch_game breadcrumb:", item);
            const result = item.data as GameFinishResult;
            console.log("🔍 Parsed result:", result);
            setIsGameActive(false);
            onGameFinish?.(result);
            setProcessedItemIds((prev) => new Set(prev).add(item.itemId));
          } catch (e) {
            console.error("Failed to parse pitch-startup game finish result:", e);
          }
        }
      }
    }
  }, [transcriptItems, onGameStart, onGameFinish, processedItemIds, gameType]);

  const startGame = useCallback(() => {
    if (!sendUserText) {
      console.error(
        "sendUserText not available - is realtime session connected?"
      );
      return;
    }

    if (!isWebRTCReady) {
      console.log("WebRTC not ready yet, waiting...");
      return;
    }

    // Send a message to trigger the game host agent to start the appropriate game
    const gameMessages = {
      "save-their-soul":
        "Hello! I'm ready to play Save Their Soul. Please start the game!",
      "pitch-startup":
        "Hello! I'm ready to play Pitch Startup. Please start the game!",
      "excuse-the-boss":
        "Hello! I'm ready to play Excuse for the Boss. Please start the game (call the tool start_boss_excuse_game)!",
      "attract-the-turkey":
        "Hello! I'm ready to play Attract the Turkey. Please start the game (call the tool start_turkey_attraction_game)!",
      "pwn-the-bully":
        "Hello! I'm ready to play Pwn the Bully. Please start the game (call the tool start_bully_pwn_game)!",
      "explain-death":
        "Hello! I'm ready to play Explain Death. Please start the game (call the tool start_death_explanation_game)!",
      "advise-the-child":
        "Hello! I'm ready to play Advise the Child. Please start the game (call the tool start_child_advice_game)!",
      "stall-the-police":
        "Hello! I'm ready to play Stall the Police. Please start the game (call the tool start_police_stall_game)!",
      "convince-the-aliens":
        "Hello! I'm ready to play Convince the Aliens. Please start the game (call the tool start_alien_convince_game)!",
      "evaluate-yourself":
        "Hello! I'm ready to play Evaluate Yourself. Please start the game (call the tool start_self_evaluation_game)!",
      "point-the-task":
        "Hello! I'm ready to play Point the Engineering Task. Please start the game (call the tool start_point_task_game)!",
      "sell-the-lemon":
        "Hello! I'm ready to play Sell the Lemon. Please start the game (call the tool start_lemon_sale_game)!",
    };

    sendUserText(gameMessages[gameType]);
  }, [sendUserText, isWebRTCReady, gameType]);

  const sendPlayerText = useCallback(
    (text: string) => {
      if (!sendUserText) {
        console.error(
          "sendUserText not available - is realtime session connected?"
        );
        return;
      }

      if (!isWebRTCReady) {
        console.error("WebRTC not ready - cannot send player text");
        return;
      }

      sendUserText(text);
    },
    [sendUserText, isWebRTCReady]
  );

  return {
    startGame,
    sendPlayerText,
    isGameActive,
    currentScenario,
  };
}
