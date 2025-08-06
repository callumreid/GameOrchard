import { RealtimeAgent } from "@openai/agents/realtime";
import { gameHostTools } from "./gameHostAgent";
import { getBasePrompt } from "./prompts";

// Create agent with base instructions - game-specific instructions are loaded dynamically
export const chatAgent = new RealtimeAgent({
  name: "gameHostAgent",
  voice: "sage",
  instructions: getBasePrompt(),
  tools: gameHostTools,
});

export const chatSupervisorScenario = [chatAgent];

// Name of the company represented by this agent set. Used by guardrails
export const chatSupervisorCompanyName = "Microgamis";

export default chatSupervisorScenario;
