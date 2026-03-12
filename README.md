# Worms Armageddon Clone

A browser-playable Worms Armageddon clone built as a game dev portfolio piece.

## Core Concept

Two players online, one worm each. Knockback-only combat — the only way to die is getting knocked into water. Destructible terrain, ninja rope swinging, and periodic armageddon meteor showers make the terrain a dynamic battlefield.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game engine | Phaser 3 + TypeScript |
| UI shell | React + Vite |
| Multiplayer | PartyKit (Cloudflare) |
| Monorepo | pnpm workspaces |

## Project Structure

```
packages/
├── game/     # Phaser 3 game engine (terrain, entities, weapons, systems)
├── server/   # PartyKit multiplayer server (future)
└── web/      # React UI shell (lobby, HUD, game container)
shared/       # Types and constants shared across packages
```

## Getting Started

```bash
pnpm install
pnpm dev        # starts Vite dev server on http://localhost:3000
```

## Controls (current sandbox)

- **Left-click** — destroy terrain
- **Right-click / middle-click drag** — pan camera
- **Scroll wheel** — zoom (centered on mouse)

## Roadmap

- [x] Phase 1: Procedural terrain generation + click-to-destroy
- [ ] Phase 2: Matter.js physics on terrain (chunked marching squares)
- [ ] Phase 3: Worm character (walk, jump, gravity)
- [ ] Phase 4: Weapons (prod, baseball bat, fire punch, ninja rope)
- [ ] Phase 5: Turn system + water kills (local two-player)
- [ ] Phase 6: Online multiplayer via PartyKit
- [ ] Phase 7: Armageddon meteors + sudden death + deploy
