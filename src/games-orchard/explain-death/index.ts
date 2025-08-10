import { GameMetadata } from "../types";

import GameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "explain-death",
  name: "Explain Death",
  description: "Your daughter asks 'what is death?' after her friend's grandma died. Give her a satisfactory explanation. Win by being nihilistic or bizarrist, lose if you mention heaven/afterlife.",
  category: "family",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default GameComponent;