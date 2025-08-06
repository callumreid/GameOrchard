// Import JSON files directly - these will be bundled at build time
import gameHostBaseJson from "./gameHostBase.json";
import excuseTheBossJson from "./excuse-the-boss.json";
import attractTheTurkeyJson from "./attract-the-turkey.json";
import pwnTheBullyJson from "./pwn-the-bully.json";
import explainDeathJson from "./explain-death.json";
import adviseTheChildJson from "./advise-the-child.json";
import stallThePoliceJson from "./stall-the-police.json";
import convinceTheAliensJson from "./convince-the-aliens.json";
import evaluateYourselfJson from "./evaluate-yourself.json";
import pointTheTaskJson from "./point-the-task.json";
import sellTheLemonJson from "./sell-the-lemon.json";

// Game-specific prompts map
const gamePrompts: Record<string, string> = {
  "excuse-the-boss": excuseTheBossJson.content,
  "attract-the-turkey": attractTheTurkeyJson.content,
  "pwn-the-bully": pwnTheBullyJson.content,
  "explain-death": explainDeathJson.content,
  "advise-the-child": adviseTheChildJson.content,
  "stall-the-police": stallThePoliceJson.content,
  "convince-the-aliens": convinceTheAliensJson.content,
  "evaluate-yourself": evaluateYourselfJson.content,
  "point-the-task": pointTheTaskJson.content,
  "sell-the-lemon": sellTheLemonJson.content,
};

export function getBasePrompt(): string {
  return gameHostBaseJson.content;
}

export function getGamePrompt(gameKey: string): string {
  const prompt = gamePrompts[gameKey];
  if (!prompt) {
    throw new Error(`Game prompt not found for key: ${gameKey}`);
  }
  return prompt;
}

export function buildGameInstruction(gameKey: string): string {
  const base = getBasePrompt();
  const game = getGamePrompt(gameKey);
  return `${base}\n\n${game}`;
}

// Game key mapping for convenience
export const GAME_KEYS = {
  EXCUSE_THE_BOSS: "excuse-the-boss",
  ATTRACT_THE_TURKEY: "attract-the-turkey",
  PWN_THE_BULLY: "pwn-the-bully",
  EXPLAIN_DEATH: "explain-death",
  ADVISE_THE_CHILD: "advise-the-child",
  STALL_THE_POLICE: "stall-the-police",
  CONVINCE_THE_ALIENS: "convince-the-aliens",
  EVALUATE_YOURSELF: "evaluate-yourself",
  POINT_THE_TASK: "point-the-task",
  SELL_THE_LEMON: "sell-the-lemon",
} as const;

export type GameKey = (typeof GAME_KEYS)[keyof typeof GAME_KEYS];
