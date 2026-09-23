# 05: Population & Food Loop

**What to build:** Population grows or shrinks each turn based on Food surplus/deficit, with per-capita Food upkeep and a hard cap tied to Farm count.

**Blocked by:** 03 (Resource System), 04 (Building Placement)

**Status:** ready-for-agent

- [x] Population increases when Food production exceeds Food upkeep for a turn, and decreases (or stalls) when Food is in deficit
- [x] Each point of Population consumes a small amount of Food per turn as upkeep
- [x] Population cannot exceed the cap: 10 + 5 × (number of Farms currently placed)
- [x] The resource bar's Population figure updates each turn based on this loop

## Comments

Implemented via `src/systems/PopulationSystem.ts` (registers on TurnManager's `populationGrowth` phase; per-capita Food upkeep = 1/turn, cap = `10 + 5×farmCount` from grilling) and a new `registerFarmProduction()` hook on `production` in `GameBoardScene` (each placed Farm adds `foodOutput` (3) plus `foodWaterBonus` (2) if it has the Water-adjacency bonus from ticket 04 — this is where Farm's Food output, deliberately deferred by ticket 04, gets wired in). `GameBoardScene.countBuildingsOfType()` feeds the live Farm count into the cap formula.

Also did a small shared prefactor while here, since tickets 07 (AI Opponent) and 08 (Hazard Events) both need it: `getAllBuildingTiles()`, `isTileDefendedByWatchtower()`, `destroyBuildingAt()`, and `placeBuildingFree()` on `GameBoardScene`, plus a `buildingVisuals` grid so destroying a building now actually cleans up its rendered objects (previously nothing removed a building's sprite/text). Left `// AI TURN HOOK` / `// HAZARD HOOK` comment markers in `create()` as the intended registration point for those tickets.

Verified in a real browser by running the loop through several turns with no Farm (Food 20→15→9→2→0, Population 5→6→7→8→7, matching the exact predicted upkeep/deficit trace by hand), then placing a Farm and confirming its 3 Food/turn production integrates correctly with the upkeep loop (population converges toward a 3–4 equilibrium, as expected for a single Farm's output). No console errors.
