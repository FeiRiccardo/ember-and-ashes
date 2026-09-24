# 02: Structure Effect Descriptions

**What to build:** A shared function/data that produces a short, human-readable effect description for any building type at a specific tile, plus a description for Watchtower's already-implemented raid-defense (which currently has no display text anywhere except a Hints-panel tip).

**Blocked by:** 01 (Sawmill/Quarry/Forge Production)

**Status:** ready-for-agent

- [x] A function (e.g. `describeBuildingEffect(type, row, col, terrainMap, ...)`) returns a short string per building, taking the specific tile so terrain bonuses are reflected accurately — e.g. `"+4 Wood/turn"` on a Plains tile adjacent to Forest vs. `"+4 Wood/turn (+2 on Forest)"` when built directly on Forest
- [x] Town Hall, Farm, Sawmill, Quarry, and Forge each produce a description reflecting their base + conditional bonus (reusing the same on/adjacent terrain checks as ticket 01 and the existing `hasWaterBonus`)
- [x] Watchtower's description reads something like `"Protects adjacent tiles from AI raids"` — no new logic, `isTileDefendedByWatchtower` already implements the mechanic
- [x] Market's description communicates that it's a player-triggered conversion rather than a passive number (e.g. `"Convert Wood/Stone to Gold, once per turn"`) — placeholder text is sufficient here; the actual conversion mechanic is ticket 05
- [x] Descriptions are exposed in a form both the build menu (ticket 03) and the inspect panel (ticket 04) can consume without duplicating the text-formatting logic

## Comments

Implemented as `describeBuildingEffect(type, ctx)` in a new pure module, `src/systems/BuildingEffects.ts` — takes an `EffectContext` (`row`, `col`, `terrainMap`, `townHallIncome`, optional `marketUsedThisTurn`) rather than a long positional argument list, following `HintSystem.computeHints`'s "stateless snapshot in, string(s) out" convention. A shared `describeBaseAndBonus()` helper formats the base/bonus phrasing identically for Farm/Sawmill/Quarry/Forge: `"+{base+bonus} {Resource}/turn (+{bonus} for {condition})"` when the bonus is active, `"+{base} {Resource}/turn (+{bonus} if {condition})"` when it isn't — the same phrasing serves both the build-menu preview (ticket 03) and the inspect panel (ticket 04) without any "generic vs. live" distinction, since both always know the exact tile in question.

Town Hall's description needed its Age-tapered income, which was previously computed inline inside `ResourceSystem.registerWithTurnManager`'s closure — extracted into a new public `ResourceSystem.getTownHallIncome(age)` method (pure, same formula) so the description function can read the same live number the production code actually pays out, rather than duplicating or hardcoding the flat base rate.

Verified in a real browser as part of ticket 03/04's verification (see their Comments) — same session, since the function has no independent UI surface of its own to click through.
