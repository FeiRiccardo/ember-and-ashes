# Spec: Structure Effects Preview

Reached via a grilling session (`/mattpocock-skills:grilling`) with the user. Full Q&A trail lives in that conversation; this is the settled result.

## Problem

When placing a structure, the player has no way to see what it actually does. Today the build menu (`GameBoardScene.openBuildMenu`) only shows a building's label, cost, and whether the tile's terrain qualifies. Only Farm has any real per-turn effect implemented (`foodOutput`/`foodWaterBonus` in `src/data/buildings.ts`); Sawmill, Quarry, Forge, and Market have zero production logic. Watchtower's raid-defense is implemented (`GameBoardScene.isTileDefendedByWatchtower`) but has no display text anywhere except a Hints-panel tip.

## Scope

This feature is two things bundled together, by the user's explicit choice (not a UI-only reskin):

1. Real per-turn (or per-action, for Market) effects for every building that currently lacks them.
2. A UI to preview those effects before placing, and to re-inspect them on demand afterward.

## Decisions

- **Preview location:** inline text added to each existing build-menu row, computed for the specific tile that menu is already bound to. No new hover system, no multi-tile compare mode (touch-friendly, minimal UI change).
- **Post-placement inspection:** clicking an already-placed building (including Town Hall) opens a panel showing **live, computed** numbers for that exact tile — not the generic rule text.
- **Effect text format:** a flexible per-building description string, not a forced numeric shape. Lets Watchtower ("Protects adjacent tiles from AI raids") and Market (conversion controls) describe themselves in words where a bare "+N/turn" doesn't fit.
- **Sawmill:** +4 Wood/turn base; +2 Wood if built directly on a Forest tile (vs. merely adjacent — the terrain check already distinguishes these internally, see `BuildingPlacement.isTerrainSatisfied`).
- **Quarry:** +4 Stone/turn base; +2 Stone if adjacent to a Volcanic tile.
- **Forge:** +3 Fire/turn base, no upkeep cost; +2 Fire if built on or adjacent to a Volcanic tile.
- **Market:** no passive output. Player-triggered conversion, exposed on the click-to-inspect panel: fixed-increment buttons ("Convert 10 Wood → 5 Gold", "Convert 10 Stone → 5 Gold", 2:1 ratio), capped at **one conversion per Market per turn**. Food/Fire/Water are never convertible. No terrain bonus (Market has no terrain tie in the GDD).
- **Watchtower:** no new logic — the defense mechanic already works. Just needs a description string surfaced through the same preview/inspect UI.
- **Farm:** unchanged mechanically; now surfaced through the same preview/inspect UI as everything else.

## Non-goals

- No trade-with-AI system (Market's GDD mention of this is out of scope).
- No "advanced goods" resource or military-upgrade system for Forge.
- No slider/free-form quantity picker for Market conversion — fixed-increment buttons only, matching the rest of the UI's flat-button style.
- No save-migration concern: new per-tile bonus flags (mirroring `farmWaterBonus`) default to computed-at-placement, so old saves simply have no bonus on already-placed buildings until rebuilt.

## Tickets

See `issues/`, numbered in dependency order:

1. `01-building-production.md` — Sawmill/Quarry/Forge real production + bonus tiers
2. `02-effect-descriptions.md` — shared per-building description text + Watchtower description
3. `03-build-menu-preview.md` — show description in the build menu
4. `04-inspect-placed-building.md` — click-to-inspect panel with live numbers
5. `05-market-conversion.md` — Market's player-triggered Wood/Stone → Gold conversion
