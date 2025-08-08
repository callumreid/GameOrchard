import { GameMetadata } from "../types";

import GameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "point-the-task",
  name: "Point the Engineering Task",
  description: "Participate in a soul-crushing engineering refinement meeting where you must 'point' absurd product requirements using the fibonacci sequence. The secret: everything is always 2 points.",
  category: "corporate",
  difficulty: 2,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default GameComponent;