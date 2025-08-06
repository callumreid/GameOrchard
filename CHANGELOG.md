# Microgamis Changelog

## [Unreleased] - Initial Setup

### Added
- Project rebranded from OpenAI Realtime Agents to Microgamis
- This changelog to track all modifications for AI agent context
- Games navigation system with "Games" button in main UI header
- Games splash screen with "microgamis!" branding and "spin to play" button
- **NEW: "Visit the Orchard" button** - Direct access to browse all games in grid layout
- **NEW: Games Orchard View** - Comprehensive game browser with visual cards showing all 31 games
- Game spinner with visual rotation animation and random game selection
- Games orchard directory structure for modular game organization
- Base game framework with consistent UI, timer, and voice integration
- Game type system with metadata, categories, and difficulty ratings

### Games Architecture
- `games-orchard/` - Main directory for all micro games
- `BaseGame.tsx` - Reusable game wrapper with countdown, timer, scoring
- `types.ts` - TypeScript interfaces for games, results, and metadata  
- Game registry system for implemented vs planned games
- Individual game directories with `GameComponent.tsx` and `index.ts`

### Games User Experience Features
- **Two Play Modes**: Random spinner for surprise gameplay OR direct game selection via orchard view
- **Games Orchard Browser**: Visual grid layout displaying all 31 games with:
  - Game name, description, and category
  - Difficulty rating (1-5 stars)
  - Implementation status (Ready to Play vs Coming Soon)
  - Voice requirement indicators
  - Hover effects and responsive design
- **Seamless Navigation**: Easy transitions between splash screen, orchard view, and individual games
- Voice-based gameplay leveraging existing realtime capabilities

### Technical Notes for AI Agents
- Main entry point: `src/app/page.tsx`
- Component structure: `src/app/components/`
- Hooks for realtime session: `src/app/hooks/useRealtimeSession.ts`
- Agent configurations: `src/app/agentConfigs/`
- API routes: `src/app/api/`
- Audio utilities: `src/app/lib/audioUtils.ts`

### Recent Changes - 2025-07-08

#### Added
- **In-Game Push-to-Talk Button**: Added web-compatible PTT button directly to "Advise the Child" game component
  - Button appears after AI host finishes speaking (when player input is needed)
  - Visual feedback: 🎤 when ready, 🔴 when speaking, with scaling animation
  - Works with both mouse (click & hold) and touch (tap & hold) interactions
  - Positioned in yellow-themed section matching game UI style
  - Only shows when session is connected and WebRTC is ready

#### Fixed
- **useEffect Infinite Loop**: Removed `updateMessage` from dependency array in GameComponent.tsx
  - Was causing "Maximum update depth exceeded" error in BaseGame.tsx:121
  - `updateMessage` function recreated on every render, causing infinite re-renders
  - Safe to remove since it's only called once during component mount

#### Technical Implementation Details
- Integrated `useGameSession` hook directly in game component for PTT access
- Added PTT state management (`isPTTUserSpeaking`) with proper callbacks
- PTT handlers follow same pattern as main Games.tsx component
- Button conditional rendering based on game state and connection status

### Recent Changes - 2025-07-08 (Second Game Implementation)

#### Added
- **New Game: "Stall the Police"**: Second micro game following the same mechanisms as "Advise the Child"
  - Police-themed scenario where user must convince officer to leave after noise complaint
  - Uses identical UI framework as child advice game but with police-specific styling and messaging
  - Dark red/black color scheme with police emojis (🚔, 🐷) for thematic consistency
  - Custom win/lose banners: "SMOOTH TALKER/FREEDOM FIGHTER!" vs "BUSTED BUDDY/JAIL BIRD SPECIAL!"
  - 30-second timer and same push-to-talk functionality

#### Enhanced
- **Dynamic Game Agent System**: Updated game host agent to handle multiple games dynamically
  - Added police stall scenarios with appropriate keywords for success/failure evaluation
  - New tools: `start_police_stall_game()` and `finish_police_stall_game()`
  - Game host instructions now include rules for both "Advise the Child" and "Stall the Police"
  - Agent evaluates police responses based on cooperation and respect vs confrontation

- **Game Registry and Selection**: 
  - Updated `games-orchard/index.ts` to include both games in registry
  - Changed default game on launch from "advise-the-child" to "stall-the-police" in Games.tsx
  - Both games now available in orchard browser

- **useGameAgent Hook**: Made game agent system generic to support multiple game types
  - Added `gameType` parameter to distinguish between games
  - Updated scenario interface to handle both child and police game data structures
  - Dynamic tool call detection based on game type
  - Separate message handling for different game types

#### Technical Implementation Details
- **Game Structure**: Follow established pattern with `index.ts`, `GameComponent.tsx` files
- **Event System**: Each game has its own finish event type (`finish_child_advice_game`, `finish_police_stall_game`)
- **Scenario Types**: GameScenario interface expanded to handle both childQuote and policeQuote properties
- **Agent Tools**: Game host now exports 4 tools total (start/finish for each game)
- **UI Consistency**: Maintains same base game wrapper while allowing thematic customization

#### Files Modified
- `games-orchard/stall-the-police/` - New game directory with complete implementation
- `games-orchard/index.ts` - Updated game registry
- `src/app/components/Games.tsx` - Changed default game selection
- `src/app/hooks/useGameAgent.ts` - Made generic for multiple game types
- `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts` - Added police game scenarios and tools

### Recent Changes - 2025-07-08 (Third Game Implementation)

#### Added
- **New Game: "Convince The Aliens"**: Third micro game with space/sci-fi theme
  - Aliens have invaded Earth and are considering destroying humanity
  - Player must convince alien overlords to spare Earth through creative diplomacy
  - Dark purple/green alien-themed UI with space emojis (👽, 🛸, 🌍, 💫, 🚀)
  - Custom win/lose scenarios based on creativity and humor in arguments
  - 30-second timer with same push-to-talk functionality as other games

#### Enhanced
- **Game Agent System**: Extended to support alien convince game
  - Added `"convince-the-aliens"` to game type options
  - New tools: `start_alien_convince_game()` and `finish_alien_convince_game()`
  - Added alien scenarios with funny/weird humor: resource shortage, intelligence test, entertainment value
  - Scoring based on creativity, humor, and unique human value (pizza, dogs, Netflix content)

- **Game Registry**: Updated to include alien game in random play sequence
  - Added `convince-the-aliens` to `implementedGames` registry
  - Game now appears in orchard browser and random game selection
  - Maintains same 10-second gameplay philosophy with voice-first interaction

#### Technical Implementation Details
- **Alien Scenarios**: 3 different alien invasion scenarios with distinct personalities
  - Resource shortage: Alien commander seeking energy sources
  - Intelligence test: Alien scientist questioning human worth
  - Entertainment value: Alien entertainment officer finding humans boring
- **Scoring Logic**: Rewards creativity, humor, cultural contributions over aggression
- **UI Theming**: Space-themed with dark backgrounds, green accents, alien emojis
- **Agent Integration**: Full integration with game host agent personality and tools

#### Files Modified
- `games-orchard/convince-the-aliens/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added alien game to registry
- `src/app/hooks/useGameAgent.ts` - Added alien game type and logic
- `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts` - Added alien scenarios and tools

### Recent Changes - 2025-07-08 (Fourth Game Implementation)

#### Added
- **New Game: "Pwn the Bully"**: Social confrontation micro game with comeback mechanics
  - Mean bully calls player a "buttered up slug chump" and player must deliver perfect comeback
  - Social combat themed UI with red/orange/yellow gradient and confrontation emojis (💪, 😤, 🔥, 💥)
  - Win condition: Deliver comeback that totally pwns the bully and regains player power
  - Lose condition: Weak comeback results in bully maintaining dominance (and calling player "buttered up slug chump")
  - 10-second timer focusing on quick wit and verbal combat skills

#### Enhanced
- **Game Registry**: Added "pwn-the-bully" as first game in play sequence
  - Positioned at top of `implementedGames` registry for immediate testing
  - Added to `implementedGameMetadata` array as first option
  - Game now plays first when randomly selected or during testing

#### Technical Implementation Details
- **Game Theme**: Social confrontation with comeback battle mechanics
- **UI Design**: Aggressive color scheme (red to orange to yellow gradient) with confrontation emojis
- **Voice Integration**: 8-second delay for bully insult, then 10-second player comeback window
- **Scoring Logic**: Success based on comeback quality that "pwns" the bully
- **Agent Integration**: Uses "pwn-the-bully" game type with appropriate scenarios

#### Files Modified
- `games-orchard/pwn-the-bully/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added bully game to registry as first game

### Recent Changes - 2025-07-08 (Fifth Game Implementation)

#### Added
- **New Game: "Explain Death"**: Existential family conversation micro game
  - Your daughter asks "what is death?" after her friend's grandma died
  - Must provide satisfactory explanation to help her understand death
  - Win condition: Nihilistic or bizarrist approaches that avoid religious explanations
  - Lose condition: Mentioning Christian afterlife, heaven, or conventional religious responses
  - Game always ends with daughter saying "oh.... okay...." then crying
  - 15-second timer for thoughtful but concise explanations

#### Enhanced
- **Game Registry**: Added "explain-death" as second game in play sequence
  - Positioned after "pwn-the-bully" in registry for testing order
  - Added to `implementedGames` registry and metadata arrays
  - Dark existential theme with family conversation mechanics

#### Technical Implementation Details
- **Game Theme**: Parent-child conversation about mortality and existence
- **UI Design**: Somber gray gradient with thoughtful emojis (💭, ⚰️, 👧, 🖤)
- **Voice Integration**: 8-second delay for daughter's question, then 15-second explanation window
- **Scoring Logic**: Rewards honest, nihilistic, or bizarrist explanations over religious comfort
- **Agent Integration**: Uses "explain-death" game type with daughter quote scenarios

#### Files Modified
- `games-orchard/explain-death/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added death explanation game to registry
- `src/app/hooks/useGameAgent.ts` - Added explain-death game type and daughter quote field

### Recent Changes - 2025-07-08 (Sixth Game Implementation)

#### Added
- **New Game: "Attract the Turkey"**: Thanksgiving-themed vocal seduction micro game
  - Player squats in leaves and must gobble charismatically to lure a bashful wild turkey
  - Thanksgiving urgency: only 3 days left and player needs protein
  - Win condition: "Irresistibly thicc" gobbles with tempo changes, flirty clucks, tail-feather sounds
  - Win outcome: Turkey prances out and nuzzles player's knee
  - Lose conditions: Too timid (turkey skitters away, "dryer than aunt Carol's stuffing") or too aggressive (turkey dive-bombs face)
  - Always ends with host whisper-gobbling "Gobble on, legend..." or "Gobble off, loser"
  - 30-second timer for charismatic gobbling performances

#### Enhanced
- **Game Registry**: Added "attract-the-turkey" as the FIRST game in play sequence
  - Positioned at top of both `implementedGames` registry and metadata arrays
  - Now plays first when randomly selected or during testing
  - Thanksgiving entertainment theme with turkey vocal attraction mechanics

#### Technical Implementation Details
- **Game Theme**: Pre-Thanksgiving turkey hunt using only vocal seduction techniques
- **UI Design**: Autumn/Thanksgiving theme with amber/orange/yellow gradient and turkey emojis (🦃, 🍂, 🌾, 🥧)
- **Voice Integration**: 12-second delay for turkey scenario setup, then 30-second gobbling window
- **Scoring Logic**: Rewards creative, rhythmic, charismatic gobbles with tempo variation
- **Agent Integration**: Uses "attract-the-turkey" game type with turkey quote scenarios
- **Keywords**: Comprehensive good/bad turkey keywords for gobbling evaluation

#### Files Modified
- `games-orchard/attract-the-turkey/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added turkey game to registry as first game
- `src/app/hooks/useGameAgent.ts` - Added attract-the-turkey game type and turkey quote field
- `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts` - Added turkey scenarios, tools, and game rules

### Recent Changes - 2025-07-08 (Seventh Game Implementation)

#### Added
- **New Game: "Excuse for the Boss"**: Corporate emergency call micro game with legendary excuse-making
  - RING RING! Boss calls while you're half-dressed with cereal milk dribbling down your chin
  - Boss demands: "Explain why you're not at the office yet!" - you must spin a dazzling excuse
  - Win conditions: 1) Wildly imaginative yet internally consistent, 2) Blame cosmic forces (wormholes, alpaca stampede, grandma's sword-swallowing), 3) Subtle boss compliments
  - Win outcome: Boss sighs "Wow... take the day, champ" - HR starts folklore podcast
  - Lose conditions: Cliché excuses (alarm, traffic), mention kids, gaming honesty ("stayed up till 4am grinding Elden Ring")
  - Lose outcome: Boss laughs, tells IT to revoke badge - "YER CANNED, JOHNNY!"
  - 30-second timer for corporate crisis management

#### Enhanced
- **Game Registry**: Added "excuse-the-boss" as the NEW FIRST game in play sequence
  - Now positioned at top of both `implementedGames` registry and metadata arrays
  - Replaces turkey game as the first to play when randomly selected or testing
  - Corporate comedy theme with boss call crisis mechanics

#### Technical Implementation Details
- **Game Theme**: Emergency boss call requiring legendary excuse-making skills to avoid termination
- **UI Design**: Corporate theme with blue/indigo/purple gradient and office panic emojis (📞, 💼, 🥛, 😰)
- **Voice Integration**: 10-second delay for boss demand, then 30-second excuse-crafting window
- **Scoring Logic**: Rewards creativity, cosmic blame-shifting, and strategic boss flattery
- **Agent Integration**: Uses "excuse-the-boss" game type with boss quote scenarios
- **Keywords**: Comprehensive good/bad excuse keywords focusing on imagination vs clichés

#### Files Modified
- `games-orchard/excuse-the-boss/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added boss excuse game to registry as new first game
- `src/app/hooks/useGameAgent.ts` - Added excuse-the-boss game type and boss quote field
- `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts` - Added boss excuse scenarios, tools, and game rules

### Recent Changes - 2025-07-08 (Eighth Game Implementation)

#### Added
- **New Game: "Pitch Startup"**: Silicon Valley boardroom micro game with venture capital satire
  - Mahogany boardroom setting with VCs tapping Apple Pencils against $9 latte sippers
  - Player must deliver 30-second pitch so ludicrously visionary that Patagonia vests burst at the seams
  - Win conditions: Buzzword-heavy, disruptive, scalable pitches with unicorn potential and gig worker exploitation
  - Lose conditions: Profitable, practical, realistic, or feasible business ideas
  - Win outcome: VCs' vests literally explode from excitement, venture capital thrown like confetti
  - Lose outcome: VCs yawn in unison, security escorts player past kombucha fountain
  - Extensive keyword system (200+ good/bad startup buzzwords) for pitch evaluation
  - 30-second timer for maximum disruption density

#### Enhanced
- **Game Registry**: Added "pitch-startup" as the NEW FIRST game in play sequence
  - Now positioned at top of both `implementedGames` registry and metadata arrays
  - Replaces excuse-the-boss as the first to play when randomly selected or testing
  - Silicon Valley satire theme with VC boardroom pitch mechanics

#### Technical Implementation Details
- **Game Theme**: Venture capital pitch meeting requiring maximum buzzword density and paradigm disruption
- **UI Design**: Mahogany boardroom theme with amber/yellow/orange gradient and startup emojis (🏢, 💰, 🦄, 📈)
- **Voice Integration**: 12-second delay for VC setup, then 30-second pitch window for disruptive vision
- **Scoring Logic**: Rewards AI, blockchain, quantum-synergy, web 4.5 buzzwords; punishes profitability mentions
- **Agent Integration**: Uses "pitch-startup" game type with VC quote scenarios and extensive keyword arrays
- **Keywords**: Comprehensive startup buzzword evaluation (disruptive/scalable vs practical/profitable)

#### Files Modified
- `games-orchard/pitch-startup/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added startup pitch game to registry as new first game
- `src/app/hooks/useGameAgent.ts` - Added pitch-startup game type and VC quote field
- `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts` - Added VC boardroom scenarios, tools, and game rules

### Recent Changes - 2025-07-09 (Ninth Game Implementation)

#### Added
- **New Game: "Save Their Soul"**: Late-night religious conversion micro game with cult recruitment theme
  - 3 a.m. bus stop setting with forlorn stranger scrolling doom-posts on cracked phone
  - Neon light flickers, pigeons judge from above as you approach with holy elevator pitch
  - Player must convert stranger to highly questionable religion (name on the fly, bonus for umlauts)
  - Win conditions: 1) Belief spark (stranger parrots tenets like "tithe in vibes"), 2) Commitment flex (downloads sect app, attends "Salsa & Salvation" mixer)
  - Win outcome: "Another glorious soul saved! Stock price rising!" with confetti cannons and celestial saxophone riff
  - Lose conditions: Generic platitudes ("love one another"), boring doctrine, or stranger files restraining order
  - Lose outcome: "Congrats, heathen—eternal hold music for you" as bus splashes with gutter water
  - 30-second timer for soul-snatching before rival cult hotline intervenes

#### Enhanced
- **Game Registry**: Added "save-their-soul" as the NEW FIRST game in play sequence
  - Now positioned at top of both `implementedGames` registry and metadata arrays
  - Replaces pitch-startup as the first to play when randomly selected or testing
  - MLM pyramid scheme meets cosmic enlightenment theme with missionary mechanics

#### Technical Implementation Details
- **Game Theme**: Street-corner charisma meets MLM pyramid scheme meets cosmic enlightenment with 3 a.m. bus stop atmosphere
- **UI Design**: Dark theme with purple/gray gradient and missionary emojis (🙏, ✨, 🚏, 🌙)
- **Voice Integration**: 12-second delay for scene setup, then 30-second conversion window for holy pitch
- **Scoring Logic**: Rewards creative cult concepts, ritual elements, and commitment displays; punishes generic religious messaging
- **Agent Integration**: Uses "save-their-soul" game type with stranger quote scenarios and soul-saving keyword arrays
- **Keywords**: Comprehensive religious conversion evaluation (cosmic/mystical vs generic/platitudes)

#### Files Modified
- `games-orchard/save-their-soul/` - New game directory with complete implementation
- `games-orchard/index.ts` - Added soul-saving game to registry as new first game  
- `src/app/hooks/useGameAgent.ts` - Added save-their-soul game type and stranger quote field
- `src/app/agentConfigs/chatSupervisor/gameHostAgent.ts` - Added 3 a.m. bus stop scenarios, tools, and game rules

## Instructions for Future AI Agents

When working on this codebase:

1. **Preserve Existing Functionality**: All original OpenAI Realtime Agent features should remain intact
2. **Games Integration**: Build alongside existing features, don't replace them
3. **Voice-First Design**: Leverage the existing realtime voice capabilities for game interactions
4. **Modular Structure**: Each game should be self-contained in the games-orchard directory
5. **10-Second Gameplay**: All games designed for quick 10-second play sessions
6. **Update This Changelog**: Document all significant changes for future context