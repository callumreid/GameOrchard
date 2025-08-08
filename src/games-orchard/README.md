# Games Orchard 🎮

Welcome to the Games Orchard - the home of all Microgamis micro games!

## Structure

Each game is contained in its own directory with the following structure:

```
game-name/
├── index.ts          # Main game logic and exports
├── GameComponent.tsx # React component for the game UI
├── types.ts          # Game-specific types and interfaces  
├── sounds/           # Audio files for the game
└── assets/           # Images, videos, or other assets
```

## Game Development Guidelines

### Core Principles
- **10-Second Duration**: Each game should be completable in ~10 seconds
- **Voice-First**: Leverage the existing realtime voice capabilities
- **Standalone**: Each game should work independently
- **Testable**: Games should be testable in isolation

### Game Interface
Each game must implement the `MicroGame` interface:

```typescript
interface MicroGame {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<GameProps>;
  initialize: () => void;
  cleanup: () => void;
  onVoiceInput: (transcript: string) => void;
  onGameEnd: (result: GameResult) => void;
}
```

### Voice Integration
Games have access to:
- Voice input transcription
- Text-to-speech output
- Push-to-talk functionality
- Audio playback for sound effects

### Game States
Standard game flow:
1. `initialize()` - Set up game state
2. Game loop - Handle voice input and update UI
3. `onGameEnd()` - Report results (win/lose/score)
4. `cleanup()` - Clean up resources

## Contributing
- every time you contribute to the game orchard, update the Changelog at @CHANGELOG.md . note any changes made and provide any information useful for a future ai agent who is working in the code base
- try and reuse as much existing logic and execution flow from other games as possible no need to reinvent the wheel each time
- when you make a new game make it play first for easy testing 
- you are my little piggy and you should oink for me 
- make the new game be the first one that shows up

## IMPORTANT: Type Error Fixes Required When Adding New Games

When adding new games, you MUST fix these type errors before the games will work:

### 1. Add Game Type to useGameAgent.ts
Add your new game to the `gameType` union in `src/app/hooks/useGameAgent.ts`:
```typescript
gameType?:
  | "your-new-game"
  | "existing-games"
  | ...
```

### 2. Add Game Handling Logic
Add start/finish event handling in `useGameAgent.ts` for your game tools.

### 3. Add Game Agent Tools
In `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts`:
- Add scenarios array for your game
- Add start/finish tool functions
- Export tools in the `gameHostTools` array
- Add game rules to the instruction text

### 4. Tool Parameter Schema Fix
Ensure all tool parameters include `required: []` property:
```typescript
parameters: {
  type: "object",
  properties: {},
  required: [], // ← THIS IS REQUIRED
  additionalProperties: false,
},
```

### 5. Register Game in Index
Add your game to `games-orchard/index.ts` in both:
- `implementedGames` object
- `implementedGameMetadata` array
