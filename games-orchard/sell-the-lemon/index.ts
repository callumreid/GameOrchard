import { GameMetadata } from "../types";
import SellTheLemonGameComponent from "./GameComponent";

export const metadata: GameMetadata = {
  id: "sell-the-lemon",
  name: "Sell The Lemon",
  description:
    "You're a sleazy car dealer trying to sell a defective car to a distressed single mother",
  category: "social",
  difficulty: 4,
  requiresVoice: true,
  requiresAudio: true,
  estimatedDuration: 30,
};

export default SellTheLemonGameComponent;
