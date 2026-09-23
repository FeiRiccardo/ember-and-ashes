# 01: Turn System

**What to build:** A manual "End Turn" button and turn counter, running a fixed phase pipeline other systems will hook into: production/consumption → population growth → construction completion → AI turn → hazard roll → score/threshold check → auto-save. Nothing in the game advances until the player presses End Turn.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] An "End Turn" button is visible and clickable during a game session
- [x] A turn counter is displayed and increments by 1 each time End Turn is pressed
- [x] Ending a turn runs the phase pipeline in order (production/consumption, population growth, construction completion, AI turn, hazard roll, score/threshold check, auto-save); phases can be no-op stubs until later tickets fill them in, but the order and hook points must exist
- [x] Nothing advances (no resource ticking, no AI action) until the player presses End Turn

## Comments

Implemented via `src/systems/TurnManager.ts` (ordered phase pipeline with an `onPhase` hook registration API) and `src/scenes/GameBoardScene.ts` (End Turn button + turn counter UI). Verified in a real browser: counter increments 1→2→3 across repeated clicks, no console errors.
