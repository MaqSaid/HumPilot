---
inclusion: manual
---

# Skill: Create a Game Logic Module

Use this skill when creating a new pure game logic module (collision, scoring, mapping, generation).

## Pattern

```typescript
import { GAME_CONFIG } from './config';
import type { GameState, AABB } from './types';

/**
 * Module description.
 * Must be a pure function or stateless class with reset().
 */
export function doSomething(input: InputType, deltaTime: number): OutputType {
  // Frame-rate independent calculation
  const result = input.value * deltaTime;
  return result;
}
```

## Rules

1. NO React imports ever
2. NO DOM access (document, window) except performance.now() if needed
3. NO side effects (localStorage, network, console.log in production)
4. ALL time-dependent logic uses deltaTime parameter
5. Import ONLY from ./config and ./types within src/game/
6. May import from src/audio/types.ts for shared interfaces
7. Must NOT import from src/rendering/ or src/ui/
8. Export pure functions where possible; classes only if state tracking is needed
9. Classes must have a reset() method returning to initial state
10. All numeric bounds enforced with Math.max/Math.min for clamping

## Testing

Every game module needs a corresponding property-based test:
- Use fast-check to generate randomized inputs
- Test that invariants hold for ALL valid inputs
- Minimum 100 iterations per property
