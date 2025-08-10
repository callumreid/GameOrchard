import { GameMetadata } from "../types";
import StallThePoliceGameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "stall-the-police",
  name: "Stall The Police",
  description: "Convince the police officer to leave after they respond to a noise complaint",
  category: "social",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default StallThePoliceGameComponent;