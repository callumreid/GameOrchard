import { RealtimeAgent } from "@openai/agents/realtime";
import { gameHostTools } from "../chatSupervisor/gameHostAgent";
import { getBasePrompt } from "../chatSupervisor/prompts";

// Create a standalone game host agent (not part of chat supervisor handoff chain)
const gameHostAgent = new RealtimeAgent({
  name: "gameHost",
  instructions: getBasePrompt(),
  tools: gameHostTools,
});

// Export the game host scenario with only the game host agent
export const gameHostScenario: RealtimeAgent[] = [gameHostAgent];

// Default export for convenience
export const defaultGameAgentSet = gameHostScenario;
