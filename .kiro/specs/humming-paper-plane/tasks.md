# Implementation Plan: Humming Paper Plane

## Overview

Implement a browser-based game where the player controls a paper plane's altitude by humming into their microphone. The game uses Vite + TypeScript + React (thin UI shell) with HTML5 Canvas 2D for rendering. The audio pipeline uses the Web Audio API with the `pitchy` npm package for pitch detection. The visual style features a sky gradient background with parallax layers, a white paper plane with tilt animation and trail, cloud-style obstacles, and engagement effects (screen shake, score pop, progressive sky color).

## Tasks

- [ ] 1. Set up project structure, tooling, and core interfaces
  - [ ] 1.1 Initialize Vite + TypeScript + React project with core dependencies
    - Initialize project with `npm create vite@latest` using React + TypeScript template
    - Install dependencies: `pitchy`, `fast-check` (dev), `vitest` (dev), `playwright` (dev)
    - Configure Vitest in `vite.config.ts`
    - Create directory structure: `src/audio/`, `src/game/`, `src/rendering/`, `src/components/`, `src/types/`
    - _Requirements: 10.3_

  - [ ] 1.2 Define core TypeScript interfaces and constants
    - Create `src/types/interfaces.ts` with all interfaces: `AudioCapture`, `PitchResult`, `PitchDetection`, `PitchMapper`, `GameState`, `Obstacle`, `DifficultyConfig`, `AABB`, `CollisionDetector`, `ScoreTracker`, `Renderer`, `GameLoop`
    - Create `src/types/constants.ts` with `GAME_CONFIG` object including all visual, physics, audio, scoring, and engagement constants (PLANE_TILT_MAX_DEG, TRAIL_LENGTH, SCORE_POP_INTERVAL, SCORE_POP_DURATION, SCREEN_SHAKE_DURATION, SCREEN_SHAKE_INTENSITY, SKY_TOP_COLOR, SKY_BOTTOM_COLOR, PLANE_COLOR, PLANE_FOLD_COLOR, OBSTACLE_FILL_COLOR, OBSTACLE_EDGE_COLOR, HILL_COLOR, TREE_COLOR, HUD_TEXT_COLOR, SCORE_POP_COLOR, INITIAL_SPAWN_INTERVAL: 4)
    - _Requirements: 4.1, 5.2, 9.5_

- [ ] 2. Implement audio pipeline
  - [ ] 2.1 Implement AudioCapture module
    - Create `src/audio/AudioCapture.ts`
    - Implement `init()`: request microphone via `navigator.mediaDevices.getUserMedia`, create `AudioContext` and `AnalyserNode` with FFT_SIZE 2048
    - Implement `getAnalyser()`, `getSampleRate()`, `isActive()`
    - Implement `onStreamLost()` callback registration and stream health monitoring via `MediaStreamTrack.onended`
    - Implement `resume()` for AudioContext suspension recovery (browser autoplay policy)
    - Implement `dispose()` to release microphone resources
    - Handle browser capability check (no `getUserMedia` → throw descriptive error)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Implement PitchDetection module using pitchy
    - Create `src/audio/PitchDetection.ts`
    - Import `PitchDetector` from `pitchy`
    - Implement `init(sampleRate, bufferSize)`: create `PitchDetector.forFloat32Array(bufferSize)`
    - Implement `detect(analyser)`: copy time-domain data via `analyser.getFloatTimeDomainData()`, call `detector.findPitch(buffer, sampleRate)`, filter by clarity threshold (0.85) and frequency range [80, 500] Hz
    - Return `{ frequency: number | null, clarity: number }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.3 Write property tests for PitchDetection
    - **Property 1: Pitch Detection Accuracy** — For synthetic sine waves in [80, 500] Hz, detected frequency is within ±3 Hz
    - **Property 2: Invalid Audio Yields Null** — For silence, noise, or out-of-range frequencies, output is null
    - **Validates: Requirements 2.2, 2.4, 2.5**

  - [ ] 2.4 Implement PitchMapper module
    - Create `src/audio/PitchMapper.ts`
    - Implement `mapToAltitude(frequency, currentAltitude, deltaTime, canvasHeight)`
    - Linear mapping: `altitude = ((freq - 80) / (500 - 80)) * canvasHeight`
    - Null frequency: descend at 150 px/s × deltaTime
    - Smoothing: clamp per-frame change to 10% of canvasHeight
    - Boundary clamping for out-of-range frequencies
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 2.5 Write property tests for PitchMapper
    - **Property 3: Linear Pitch-to-Altitude Mapping** — Correct linear interpolation for valid frequencies, clamping for out-of-range
    - **Property 4: Null-Pitch Descent Rate** — Descent ≤ 150 px/s, never below 0
    - **Property 5: Altitude Change Smoothing Cap** — Change per frame ≤ 10% of canvas height
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

- [ ] 3. Implement game core logic
  - [ ] 3.1 Implement ObstacleGenerator module
    - Create `src/game/ObstacleGenerator.ts`
    - Implement `update(state, deltaTime, canvasHeight, planeHeight)`: spawn obstacles off-screen right, scroll at SCROLL_SPEED, remove when past left edge
    - Ensure gap height ≥ max(currentGapMultiplier, 1.2) × planeHeight
    - Ensure gap center at least one planeHeight from top/bottom edges
    - Initial spawn interval: 4 seconds (INITIAL_SPAWN_INTERVAL), decreasing over time to MIN_SPAWN_INTERVAL (1s)
    - First obstacle spawns after 4-5 seconds for forgiving start
    - Implement `reset()` to restore initial difficulty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 3.2 Write property tests for ObstacleGenerator
    - **Property 7: Obstacle Generation Constraints** — Gap height, center position, and multiplier invariants hold at all difficulty levels
    - **Property 8: Obstacle Spawn Interval Bounds** — Initial spawn intervals between 2 and 4 seconds
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ] 3.3 Implement CollisionDetector module
    - Create `src/game/CollisionDetector.ts`
    - Implement `checkObstacleCollision(plane, obstacles)`: AABB overlap detection — overlap iff both axes overlap simultaneously
    - Implement `checkBoundaryViolation(plane, canvasHeight)`: plane fully above top or fully below bottom
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 3.4 Write property tests for CollisionDetector
    - **Property 9: AABB Collision Detection Correctness** — Overlap reported iff rectangles intersect on both axes
    - **Property 10: Boundary Violation Detection** — Violation reported iff plane fully outside canvas bounds
    - **Validates: Requirements 6.1, 6.3**

  - [ ] 3.5 Implement ScoreTracker module
    - Create `src/game/ScoreTracker.ts`
    - Implement `addScrollScore(pixelsScrolled)`: accumulate fractional distance, award 1 point per 10 pixels
    - Implement `addObstacleBonus()`: add 10 bonus points
    - Implement `getScore()`, `reset()`
    - Implement `saveHighScore(score)` and `getHighScore()` using localStorage with graceful fallback for private browsing
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 3.6 Write property tests for ScoreTracker
    - **Property 11: Distance-Based Scoring** — For d pixels scrolled, score increment = floor(d / 10)
    - **Validates: Requirements 7.1**

  - [ ] 3.7 Implement GameState manager and state machine
    - Create `src/game/GameState.ts`
    - Manage state transitions: start → playing, playing → paused, paused → playing, playing → gameover, gameover → playing
    - Implement `reset()`: score = 0, plane at initial altitude, clear obstacles, restore initial difficulty
    - Track `elapsedTime` for difficulty scaling and progressive sky color
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 3.8 Write property test for GameState reset
    - **Property 12: Game State Reset Invariants** — After reset: score = 0, plane at initial position, obstacles empty, difficulty at initial values
    - **Validates: Requirements 8.6**

- [ ] 4. Checkpoint - Core logic verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement canvas rendering with visual identity
  - [ ] 5.1 Implement sky gradient background with progressive color shift
    - Create `src/rendering/Background.ts`
    - Render vertical linear gradient from SKY_TOP_COLOR to SKY_BOTTOM_COLOR
    - Implement progressive color shift: gradient shifts warmer (more orange/pink) as `elapsedTime` increases over ~2 minutes
    - Ensure no visible seams or gaps during continuous scroll
    - _Requirements: 9.3, 9.4_

  - [ ] 5.2 Implement parallax background layers
    - Add to `src/rendering/Background.ts` or create `src/rendering/ParallaxLayers.ts`
    - Far layer: rolling hills in sage green (#8FBC8F), moving at 30% of SCROLL_SPEED
    - Mid layer: tree silhouettes in muted olive (#6B8E23), moving at 60% of SCROLL_SPEED
    - Near layer: wispy cloud shapes in semi-transparent white, moving at 80% of SCROLL_SPEED
    - Each layer wraps seamlessly for continuous scrolling
    - _Requirements: 9.4_

  - [ ] 5.3 Implement paper plane renderer with tilt animation and trail
    - Create `src/rendering/PlaneRenderer.ts`
    - Draw white paper plane shape with fold lines (canvas paths, bezier curves)
    - Implement tilt animation: rotate ±15° based on vertical velocity (positive velocity → tilt up, negative → tilt down)
    - Implement trail effect: store last 15 positions, render fading dotted trail behind the plane
    - Position plane at fixed horizontal position (20% from left edge, within left third)
    - _Requirements: 4.3, 9.1_

  - [ ] 5.4 Implement cloud-style obstacle renderer
    - Create `src/rendering/ObstacleRenderer.ts`
    - Draw obstacles as rounded, soft cloud-like shapes using bezier curves
    - Use OBSTACLE_FILL_COLOR (#B0C4DE) fill and OBSTACLE_EDGE_COLOR (#778899) edges
    - Ensure friendly, non-threatening appearance with rounded corners and puffy shapes
    - Maintain visual consistency with paper plane art style
    - _Requirements: 9.2, 9.3_

  - [ ] 5.5 Implement engagement effects (screen shake, score pop)
    - Create `src/rendering/Effects.ts`
    - Implement screen shake: on collision, apply random ±4px offset to canvas for 300ms before showing game-over
    - Implement score pop animation: every 50 points, scale score text 1.0→1.3→1.0 over 400ms with gold (#DAA520) color flash
    - Track elapsed time for effect animations
    - _Requirements: 9.3_

  - [ ] 5.6 Implement visual pitch indicator bar
    - Add to HUD rendering in `src/rendering/HUD.ts` or within the Renderer
    - Draw a small vertical bar on the left edge of the canvas showing current detected pitch level
    - Map current pitch to bar fill height proportionally
    - Ensure it does not obscure gameplay elements
    - _Requirements: 9.3_

  - [ ]* 5.7 Write property test for canvas aspect ratio
    - **Property 13: Canvas Aspect Ratio Preservation** — For any viewport dimensions, canvas maintains 4:3 aspect ratio
    - **Validates: Requirements 9.5**

- [ ] 6. Implement GameLoop and world scroll
  - [ ] 6.1 Implement GameLoop module
    - Create `src/game/GameLoop.ts`
    - Use `requestAnimationFrame` with delta-time calculation
    - Cap delta time to 100ms to prevent physics tunneling
    - Implement `start()`, `stop()`, `onUpdate(callback)`
    - Drive update → render cycle independently of React
    - _Requirements: 4.1, 10.1_

  - [ ] 6.2 Implement world scroll update logic
    - Create `src/game/WorldScroll.ts` or integrate into GameState update
    - Scroll all game-world elements leftward at SCROLL_SPEED (200 px/s) × deltaTime
    - Frame-rate independent movement using delta time
    - _Requirements: 4.2, 4.5_

  - [ ]* 6.3 Write property test for world scroll
    - **Property 6: World Scroll Consistency** — After one tick, element x-position = original - (200 × deltaTime)
    - **Validates: Requirements 4.2, 4.5**

- [ ] 7. Implement React UI shell and accessibility
  - [ ] 7.1 Implement StartScreen component with instructions and accessibility
    - Create `src/components/StartScreen.tsx`
    - Display game title, simple illustration with instructions: "Hum high → plane goes up. Hum low → plane goes down. Dodge the clouds!"
    - Start button with minimum 48×48px touch target
    - Minimum 18px font size for all text
    - High contrast text (4.5:1 ratio minimum)
    - Handle mic permission denial with retry message
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 7.2 Implement GameOverScreen component with "New Best!" celebration
    - Create `src/components/GameOverScreen.tsx`
    - Display final score and high score comparison
    - Show "New Best!" celebratory text when current score exceeds saved high score
    - Restart button with minimum 48×48px touch target
    - Semi-transparent white blur backdrop overlay
    - Minimum 18px font size, high contrast
    - _Requirements: 8.4, 8.5, 8.6_

  - [ ] 7.3 Implement HUD overlay component
    - Create `src/components/HUD.tsx`
    - Display current score in top-right corner without obscuring plane or obstacles
    - Dark charcoal text with white outline for readability
    - Bold weight, minimum 18px font
    - Receive state snapshots from game loop via callback/ref bridge
    - _Requirements: 7.3_

  - [ ] 7.4 Implement GameCanvas component with responsive scaling
    - Create `src/components/GameCanvas.tsx`
    - Create and manage canvas element ref
    - Scale canvas to fill viewport while maintaining 4:3 aspect ratio (minimum 800×600)
    - Pass canvas ref to game loop on mount, clean up on unmount
    - _Requirements: 9.5_

  - [ ] 7.5 Implement App component and game lifecycle wiring
    - Create `src/App.tsx`
    - Conditionally render StartScreen, GameCanvas + HUD, or GameOverScreen based on game status
    - Wire game state callbacks: status changes, score updates
    - Ensure React never re-renders per-frame; only on status transitions
    - Handle AudioContext resume on first user interaction (autoplay policy)
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

- [ ] 8. Checkpoint - Full rendering and UI verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Integration, performance handling, and final wiring
  - [ ] 9.1 Wire audio pipeline to game loop
    - Connect AudioCapture → PitchDetection → PitchMapper → GameState.planeY in each frame update
    - Ensure pitch detection runs at least 30 times per second
    - Ensure end-to-end latency ≤ 50ms from hum to plane movement
    - _Requirements: 2.1, 10.2_

  - [ ] 9.2 Wire game logic: obstacles, collisions, scoring in game loop
    - In each frame: update obstacle positions, check collisions, update score, check boundary violations
    - On collision: trigger screen shake effect, then transition to game-over
    - On obstacle pass: add 10 bonus points
    - On score milestone (every 50 points): trigger score pop animation
    - _Requirements: 5.5, 6.1, 6.2, 6.3, 7.1, 7.2_

  - [ ] 9.3 Implement performance degradation handling
    - Monitor frame rate; if below 20 fps for > 3 consecutive seconds, reduce visible obstacles or simplify visual effects (e.g., disable trail, reduce parallax layers)
    - Show HUD indicator when microphone input clarity is consistently low
    - _Requirements: 10.1, 10.4_

  - [ ] 9.4 Implement stream interruption handling
    - On microphone stream loss: pause game loop, show notification overlay, offer resume option
    - On resume: restore audio stream and continue gameplay
    - _Requirements: 1.4_

  - [ ]* 9.5 Write unit tests for integration flows
    - Test state machine transitions end-to-end
    - Test mic permission denial flow
    - Test stream interruption and recovery
    - Test obstacle removal when off-screen
    - Test obstacle pass bonus scoring
    - Test localStorage high score read/write and graceful fallback
    - _Requirements: 1.3, 1.4, 5.6, 7.2, 8.2, 8.3, 8.6_

- [ ] 10. Final checkpoint - Complete game verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The visual identity (sky gradient, parallax, plane tilt/trail, cloud obstacles, effects) is concentrated in task group 5 but wired in task group 9
- INITIAL_SPAWN_INTERVAL is set to 4 seconds per updated design (forgiving start)
- All text uses minimum 18px font, large touch targets (48×48px), and high contrast per accessibility requirements
- The progressive sky color shift and engagement mechanics (screen shake, score pop, "New Best!") add polish without affecting core game logic

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.3", "3.5"] },
    { "id": 3, "tasks": ["2.2", "3.1", "3.4", "3.6", "3.7"] },
    { "id": 4, "tasks": ["2.3", "2.4", "3.2", "3.8"] },
    { "id": 5, "tasks": ["2.5", "5.1", "5.4", "6.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.5", "5.6", "6.2"] },
    { "id": 7, "tasks": ["5.7", "6.3", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["7.5"] },
    { "id": 9, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 10, "tasks": ["9.5"] }
  ]
}
```
