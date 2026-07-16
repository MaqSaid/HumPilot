# Implementation Plan: Humming Paper Plane

## Overview

This plan implements a browser-based game where the player controls a paper plane's altitude by humming. The game uses Vite + TypeScript + React (thin UI shell) with HTML5 Canvas 2D rendering and Web Audio API + pitchy for pitch detection. All game logic is client-side with localStorage persistence. The plan covers all 14 requirements including pitch calibration, generative ambient music, daily challenge mode, and offline PWA support.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - [x] 1.1 Initialize Vite + TypeScript + React project and install dependencies
    - Run `npm create vite@latest` with React + TypeScript template
    - Install runtime dependencies: `pitchy`
    - Install dev dependencies: `vitest`, `fast-check`, `vite-plugin-pwa`
    - Configure `tsconfig.json` with strict mode
    - Configure `vitest.config.ts` with test setup
    - Create directory structure: `src/audio/`, `src/game/`, `src/rendering/`, `src/ui/`, `src/pwa/`
    - _Requirements: 10.3_

  - [x] 1.2 Define core TypeScript interfaces and constants
    - Create `src/game/types.ts` with `GameState`, `Obstacle`, `DifficultyConfig`, `AABB` interfaces
    - Create `src/game/config.ts` with `GAME_CONFIG` constants object (all numeric constants, colors, thresholds)
    - Create `src/audio/types.ts` with `PitchResult`, `CalibrationData` interfaces
    - _Requirements: 3.1, 5.1, 6.1, 11.2_

- [x] 2. Implement Audio Pipeline
  - [x] 2.1 Implement AudioCapture module
    - Create `src/audio/AudioCapture.ts`
    - Implement `init()`: request microphone via `getUserMedia`, create `AudioContext` and `AnalyserNode` with FFT_SIZE 2048
    - Implement `getAnalyser()`, `getSampleRate()`, `isActive()`
    - Implement `onStreamLost()` callback registration and stream health monitoring
    - Implement `resume()` for recovering lost streams and handling AudioContext suspension
    - Implement `dispose()` to release microphone resources
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 2.2 Implement PitchDetection module using pitchy
    - Create `src/audio/PitchDetection.ts`
    - Import `PitchDetector` from `pitchy`
    - Implement `init(sampleRate, bufferSize)`: create `PitchDetector.forFloat32Array(bufferSize)`
    - Implement `detect(analyser)`: copy time-domain data, call `findPitch()`, filter by clarity threshold (0.85) and frequency range [80, 500] Hz
    - Return `{ frequency, clarity }` or `{ frequency: null, clarity }` when invalid
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.3 Write property tests for PitchDetection
    - **Property 1: Pitch Detection Accuracy** — synthetic sine wave in [80, 500] Hz → detected within ±3 Hz
    - **Property 2: Invalid Audio Yields Null** — silence/noise/out-of-range → null output
    - **Validates: Requirements 2.2, 2.4, 2.5**

- [x] 3. Implement Pitch Calibration
  - [x] 3.1 Implement CalibrationManager module
    - Create `src/audio/CalibrationManager.ts`
    - Implement `hasCalibration()`: check localStorage for calibration key
    - Implement `getCalibration()`: parse and return stored `CalibrationData` or null
    - Implement `saveCalibration(data)`: serialize and store to localStorage
    - Implement `clearCalibration()`: remove calibration key from localStorage
    - Implement `getEffectiveRange()`: return calibrated range (with 10% buffer) or default [80, 500] Hz; fall back to defaults if calibrated range < 100 Hz wide
    - _Requirements: 11.2, 11.3, 11.4, 11.6_

  - [x] 3.2 Implement PitchMapper module
    - Create `src/game/PitchMapper.ts`
    - Read effective range from `CalibrationManager.getEffectiveRange()` (min, max)
    - Implement `mapToAltitude(frequency, currentAltitude, deltaTime, canvasHeight)`
    - Linear interpolation: `((freq - min) / (max - min)) * canvasHeight`
    - Null pitch: descend at constant rate (150 px/s max), clamp at 0
    - Smoothing: clamp per-frame change to 10% of canvas height
    - Out-of-range clamping to boundaries
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.3_

  - [ ]* 3.3 Write property tests for PitchMapper and CalibrationManager
    - **Property 3: Linear Pitch-to-Altitude Mapping** — frequency f in [80, 500] → correct linear mapping
    - **Property 4: Null-Pitch Descent Rate** — null pitch → descend ≤ 150 px/s, not below 0
    - **Property 5: Altitude Change Smoothing Cap** — change per frame ≤ 10% canvas height
    - **Property 14: Calibrated Pitch Mapping** — frequency f in [L, H] where H-L ≥ 100 Hz → `((f-L)/(H-L))*canvasHeight`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.3**

- [x] 4. Implement Game Core
  - [x] 4.1 Implement ObstacleGenerator module
    - Create `src/game/ObstacleGenerator.ts`
    - Implement `update(state, deltaTime, canvasHeight, planeHeight, rngFn?)`: spawn obstacles based on interval timer
    - Accept optional `rngFn: () => number` parameter — use it instead of `Math.random()` when provided (for daily challenge)
    - Enforce gap ≥ max(currentGapMultiplier, 1.2) × planeHeight
    - Enforce gap center at least one planeHeight from top/bottom edges
    - Increase difficulty over time: reduce gap multiplier (min 1.2), reduce spawn interval (min 1s)
    - Remove obstacles scrolled past left edge
    - Implement `reset()` to restore initial difficulty parameters
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 13.2_

  - [x] 4.2 Implement CollisionDetector module
    - Create `src/game/CollisionDetector.ts`
    - Implement `checkObstacleCollision(plane, obstacles)`: AABB overlap test — `A.x < B.x+B.width AND A.x+A.width > B.x AND A.y < B.y+B.height AND A.y+A.height > B.y`
    - Implement `checkBoundaryViolation(plane, canvasHeight)`: plane fully above top or fully below bottom
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.3 Implement ScoreTracker module
    - Create `src/game/ScoreTracker.ts`
    - Implement `addScrollScore(pixelsScrolled)`: accumulate fractional distance, award 1 point per 10 pixels
    - Implement `addObstacleBonus()`: add 10 bonus points
    - Implement `getScore()`, `reset()`
    - Implement `saveHighScore(score)` and `getHighScore()` using localStorage
    - Graceful fallback when localStorage unavailable
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 4.4 Write property tests for game core modules
    - **Property 6: World Scroll Consistency** — element x → `x - (200 * deltaTime)` after one tick
    - **Property 7: Obstacle Generation Constraints** — gap ≥ multiplier × planeHeight, center margin ≥ planeHeight, multiplier ≥ 1.2, interval ≥ 1s
    - **Property 8: Obstacle Spawn Interval Bounds** — initial interval between 2 and 4 seconds
    - **Property 9: AABB Collision Detection Correctness** — overlap iff both axes overlap
    - **Property 10: Boundary Violation Detection** — violation iff plane fully outside canvas
    - **Property 11: Distance-Based Scoring** — d pixels → floor(d/10) points
    - **Validates: Requirements 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.3, 7.1**

- [x] 5. Checkpoint - Core game logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Seeded RNG and Daily Challenge
  - [x] 6.1 Implement SeededRNG module
    - Create `src/game/SeededRNG.ts`
    - Implement `create(seed: string): () => number` using mulberry32 algorithm
    - Hash date string (YYYY-MM-DD) to 32-bit integer seed
    - Return a function that produces deterministic [0, 1) values on each call
    - _Requirements: 13.2_

  - [x] 6.2 Implement Daily Challenge game mode logic
    - Add daily challenge state tracking (mode flag, current date display)
    - When daily challenge mode selected, create SeededRNG with today's date and pass to ObstacleGenerator
    - Save daily challenge scores separately in localStorage under `dailyScore_YYYY-MM-DD` key
    - Standard mode continues to use Math.random()
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 6.3 Write property test for SeededRNG
    - **Property 15: Daily Seed Determinism** — same date string → identical sequence; different dates → different sequences
    - **Validates: Requirements 13.2**

- [x] 7. Implement Ambient Music
  - [x] 7.1 Implement AmbientMusic module
    - Create `src/audio/AmbientMusic.ts`
    - Implement `init(audioContext)`: create 2-3 oscillators (sine/triangle) with GainNode at -20dB
    - Implement `update(currentFrequency)`: when pitch detected, set oscillator to f/2 (octave below) or f×2/3 (perfect fifth below); when null, play drone at 110 Hz
    - Use `setTargetAtTime` for smooth frequency transitions (0.1s time constant)
    - Implement `start()`, `stop()`, `setMuted(muted)`, `isMuted()`, `dispose()`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 7.2 Write property test for AmbientMusic frequency harmonization
    - **Property 16: Ambient Music Frequency Harmonization** — valid pitch f → oscillator at f/2 or f×2/3; null pitch → 110 Hz
    - **Validates: Requirements 12.2, 12.3**

- [ ] 8. Implement Game Loop and Renderer
  - [x] 8.1 Implement GameLoop module
    - Create `src/game/GameLoop.ts`
    - Implement `start()`, `stop()`, `onUpdate(callback)`
    - Use `requestAnimationFrame`, calculate delta time, cap at 100ms max
    - Drive update → render cycle independently of React
    - _Requirements: 4.1, 10.1_

  - [x] 8.2 Implement Renderer module
    - Create `src/rendering/Renderer.ts`
    - Implement `render(state, ctx)`: clear canvas, draw layers in order
    - Sky gradient background (top #87CEEB → bottom #FFDAB9, shift warmer over time)
    - Parallax background layers: far hills (30% speed), mid trees (60% speed), near clouds (80% speed)
    - Paper plane with hand-drawn style (bezier curves, fold lines), tilt animation (±15° based on velocity)
    - Trail effect (last 15 positions, fading dotted line)
    - Cloud-style obstacles with rounded shapes and muted colors
    - Score pop animation (scale 1.0→1.3→1.0 every 50 points, gold flash)
    - Screen shake on collision (300ms, ±4px offset)
    - Visual pitch indicator bar on left edge
    - _Requirements: 4.1, 4.3, 9.1, 9.2, 9.3, 9.4_

  - [-] 8.3 Implement GameState manager and frame update logic
    - Create `src/game/GameStateManager.ts`
    - Wire together per-frame: read pitch → PitchMapper → update planeY → scroll world → ObstacleGenerator → CollisionDetector → ScoreTracker
    - Handle state transitions: start → playing → gameover, pause on stream loss
    - Implement `reset()` restoring all initial values
    - Frame-rate-independent delta-time calculations
    - _Requirements: 4.2, 4.4, 4.5, 8.2, 8.4, 8.6_

  - [ ]* 8.4 Write property tests for game state
    - **Property 12: Game State Reset Invariants** — after reset: score=0, plane at initial position, obstacles empty, difficulty at initial values
    - **Property 13: Canvas Aspect Ratio Preservation** — any viewport → canvas maintains 4:3 ratio
    - **Validates: Requirements 8.6, 9.5**

- [~] 9. Checkpoint - Game loop and rendering complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement React UI Shell
  - [~] 10.1 Implement StartScreen component
    - Create `src/ui/StartScreen.tsx`
    - Display game title, control instructions ("Hum high → up, Hum low → down, Dodge the clouds!")
    - "Start Game" button (standard mode), "Daily Challenge" button, "Recalibrate" button
    - Show high score and daily best score
    - Large touch targets (≥48×48px), minimum 18px font, high contrast text
    - _Requirements: 8.1, 11.5, 13.1_

  - [~] 10.2 Implement CalibrationScreen component
    - Create `src/ui/CalibrationScreen.tsx`
    - Two-step flow: prompt "Hum your lowest note" (2s capture) → "Hum your highest note" (2s capture)
    - Visual feedback: animated level meter showing detected pitch during capture
    - On complete: call `CalibrationManager.saveCalibration(data)` and invoke `onComplete` callback
    - "Skip" option that uses default range
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [~] 10.3 Implement GameOverScreen component
    - Create `src/ui/GameOverScreen.tsx`
    - Display final score, high score, "New Best!" celebration if applicable
    - "Tap to try again" restart action
    - Show daily challenge date and daily best if in daily mode
    - _Requirements: 8.5, 13.4_

  - [~] 10.4 Implement HUD overlay component
    - Create `src/ui/HUD.tsx`
    - Display current score (top-right), pitch indicator visual
    - Ambient music mute/unmute toggle button
    - Daily challenge date display when in daily mode
    - Minimum 18px bold font, white outline for readability
    - _Requirements: 7.3, 12.5, 13.3_

  - [~] 10.5 Implement GameCanvas component and App shell
    - Create `src/ui/GameCanvas.tsx`: manage canvas ref, mount/unmount game loop lifecycle via `useEffect`
    - Create/update `src/App.tsx`: top-level state machine routing between screens
    - Conditional rendering: CalibrationScreen (if no calibration) → StartScreen → GameCanvas + HUD → GameOverScreen
    - Canvas scaling: fill viewport maintaining 4:3 aspect ratio, min 800×600
    - Pass state snapshots from game loop to React via ref-based bridge (no per-frame re-renders)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.5_

- [ ] 11. Implement PWA Support
  - [~] 11.1 Configure PWA manifest and service worker
    - Create `public/manifest.json`: app name "HumPilot", icons (192×192, 512×512 placeholders), theme color #87CEEB, `display: "standalone"`, `orientation: "any"`
    - Configure `vite-plugin-pwa` in `vite.config.ts`: enable service worker generation, precache all build assets
    - Service worker strategy: CacheFirst for static assets, NetworkFirst for manifest/updates
    - Add "Update available" toast logic on start screen when new version detected
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 12. Integration and wiring
  - [~] 12.1 Wire all modules together end-to-end
    - Connect AudioCapture → PitchDetection → PitchMapper → GameStateManager
    - Connect GameStateManager → GameLoop → Renderer → Canvas
    - Connect AmbientMusic to AudioCapture's AudioContext and PitchDetection output
    - Connect CalibrationManager to PitchMapper effective range
    - Connect SeededRNG to ObstacleGenerator when daily challenge mode active
    - Wire React shell callbacks: start/restart/recalibrate actions, game status changes
    - Handle microphone permission flow: denied → show message, granted → transition to playing
    - Handle stream interruption → pause → resume flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 8.2, 8.3, 8.4, 12.6_

  - [~] 12.2 Implement performance degradation handling
    - Monitor frame rate, reduce visual effects if < 20fps for > 3 seconds
    - Show weak microphone indicator in HUD when clarity consistently low
    - _Requirements: 10.1, 10.4_

  - [ ]* 12.3 Write integration tests
    - Test full audio pipeline: mock microphone → AnalyserNode → pitchy → PitchMapper → altitude change
    - Test game state transitions: start → playing → gameover → restart
    - Test daily challenge flow: select daily → seeded obstacles → score saved separately
    - Test calibration flow: calibrate → save → PitchMapper uses calibrated range
    - Test ambient music lifecycle: start → harmonize → stop on game-over
    - _Requirements: 1.2, 2.1, 8.2, 8.4, 8.6, 11.3, 12.6, 13.2_

- [~] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The game uses TypeScript throughout with Vitest + fast-check for testing
- `vite-plugin-pwa` handles service worker generation automatically — no manual SW code needed
- CalibrationManager is a pure logic module; CalibrationScreen is the React component
- SeededRNG uses mulberry32 for deterministic daily obstacle layouts
- AmbientMusic reuses the existing AudioContext from AudioCapture

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "4.3", "6.2"] },
    { "id": 4, "tasks": ["2.3", "3.3", "4.1", "4.2", "6.3"] },
    { "id": 5, "tasks": ["4.4", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3"] },
    { "id": 8, "tasks": ["8.4", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 9, "tasks": ["10.5", "11.1"] },
    { "id": 10, "tasks": ["12.1"] },
    { "id": 11, "tasks": ["12.2", "12.3"] }
  ]
}
```
