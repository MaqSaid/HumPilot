# Project Scope Rule

This project has ONE goal:

**"Build a browser game where the pitch of your humming controls the altitude of a paper plane dodging obstacles."**

## Constraints

- Everything we build must directly serve the one-line requirement above
- No backend servers, no microservices, no databases (localStorage only)
- No authentication, no user accounts, no leaderboard APIs
- No over-engineering: no DDD, no hexagonal architecture, no module federation
- The game is a static client-side app deployed free on Cloudflare Pages
- Must work on all devices with a browser and microphone: desktop, iPad, tablets, phones

## Tech Stack (locked)

- Vite + TypeScript (build tooling)
- React (thin UI shell only — start screen, game-over, HUD)
- HTML5 Canvas 2D (game rendering, independent of React)
- Web Audio API + Pitchy (audio capture and pitch detection)
- Cloudflare Pages (free static deployment)
- localStorage (high scores, no server)

## Design Principles

- Keep it simple. Ship a working, fun game.
- All game logic is client-side. No network calls during gameplay.
- Canvas game loop runs via requestAnimationFrame, fully decoupled from React.
- Visual style: friendly sky/cloud theme, accessible to all ages.
- Reject any suggestion that introduces backends, databases, paid services, or enterprise patterns.
