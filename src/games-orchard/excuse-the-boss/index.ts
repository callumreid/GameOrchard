import { GameMetadata } from "../types";

import GameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "excuse-the-boss",
  name: "Excuse for the Boss",
  description: "RING RING! Your boss calls while you're half-dressed with cereal milk on your chin. Spin an excuse so dazzling that HR starts a folklore podcast about it.",
  category: "corporate",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default GameComponent;