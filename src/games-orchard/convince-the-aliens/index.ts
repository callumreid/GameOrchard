import { GameMetadata } from "../types";
import ConvinceTheAliensGameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "convince-the-aliens",
  name: "Convince The Aliens",
  description: "Convince alien invaders not to destroy Earth and humanity",
  category: "social",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default ConvinceTheAliensGameComponent;