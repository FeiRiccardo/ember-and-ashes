# 05: Market Resource Conversion

**What to build:** Market's player-triggered conversion — clicking a placed Market opens the inspect panel (ticket 04) with buttons to convert Wood or Stone into Gold, capped at once per Market per turn.

**Blocked by:** 04 (Click-to-Inspect Placed Buildings)

**Status:** ready-for-agent

- [x] Clicking a placed Market's inspect panel (ticket 04) shows two buttons: "Convert 10 Wood → 5 Gold" and "Convert 10 Stone → 5 Gold" (2:1 ratio, fixed increment — no free-form quantity picker)
- [x] Each button is disabled when the player doesn't hold enough of the input resource, or when that specific Market has already converted once this turn
- [x] Clicking a valid button immediately deducts the input resource and adds Gold, updates the resource bar, and disables both buttons on that Market until the next turn
- [x] Each Market's per-turn conversion allowance resets independently when a turn ends (`TurnManager`'s turn-end handling), so a second Market meaningfully doubles total conversion throughput per turn
- [x] Food, Fire, and Water are never convertible — only Wood and Stone
- [x] Verified in a real browser: build two Markets, convert Wood on one, confirm the other Market's buttons are still enabled, confirm both re-enable after End Turn, and confirm a Market with insufficient Wood/Stone shows disabled buttons rather than allowing a negative-resource conversion

## Comments

Implemented via a new pure module, `src/systems/MarketConversion.ts` (`canConvert`/`convert`, mirroring `BuildingPlacement.ts`'s `canAfford`/`deductCost` style), plus a new per-tile `marketConversionUsed` boolean grid in `GameBoardScene` (same lifecycle as the ticket 01 bonus grids: initialized/reset in `create()`/`regenerateBoard()`, cleared in `destroyBuildingAt`, persisted via `SaveSystem`). `openInspectPanel` (ticket 04) grows two extra rows when `type === 'market'`: a "Convert 10 Wood → 5 Gold" and "Convert 10 Stone → 5 Gold" button, each independently enabled/disabled via `canConvert`. Clicking an enabled button converts, marks that tile's `marketConversionUsed = true`, updates the resource bar, and **re-opens the same inspect panel** (simplest way to refresh both buttons' enabled state and the effect text's "already converted this turn" wording, rather than manually re-styling objects in place). A new `registerMarketConversionReset()` resets the whole grid to `false` on every `production` phase — the same phase Farm/Sawmill/Quarry/Forge production runs on — so allowances are back in place by the next turn. `BuildingEffects.ts`'s Market case (ticket 02's placeholder) was extended to read this live flag. `SaveSystem`'s `SAVE_VERSION` bumped 3→4 for the new grid.

Verified in a real browser (same debug-hook session as the other tickets): opened a fresh Market's inspect panel, confirmed both Convert buttons enabled; clicked the actual button object's registered `pointerdown` handler (not a bypassed direct call) and confirmed Stone -10 / Gold +5 exactly, and that **both** buttons (not just the one clicked) became disabled on that same Market afterward — confirming the cap is "one conversion of either kind," not "one per resource." Confirmed a second, untouched Market's buttons stayed independently enabled. Confirmed draining a resource below 10 disables just that resource's button (tested via direct resource manipulation) while the other stays enabled if affordable. Confirmed running the `production` phase's handlers resets a previously-capped Market's buttons back to enabled. Confirmed the `marketConversionUsed` flag survives a save (version 4) / page-reload round-trip.
