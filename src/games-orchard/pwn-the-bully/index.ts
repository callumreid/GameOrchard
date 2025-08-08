import { GameMetadata } from "../types";

import GameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "pwn-the-bully",
  name: "Pwn the Bully",
  description: "A mean bully calls you a 'buttered up slug chump' and you must deliver the perfect comeback to totally pwn them and regain your power.",
  category: "social",
  difficulty: 3,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default GameComponent;