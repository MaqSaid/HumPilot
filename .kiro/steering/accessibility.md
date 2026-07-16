---
inclusion: fileMatch
fileMatchPattern: "src/ui/**/*.tsx,src/ui/**/*.css"
---

# Accessibility Standards

When working on UI components or styles, enforce these rules:

## Touch & Interaction
- All interactive elements (buttons, links) must be at least 48×48px
- Use `touch-action: manipulation` on buttons to prevent double-tap zoom
- Provide visible focus indicators for keyboard navigation

## Typography
- Minimum font size: 18px for body text, 24px for scores/headings
- Use bold weight (700) for scores and important numbers
- Ensure 4.5:1 contrast ratio minimum for all text against backgrounds

## Visual
- Never rely on color alone to convey information
- Obstacles distinguishable by shape and position, not just color
- No elements flash more than 3 times per second
- Sufficient contrast between plane, obstacles, and background

## Screen Readers & ARIA
- Use semantic HTML (h1, h2, button, p) — not div-as-button
- Add `role="alert"` for error messages
- Add `aria-label` for icon-only buttons (mute toggle)
- Add `role="progressbar"` with `aria-valuenow` for calibration progress
- Game canvas does not need aria — it's a visual-only interactive canvas

## Responsive
- Game works at any viewport size (minimum 320px width)
- Canvas scales to fill viewport while maintaining 4:3 aspect ratio
- UI text wraps gracefully on small screens
