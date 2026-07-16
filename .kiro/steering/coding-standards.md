---
inclusion: auto
---

# Coding Standards

## TypeScript

- Strict mode enabled: `strict`, `noImplicitReturns`, `noUncheckedIndexedAccess`
- No `any` types — use proper typing or `unknown` with narrowing
- Use `const` by default, `let` only when reassignment is needed
- Prefer interfaces over type aliases for object shapes
- Use `import type` for type-only imports

## React

- React is the UI shell ONLY — never drives the game loop
- No per-frame React state updates — use refs for game data
- Functional components only, no class components
- Props interfaces defined above each component
- Use `useCallback` for callbacks passed to children
- Use `useRef` to bridge game loop data into React without re-renders

## Canvas / Game Loop

- All game logic must be frame-rate independent using deltaTime
- Cap deltaTime to 100ms to prevent physics tunneling
- Never call `setState` from inside the game loop
- Keep pure logic (collision, scoring, mapping) in separate modules from rendering
- Each module has a single responsibility

## File Organization

- `src/audio/` — microphone capture, pitch detection, calibration, ambient music
- `src/game/` — game state, obstacles, collision, scoring, game loop, seeded RNG
- `src/rendering/` — Canvas 2D renderer (background, plane, obstacles, effects)
- `src/ui/` — React components (screens, HUD, canvas wrapper)

## Naming Conventions

- Files: PascalCase for classes/components (`AudioCapture.ts`, `StartScreen.tsx`)
- Interfaces: PascalCase, no `I` prefix (`GameState`, not `IGameState`)
- Constants: UPPER_SNAKE_CASE in config objects (`SCROLL_SPEED`, `MIN_FREQUENCY`)
- Functions: camelCase (`checkObstacleCollision`, `createSeededRNG`)
- CSS classes: BEM-style (`calibration-screen__title`, `btn--primary`)

## Error Handling

- Wrap all localStorage access in try/catch (private browsing fallback)
- Wrap all Web Audio API calls with capability checks
- Never let an unhandled error crash the game loop
- Show user-friendly messages for microphone/browser errors

## Performance

- Target 30+ fps with up to 10 obstacles visible
- Pitch detection latency under 50ms
- Remove off-screen obstacles immediately (no memory leaks)
- Use object pooling patterns if garbage collection causes frame drops
