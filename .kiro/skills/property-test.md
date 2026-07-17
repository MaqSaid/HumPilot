---
inclusion: manual
---

# Skill: Write a Property-Based Test

Use this skill when writing property-based tests with Vitest + fast-check.

## Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';

describe('ModuleName', () => {
  it('Property N: description', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 80, max: 500, noNaN: true }),
        fc.float({ min: 0.001, max: 0.1, noNaN: true }),
        (input, deltaTime) => {
          const result = moduleFunction(input, deltaTime);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Rules

1. Minimum 100 iterations per property (numRuns: 100)
2. Use fc.float with noNaN: true for numeric inputs
3. Constrain arbitraries to realistic ranges
4. Each test validates ONE property from the design document
5. Name format: "Property N: exact property text from design"
6. Test pure functions only — mock external dependencies
7. Never test rendering visuals — only logic/math

## Common Arbitraries

- Frequency: fc.float({ min: 80, max: 500, noNaN: true })
- DeltaTime: fc.float({ min: 0.001, max: 0.1, noNaN: true })
- Canvas height: fc.float({ min: 400, max: 1200, noNaN: true })
- Altitude: fc.float({ min: 0, max: 1200, noNaN: true })
- Scroll distance: fc.float({ min: 0, max: 100, noNaN: true })
- Plane height: fc.integer({ min: 20, max: 64 })
