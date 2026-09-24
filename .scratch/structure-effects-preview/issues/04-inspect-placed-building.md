# 04: Click-to-Inspect Placed Buildings

**What to build:** Clicking an already-placed building opens a panel showing its live, computed effect numbers for that specific tile — on demand, any time, not just at placement.

**Blocked by:** 02 (Structure Effect Descriptions)

**Status:** ready-for-agent

- [x] `GameBoardScene.handleTileClick` opens an inspect panel (reusing the build menu's container/background pattern) when the clicked tile already holds a building, instead of doing nothing as it does today
- [x] The panel shows the building's label and its effect description computed live for that tile (e.g. a Farm actually adjacent to Water shows its full "+5 Food/turn" total, not the generic base-only text) — reuses ticket 02's description function, not a copy of it
- [x] Works for Town Hall too, even though it's never built through the menu (auto-placed at game start)
- [x] The panel is dismissible (tap elsewhere or a Cancel control, mirroring the existing build menu's cancel row) and doesn't leak clicks through to the tile underneath it (the build menu already guards against this — reuse the same approach)
- [x] Verified in a real browser: click a placed Farm (with and without Water adjacency), a placed Sawmill/Quarry/Forge with and without their bonus terrain, the Town Hall, and confirm each shows the correct live numbers; confirm dismissing the panel and clicking an empty tile still opens the normal build menu

## Comments

`handleTileClick` now branches on whether the tile already holds a building: occupied → new `openInspectPanel(row, col, type)`, empty → the existing `openBuildMenu` (unchanged). The inspect panel is a new container (`inspectPanel` field, separate from `buildMenu`) using the same background/interactive-absorb pattern as the build menu, with a title (building label), the live `describeBuildingEffect(...)` text, and a "Close" control. Both panel-opening methods destroy the other panel first, and `regenerateBoard()` now also destroys `inspectPanel` (mirroring its existing `buildMenu?.destroy()` guard), so a stale panel can never survive an Age reset or Reset Game.

Verified in a real browser (same debug-hook session as tickets 01/03): called `handleTileClick` on a placed Town Hall, a water-bonus Farm, and a base-only Sawmill, and confirmed each inspect panel's text: Town Hall → `"+2 Gold/turn"` (its live Age-tapered income), Farm → `"+5 Food/turn (+2 for adjacent to Water)"` (the full live total, not the generic conditional text), Sawmill → `"+4 Wood/turn (+2 if built directly on Forest)"` (correctly base-only, since that tile wasn't on Forest). Confirmed clicking an empty tile afterward still opened the normal build menu (not an inspect panel), and that opening one panel type correctly tears down the other.
