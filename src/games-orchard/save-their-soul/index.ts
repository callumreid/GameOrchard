import SaveTheirSoulGameComponent from "./GameComponent";
import { GameMetadata } from "../types";

export const metadata: GameMetadata = {
  id: "save-their-soul",
  name: "Save Their Soul",
  description: "A forlorn stranger slumps on a wobbly bus-stop bench at 3 a.m., scrolling doom-posts on a cracked phone. Armed with nothing but your holy elevator pitch, you must convert them to your highly questionable religion.",
  category: "social",
  difficulty: 3,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default SaveTheirSoulGameComponent;