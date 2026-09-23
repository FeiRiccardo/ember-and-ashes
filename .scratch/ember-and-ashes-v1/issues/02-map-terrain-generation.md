# 02: Map Terrain Generation

**What to build:** Procedural generation of the 8x8 map's terrain, assigning each tile one of the 5 terrain types (Plains, Forest, Hills, River/Water, Volcanic/Fire), visually distinguishable on the grid, using a seed that shifts each Age.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Starting a new game (or a new Age) procedurally generates an 8x8 map assigning each tile one of 5 terrain types: Plains, Forest, Hills, River/Water, Volcanic/Fire
- [x] Each terrain type is visually distinguishable (distinct tile color) on the grid
- [x] The generation seed shifts between Ages so consecutive Age maps aren't identical
- [x] The terrain type of every tile is queryable by other systems (for building constraints and hazard gating later)

## Comments

Implemented via `src/data/terrain.ts` (5 `TerrainType` values with distinct colors and weighted distribution — Plains 40%, Forest 20%, Hills 20%, Water 15%, Volcanic 5%, rare-but-resource-rich per GDD §3) and `src/systems/MapGenerator.ts` (a seeded `mulberry32` PRNG so a given seed deterministically reproduces the same map; `GameBoardScene` currently seeds with `Date.now()` at scene creation, and the upcoming Age-reset ticket (09) will call `generateMap` again with a new seed). `GameBoardScene.getTerrainAt(row, col)` exposes terrain lookups for other systems.

Verified in a real browser: terrain renders with 5 clearly distinct colors; reloading the page produces a visibly different layout each time (confirming the seed-shifts behavior), no console errors.
