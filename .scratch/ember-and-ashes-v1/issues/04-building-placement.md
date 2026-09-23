# 04: Building Placement

**What to build:** Clicking a tile opens a build menu; selecting one of the 7 v1 buildings places it (respecting terrain constraints and one-building-per-tile) and deducts its resource cost.

**Blocked by:** 02 (Map Terrain Generation), 03 (Resource System)

**Status:** ready-for-agent

- [x] Clicking an empty tile opens a build menu listing the 7 v1 buildings the player can currently afford/place
- [x] Selecting a building places it on that tile, deducts its resource cost, and the tile visually shows the building
- [x] Terrain-locked buildings can only be placed on their required terrain (Sawmill on/near Forest, Quarry on Hills, Farm gets a bonus near Water)
- [x] A tile that already holds a building cannot receive a second building
- [x] Attempting to place a building without sufficient resources is rejected and no resources are deducted

## Comments

Implemented via `src/data/buildings.ts` (the 7 `BuildingType` defs — cost, color, buildable flag; Town Hall is `buildable: false` since it's auto-placed at game start, not menu-selectable), `src/systems/BuildingPlacement.ts` (pure functions: `isTerrainSatisfied` for Sawmill on/near-Forest and Quarry on-Hills, `hasWaterBonus` for Farm's Water adjacency, `canAfford`/`deductCost`/`formatCost`), and `GameBoardScene` (Town Hall auto-placed at tile (3,3); every grid tile is now interactive — clicking an empty one opens an in-canvas build menu container listing all 6 buildable types with cost, greyed out and non-selectable when terrain/affordability fails; clicking a valid row deducts cost, records the building, and draws its overlay; the panel's background also absorbs clicks so a disabled row can't leak through to the tile underneath it).

Buildings placed in v1 have no ongoing production/effects yet (deliberately out of scope for this ticket) except that a Farm's Water-bonus eligibility is computed and stored at placement time (`farmWaterBonus` grid, exposed via `hasFarmWaterBonus()`, shown as a small blue dot) — actual Food output tied to it is ticket 05's job. Forge/Market/Watchtower's described roles (goods conversion, AI trade, raid defense) are likewise left for the tickets that already own them (05 doesn't touch these; Watchtower's raid-defense behavior is ticket 07's job).

Verified in a real browser (with a temporarily-added `window.__game` debug hook, removed before finishing): build menu opens correctly showing per-row cost and greyed-out invalid options; placed a Farm (5 gold/15 wood deducted, Water-bonus dot rendered since adjacent to a Water tile), a Sawmill on a Plains tile adjacent to Forest (10 gold/5 stone deducted, "on/near Forest" rule confirmed), and a Quarry on an actual Hills tile (10 gold/15 wood deducted) — all confirmed via direct state inspection (`getBuildingAt`) as well as visually. Confirmed clicking the occupied Farm tile does nothing (no menu). Confirmed selecting an unaffordable building (Forge needing 20 stone with only 10 available) is rejected with zero resource change, and the menu panel no longer leaks disabled-row clicks through to the tile grid beneath it (a bug found and fixed during testing). No console errors after final reload.
