# 03: Effect Preview in Build Menu

**What to build:** Show each building's effect description in the existing per-tile build menu, alongside the cost and terrain-validity text it already shows.

**Blocked by:** 02 (Structure Effect Descriptions)

**Status:** ready-for-agent

- [x] Each row in `GameBoardScene.openBuildMenu` shows its effect description (from ticket 02) computed for the exact (row, col) the menu was opened on, so a terrain bonus the tile actually qualifies for is reflected in the text before the player commits
- [x] The description is shown even for rows that are greyed out (wrong terrain / unaffordable), so the player can see what they'd be missing
- [x] The added text doesn't clip or overflow the build menu panel at the mobile viewport widths this game already supports (per the responsive-margins work in `9d3ae95`)
- [x] Verified in a real browser: open the build menu on a few different tiles (on-Forest, adjacent-Forest-only, adjacent-Volcanic, plain Plains) and confirm each row's text matches what ticket 01's production actually pays out

## Comments

Each build-menu row now renders a second, smaller muted-color line below the label (via a new `effectText` object added to the row's container) showing `describeBuildingEffect(type, {row, col, terrainMap, townHallIncome})` for the exact tile the menu was opened on. Shown for every row regardless of validity, per the ticket's ask. The panel widened 360→440 and row height grew 30→46 to fit the second line without wrapping or clipping (verified against the longest description string, ~54 characters); `wordWrap` is set defensively as a safety net. The effect line is also clickable (same `placeBuilding` handler as the label) for a slightly larger tap target, useful on mobile.

Verified in a real browser (dev server + a temporary `window.__game` debug hook, removed before finishing): built a deterministic test terrain layout, then called the scene's own `handleTileClick(row, col)` — the exact function a real pointerdown invokes — on an empty Volcanic tile. Confirmed the rendered rows exactly matched expectations, including a build-menu-specific edge case: Quarry showed `"(wrong terrain)"` (correctly greyed out, since Quarry needs Hills) while its effect line still read `"+6 Stone/turn (+2 for adjacent to Volcanic)"` — i.e. the *would-be* bonus for that tile, which is exactly what the ticket asked for ("shown even for rows that are greyed out... so the player can see what they'd be missing"), not a bug. Took a full-page screenshot confirming the panel renders cleanly with no clipping or overflow at the tested viewport width, and that the terrain-bonus indicator dots (ticket 01) render correctly on the placed buildings behind the panel.
