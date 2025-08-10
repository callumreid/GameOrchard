import { GameMetadata } from "../types";
import EvaluateYourselfGameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "evaluate-yourself",
  name: "Evaluate Yourself",
  description: "Complete your quarterly self-evaluation and face the brutal corporate reality",
  category: "social",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default EvaluateYourselfGameComponent;