export interface GameResult {
  success: boolean;
  score?: number;
  message?: string;
  timeElapsed?: number;
}

export interface GameProps {
  onGameEnd: (result: GameResult) => void;
  sendPlayerText?: (text: string) => void;
  playSound?: (soundId: string) => void;
  isPTTUserSpeaking?: boolean;
}

export interface MicroGame {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<GameProps>;
  initialize: () => void;
  cleanup: () => void;
  onVoiceInput: (transcript: string) => void;
  onGameEnd: (result: GameResult) => void;
}

export interface GameState {
  status: "waiting" | "playing" | "completed" | "failed";
  timeRemaining: number;
  score: number;
  message: string;
}

export type GameCategory =
  | "social"
  | "recognition"
  | "decision"
  | "action"
  | "counting"
  | "creative"
  | "corporate"
  | "self-improvement"
  | "entertainment"
  | "education"
  | "health"
  | "family"
  | "sports"
  | "travel"
  | "technology"
  | "science"
  | "art"
  | "music"
  | "meta"
  | "other";

export interface GameMetadata {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  requiresVoice: boolean;
  requiresAudio: boolean;
  estimatedDuration: number; // in seconds
}
