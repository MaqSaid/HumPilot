---
inclusion: manual
---

# Skill: Create a React Screen Component

Use this skill when creating a new screen (start, calibration, game-over, or any overlay).

## Pattern

```tsx
interface <Screen>Props {
  onAction: () => void;
  // other props...
}

export function <Screen>({ onAction }: <Screen>Props) {
  return (
    <div className="<screen-name>-screen">
      <h1 className="<screen-name>-screen__title">Title</h1>
      <p className="<screen-name>-screen__description">Description</p>
      
      <div className="<screen-name>-screen__buttons">
        <button className="btn btn--primary" onClick={onAction}>
          Action Text
        </button>
      </div>
    </div>
  );
}
```

## Rules

1. Functional component only — no class components
2. Props interface defined above the component
3. Use BEM naming for CSS classes: `block__element--modifier`
4. Buttons must be at least 48x48px (min-height: 48px in CSS)
5. Font size minimum 18px for all text
6. Error messages use role="alert" for accessibility
7. Interactive elements need touch-action: manipulation
8. Screen is a pure presentational component — no game logic inside
9. Use callbacks for all user actions (onStart, onRestart, onRecalibrate)
10. Screens do NOT import from src/game/ for logic — only for display data (scores, dates)

## CSS Template

```css
.<screen-name>-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
}

.<screen-name>-screen__title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #333;
  margin-bottom: 1rem;
}
```
