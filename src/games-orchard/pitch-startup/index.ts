import PitchStartupGameComponent from "./GameComponent";
import { GameMetadata } from "../types";

export const metadata: GameMetadata = {
  id: "pitch-startup",
  name: "Pitch Startup",
  description: "Mahogany boardroom. VCs tapping Apple Pencils. You have 30 seconds to pitch a startup so ludicrously visionary that their Patagonia vests burst at the seams.",
  category: "corporate",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default PitchStartupGameComponent;