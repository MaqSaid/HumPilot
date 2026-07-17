---
inclusion: manual
---

# Skill: Create a Web Audio Component

Use this skill when creating any module that uses the Web Audio API.

## Pattern

```typescript
import { GAME_CONFIG } from '../game/config';

export class AudioComponent {
  private audioContext: AudioContext | null = null;

  init(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    // Create nodes, connect graph
  }

  start(): void {
    if (!this.audioContext) return;
    // Start oscillators or processing
  }

  stop(): void {
    // Stop oscillators, disconnect nodes
  }

  dispose(): void {
    this.stop();
    // Null all references
    this.audioContext = null;
  }
}
```

## Rules

1. Accept AudioContext as parameter to init() — never create your own
2. Exception: AudioCapture creates the AudioContext since it owns the mic stream
3. Every component must have dispose() that cleans up all nodes
4. Use setTargetAtTime() for smooth transitions (avoid clicks/pops)
5. Oscillator nodes cannot be restarted — create new ones in start()
6. Check for null audioContext before every operation
7. GainNode for volume — never manipulate source amplitude directly
8. Handle AudioContext suspension with resume()
9. All frequency/gain values from GAME_CONFIG constants
10. No audio processing in React render cycle

## Lifecycle

init() -> start() -> [update() per frame] -> stop() -> dispose()
