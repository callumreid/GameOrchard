import { GameMetadata } from "../types";

import GameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "attract-the-turkey",
  name: "Attract the Turkey",
  description: "Thanksgiving is 3 days away! Squat in the leaves and gobble charismatically to lure a bashful wild turkey out of hiding with your irresistible vocal charisma.",
  category: "entertainment",
  difficulty: 3,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default GameComponent;