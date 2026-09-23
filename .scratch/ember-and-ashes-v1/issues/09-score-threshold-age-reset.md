# 09: Score, Destruction Threshold & Age Reset

**What to build:** Live score tracking against the exponential Destruction Threshold curve, triggering a cataclysm (map reset, new Age) when the threshold is reached.

**Blocked by:** 02 (Map Terrain Generation), 03 (Resource System), 04 (Building Placement), 05 (Population & Food Loop)

**Status:** ready-for-agent

- [x] A live score is computed and displayed each turn using the locked formula (10×Population + building prestige values + banked resources at Gold-equivalent)
- [x] The Destruction Threshold for the current Age is computed via the exponential curve and is visible to the player
- [x] When score reaches the threshold, a cataclysm event triggers: the map is cleared/regenerated (new terrain, new seed) and a new Age begins
- [x] The Age counter increments on reset and is visible to the player

## Comments

Implemented via `src/systems/ScoreSystem.ts`, registered on `TurnManager`'s `scoreThresholdCheck` phase. Score formula matches the grilling-locked shape exactly: `10×Population + Σ(building prestigeValue) + banked non-Population resources at 1:1 Gold-equivalent`. Added `prestigeValue` to every `BuildingDef` in `data/buildings.ts` with the exact values fixed during grilling (Town Hall 20, Farm/Sawmill/Quarry 15, Forge 30, Market 20, Watchtower 10). Threshold uses the locked exponential shape `round(1000 × 1.5^(age-1))`.

On cataclysm: `ScoreSystem` increments its internal Age counter, calls `ResourceSystem.reset()` (new method — restores `INITIAL_RESOURCES`, since a fresh Age's banked resources aren't meta-progress; that's ticket 10's job to layer on top), then calls `GameBoardScene.resetForNewAge()` (implements the `ScoreBoard` interface `ScoreSystem` depends on) which destroys all terrain and building visuals (added a `terrainVisuals` grid alongside the existing `buildingVisuals` one, since nothing previously tracked terrain tiles for cleanup), regenerates the map with a fresh `Date.now()` seed, re-places Town Hall, and redraws. Turn counter is deliberately NOT reset across Ages (kept cumulative) — the doc only specifies the Age counter increments, not the turn counter, and resetting it wasn't needed for any acceptance criterion.

UI: the top bar is now two lines — resources on line 1, `Age N   Score X / Y` on line 2 (canvas grew from 740px to 764px tall to fit). Score/threshold display refreshes on every End Turn and every building placement (since prestige value changes score immediately).

Verified in a real browser by temporarily lowering `THRESHOLD_BASE` from 1000 to 50 (restored afterward, confirmed via rebuild): triggered two chained cataclysms via repeated End Turn clicks, confirming each time — Age incremented (1→2→3), threshold recalculated correctly via the exponential curve (50→75→113, matching `round(50×1.5^n)` by hand), map visibly regenerated with a new layout each time, Town Hall re-placed, resources reset to initial values, and the turn counter continued incrementing (not reset) across the resets. Restored the real threshold (1000) and confirmed the game now stays in Age 1 as expected (score 170 well under 1000). No console errors throughout.
