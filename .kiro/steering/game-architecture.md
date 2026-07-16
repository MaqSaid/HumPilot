---
inclusion: fileMatch
fileMatchPattern: "src/**/*.ts,src/**/*.tsx"
---

# Game Architecture Rules

## Separation of Concerns

When working on source files, enforce these boundaries:

### Audio Pipeline (`src/audio/`)
- Owns microphone access, pitch detection, calibration, ambient music
- Never imports from `src/rendering/` or `src/ui/`
- Exports pure data (frequency numbers, calibration data) — no DOM or canvas references

### Game Core (`src/game/`)
- Owns game state, physics, obstacles, collision, scoring, game loop
- Never imports from `src/rendering/` or `src/ui/`
- All functions must be pure where possible (given inputs → deterministic outputs)
- Frame-rate independence via deltaTime parameter

### Rendering (`src/rendering/`)
- Owns Canvas 2D drawing only
- May import from `src/game/` (reads GameState, config)
- Never imports from `src/audio/` or `src/ui/`
- Never mutates game state — only reads and draws

### UI Shell (`src/ui/`)
- Owns React components and CSS
- May import from any layer (wires everything together)
- But must NOT contain game logic — delegate to game modules
- Canvas game loop lives in a `useEffect`, communicates via refs

## Key Rules

- The Renderer receives a GameState snapshot and draws it. It does not update state.
- The GameLoop calls update functions, then calls Renderer. One direction only.
- React components never call requestAnimationFrame directly — GameCanvas wraps it.
- PitchMapper is the ONLY module that converts frequency to altitude.
- CollisionDetector is the ONLY module that determines game-over from physics.
- ScoreTracker is the ONLY module that computes and persists scores.
