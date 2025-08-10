import { GameMetadata } from "../types";
import AdviseTheChildGameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "advise-the-child",
  name: "Advise The Child",
  description: "Give helpful advice to a child facing a difficult situation",
  category: "social",
  difficulty: 3,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default AdviseTheChildGameComponent;
