# 03: Resource System

**What to build:** A resource bar showing all 7 resources (Gold, Food, Wood, Stone, Fire, Water, Population), with Town Hall's passive Gold trickle applied each turn through the production phase.

**Blocked by:** 01 (Turn System)

**Status:** ready-for-agent

- [x] A resource bar displays all 7 resources: Gold, Food, Wood, Stone, Fire, Water, Population
- [x] Town Hall is always present on the map from game start and produces a trickle of Gold each turn
- [x] Ending a turn applies production/consumption during the pipeline's production phase, and the resource bar updates to reflect the new totals
- [x] Resource values persist across turns (don't reset)

## Comments

Implemented via `src/data/resources.ts` (the 7 `ResourceType` values, labels, and starting amounts) and `src/systems/ResourceSystem.ts` (holds amounts, registers a `TOWN_HALL_GOLD_PER_TURN = 2` trickle on TurnManager's `production` phase — Town Hall itself isn't a placeable entity yet since that's ticket 04, but its passive income is always active per GDD §5). `GameBoardScene` now renders a resource bar across the top (pushed the grid down, canvas height increased to 740px in `main.ts` to fit resource bar + grid + turn bar) and refreshes its text after every End Turn.

Verified in a real browser: resource bar shows all 7 values correctly on load (Gold 50, Food 20, Wood 20, Stone 10, Fire 0, Water 0, Population 5); clicking End Turn increments Gold by 2 (52 after one turn) and the displayed turn counter and resources stay in sync; no console errors.
