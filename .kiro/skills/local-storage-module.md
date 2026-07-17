---
inclusion: manual
---

# Skill: Create a localStorage Module

Use this skill when creating any module that persists data to localStorage.

## Pattern

Every localStorage module in this project follows the same structure:

```typescript
import { GAME_CONFIG } from '../game/config';

const STORAGE_KEY = 'humpilot_<feature>';

export class <Feature>Store {
  
  has(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  get<Data>(): <Type> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) as <Type>;
    } catch {
      return null;
    }
  }

  save(data: <Type>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable — silently fail
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — silently fail
    }
  }
}
```

## Rules

1. ALL localStorage calls wrapped in try/catch (private browsing may throw)
2. Return sensible defaults on failure (null, 0, false)
3. Key prefix is always `humpilot_` for namespacing
4. Use JSON.parse/stringify for objects, String() for numbers
5. When saving scores, compare with existing value — only save if higher
6. Never assume localStorage is available
