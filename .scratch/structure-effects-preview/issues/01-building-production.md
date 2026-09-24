# 01: Sawmill/Quarry/Forge Production

**What to build:** Give Sawmill, Quarry, and Forge real per-turn production, mirroring how Farm's `foodOutput`/`foodWaterBonus` already works, including each one's terrain-adjacency bonus tier.

**Blocked by:** none (builds on the already-shipped 04/Building Placement and 03/Resource System from `.scratch/ember-and-ashes-v1`)

**Status:** ready-for-agent

- [x] `BuildingDef` (`src/data/buildings.ts`) gains base/bonus output fields for Sawmill (Wood), Quarry (Stone), and Forge (Fire), following the same optional-field pattern as `foodOutput`/`foodWaterBonus`
- [x] Sawmill produces +4 Wood/turn, plus +2 Wood when built directly *on* a Forest tile (not merely adjacent to one — `BuildingPlacement.isTerrainSatisfied` already distinguishes on-Forest from adjacent-Forest for Sawmill's placement check; reuse that distinction rather than re-deriving it)
- [x] Quarry produces +4 Stone/turn, plus +2 Stone when adjacent to a Volcanic tile (Quarry itself must still be built *on* Hills, unchanged)
- [x] Forge produces +3 Fire/turn, plus +2 Fire when built on or adjacent to a Volcanic tile — no upkeep/consumption cost
- [x] Each building's bonus eligibility is computed once at placement time and stored per-tile (mirroring the existing `farmWaterBonus` grid in `GameBoardScene`), not re-derived every turn
- [x] Production is registered on the `production` turn phase (`TurnManager`), alongside the existing Farm/Town Hall handlers in `GameBoardScene.registerFarmProduction`/`ResourceSystem.registerWithTurnManager`
- [x] Placing a Sawmill/Quarry/Forge with resulting bonus eligible/ineligible is verified in a real browser across a few turns, confirming the resource bar increments match the expected base/bonus totals

## Comments

Implemented via new optional fields on `BuildingDef` (`woodOutput`/`woodForestBonus`, `stoneOutput`/`stoneVolcanicBonus`, `fireOutput`/`fireVolcanicBonus`), two new pure helpers in `BuildingPlacement.ts` (`hasForestBonus` — on-Forest check reusing the same distinction `isTerrainSatisfied` already makes for Sawmill; `hasVolcanicAdjacency` — on-or-adjacent-to-Volcanic, shared by Quarry and Forge), and three new per-tile boolean grids in `GameBoardScene` (`sawmillForestBonus`, `quarryVolcanicBonus`, `forgeVolcanicBonus`) computed once at placement via a new `computeBonusEligibility()` helper, mirroring `farmWaterBonus` exactly (including being cleared in `destroyBuildingAt` and reinitialized in `regenerateBoard`). `registerFarmProduction` was renamed to `registerBuildingProduction` and extended with a `switch` per building type. `SaveSystem`'s `SAVE_VERSION` bumped 2→3 for the three new grids (old saves discard and start fresh, per existing precedent). Also added matching bonus-indicator dots in `drawBuildingOverlay` (forest-green for Sawmill, volcanic-red for Quarry/Forge) alongside Farm's existing blue water-bonus dot, for visual parity.

Verified in a real running dev-server browser (via a temporary `window.__game` debug hook, removed before finishing — same pattern as ticket 04): built a custom deterministic terrain layout (on-Forest, adjacent-Forest-only, Volcanic-adjacent Hills, non-adjacent Hills, on-Volcanic, and a plain tile) covering both the bonus and base-only case for each of the three buildings. Confirmed all six bonus flags matched expectations exactly (`true`/`false`). Ran only the `production` phase's handlers directly (bypassing `aiTurn`/`hazardRoll` randomness for a deterministic measurement) and confirmed the resulting resource deltas matched the expected math exactly: Gold +2 (Town Hall), Food +8 (5 bonus + 3 base), Wood +10 (6+4), Stone +10 (6+4), Fire +8 (5+3). Also ran three full real `handleEndTurn()` cycles (including AI/hazard/score-threshold phases) with no console errors, and confirmed the new grids survive a save/reload round-trip (`SAVE_VERSION` 4, see ticket 05's Comments) without issue.
