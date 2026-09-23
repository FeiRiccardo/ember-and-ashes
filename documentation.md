# Ember & Ashes — Game Design Document

*A chill, open-source, browser-based fantasy kingdom strategy game.*

---

## 1. Overview

| | |
|---|---|
| **Genre** | 4X-lite (build, expand, manage) — turn-based |
| **Theme** | Fantasy kingdoms |
| **Platform** | Web app (HTML5 + JS), playable in any browser, installable as PWA on iOS/Android |
| **Engine** | [Phaser 3](https://phaser.io/) |
| **Language** | JavaScript (or TypeScript if preferred later) |
| **License** | Open-source, hosted on GitHub |
| **Hosting** | GitHub Pages (free, static, fits the repo) |
| **Session length** | Open-ended — play persists across multiple days via save/load |
| **Opponents** | Solo player vs. 1 rule-based AI kingdom (no LLM/API needed) |
| **Core hook** | A prestige/reset loop: reach a score threshold → your kingdom is destroyed → world restarts, but tougher |

---

## 2. Core Loop

1. Player manages a small kingdom on an 8x8 grid.
2. Each turn: gather resources, build structures, optionally train units, optionally interact with the AI kingdom (trade or skirmish).
3. Score accumulates from prosperity (population, buildings, resources banked).
4. When score hits the **Destruction Threshold**, a cataclysm event triggers:
   - The map resets to empty.
   - Player keeps meta-progress (see §7 Prestige System).
   - A new, harder **Age** begins.
5. Game continues indefinitely across Ages — no hard "game over," just escalating challenge.

---

## 3. Map

- **Grid**: 8x8 square grid (64 tiles total) — small and quick to read at a glance.
- **Tile types**: Plains, Forest, Hills, River/Water, Volcanic/Fire tile (rare, hazardous but resource-rich).
- Each tile can hold at most one building or be worked for a resource.
- Map is procedurally generated fresh at the start of each Age, using a seed that shifts slightly to keep runs from feeling identical.

---

## 4. Resources (6 total — "Moderate" tier)

| Resource | Role | Source | Sink |
|---|---|---|---|
| **Gold** | Universal currency | Trade, markets | Building costs, unit upkeep |
| **Food** | Feeds population | Farms, fishing (near water) | Population growth/upkeep |
| **Wood** | Basic building material | Forest tiles | Early buildings |
| **Stone** | Advanced building material | Hills | Mid/late buildings, walls |
| **Fire** | Energy/power resource | Volcanic tiles, forges | Powers advanced buildings, smithing |
| **Water** | Basic resource, irrigation | River tiles | Farms, some buildings, balances Fire use |

Fire and Water are framed as counterpart resources — Fire powers production, Water sustains growth. Some buildings may require both together (e.g. a Forge needs Fire + Stone).

---

## 5. Buildings (5–8 types)

Suggested starter set:
1. **Town Hall** — kingdom center, always present, generates a trickle of Gold.
2. **Farm** — produces Food (bonus near Water).
3. **Sawmill** — produces Wood (must be on/near Forest).
4. **Quarry** — produces Stone (must be on Hills).
5. **Forge** — converts Fire + Stone → advanced goods / unlocks military upgrades.
6. **Market** — converts surplus resources into Gold, enables trade with AI.
7. **Watchtower** — defense, protects adjacent tiles from raids.
8. *(optional)* **Well** — produces Water, small Food bonus to adjacent farms.

---

## 6. Units (2–3 types)

Kept intentionally simple — no deep combat system, just enough for the AI to feel like a rival:
1. **Settler** — expands territory / claims new tiles.
2. **Soldier** — basic defense/offense, costs Gold + Food upkeep.
3. *(optional)* **Trader** — travels to the AI kingdom to exchange resources.

---

## 7. AI Opponent

- **Not an LLM** — a rule-based bot, plain game logic, no API key or internet dependency.
- Simple decision loop each turn, e.g.:
  - If Gold > threshold → build next priority building.
  - If Food < upkeep need → prioritize Farm.
  - If player military > AI military by X → build Soldiers defensively.
  - Occasionally raids the weakest undefended player tile.
- AI difficulty scales with each Age (see §8) by adjusting its resource multipliers and decision aggressiveness — not by making it "smarter" algorithmically, just tuning numbers. Simple and easy to balance.

---

## 8. Win Condition & Prestige/Reset Loop

- **Score** = weighted sum of population + buildings + banked resources.
- **Destruction Threshold**: score target for the current Age (starts modest, rises each Age).
- On reaching the threshold: a "cataclysm" event (visual/narrative flavor — fire consumes the kingdom) resets the map.
- **Carried forward between Ages** (the prestige layer — gives long-term motivation):
  - A small permanent bonus (e.g. +X% starting resources, or an unlocked building) per completed Age.
  - Total Ages completed, shown as a counter — the core "meta score."
- **Difficulty scaling per Age** (mix, as requested):
  - AI opponent gets stronger (better resource multipliers, more aggressive raids).
  - Random hazard events (fires, floods) become more frequent.
  - Resource income per turn tapers slightly, requiring tighter management.

This turns the game into a light rogue-lite: each Age is a short, self-contained run, and the meta-progress keeps bringing the player back.

---

## 9. Save System

- No backend — everything client-side via **browser `localStorage`**.
- Save on every turn end (auto-save) plus a manual "Save & Quit."
- Saved state includes: current map, resources, buildings, units, current Age number, prestige bonuses, AI state.
- One save slot is enough for v1; multiple slots can come later.

---

## 10. Art & UI Style

- Flat, minimal 2D — simple colored tiles/icons rather than detailed sprites (fast to produce, fits "chill" tone).
- Free asset packs (e.g. Kenney.nl, CC0-licensed) can supply placeholder tile/icon art to start.
- UI: a resource bar (top), an 8x8 grid (center), a build menu (side/bottom), End Turn button.
- No timers, no real-time pressure — every action is player-paced.

---

## 11. Tech Stack Summary

- **Engine**: Phaser 3 (JavaScript)
- **Hosting/Deploy**: GitHub Pages (static export of the Phaser build)
- **Persistence**: localStorage
- **PWA**: manifest.json + service worker for "Add to Home Screen" installability on iOS/Android
- **Repo structure (suggested)**:
  ```
  /src
    /scenes        (Phaser scenes: MainMenu, GameBoard, GameOver/Cataclysm)
    /entities      (Building, Unit, AIPlayer classes)
    /systems       (TurnManager, ResourceSystem, SaveSystem, AISystem)
    /data          (building definitions, resource configs, JSON)
    /ui            (HUD, build menu, resource bar)
  /assets
    /tiles /icons /ui
  index.html
  manifest.json
  ```

---

## 12. Suggested Build Order (for Claude Code)

1. Project scaffold: Phaser 3 + basic HTML shell, empty 8x8 grid rendering.
2. Turn system: End Turn button, turn counter.
3. Resource system: 6 resources, display bar, basic passive generation.
4. Building placement: click tile → build menu → place building → deduct cost.
5. Population/Food loop: growth tied to Food surplus.
6. Save/load via localStorage.
7. AI opponent: basic rule-based turn logic, separate mini-kingdom on the map or off-map abstraction.
8. Score tracking + Destruction Threshold + reset/Age transition.
9. Prestige bonuses carried between Ages.
10. Difficulty scaling per Age.
11. Polish: PWA manifest, simple flat art pass, GitHub Pages deploy.

---

## 13. Open Questions / Future Ideas (not v1)

- Local pass-and-play multiplayer (mentioned as an option earlier — could be a v2 feature).
- Trader unit and active trade negotiation with the AI.
- Multiple save slots.
- Additional hazard types beyond fire/flood.
