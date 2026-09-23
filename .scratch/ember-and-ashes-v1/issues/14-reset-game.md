# 14: Reset Game

**What to build:** A "Reset" button that restarts the game from scratch — a fresh map, resources, turn count, Age, and prestige progress — with a confirmation step so it can't be triggered by accident.

**Blocked by:** 06 (Save / Load), 09 (Score, Destruction Threshold & Age Reset), 10 (Prestige Carry-Over)

**Status:** ready-for-agent

- [x] A "Reset" button is available during a game session
- [x] Clicking it asks for confirmation before doing anything (a custom in-canvas dialog, consistent with the rest of the UI, not a native browser confirm)
- [x] Confirming wipes everything: map, buildings, resources, turn count, Age, Ages-completed counter, and the localStorage save itself
- [x] Canceling leaves the current game completely untouched

## Comments

Added a "Reset" button to a new second row in the bottom bar (alongside Save & Quit and the new Hints toggle — the single-row bottom bar no longer had room for a third control). Clicking it opens a small confirmation panel ("Reset the game and lose all progress?" / "Yes, Reset" / "Cancel"), styled the same way as the build menu rather than using `window.confirm()`, since a native OS dialog would look out of place against the game's custom flat UI.

Refactored `resetForNewAge()` (ticket 09's cataclysm reset) to extract a shared `regenerateBoard()` helper — both the Age reset and this full reset need to destroy/regenerate the terrain and building visuals and re-place Town Hall, but only this one also resets the turn count, Age, prestige counter, and clears the save via a new `SaveSystem.clear()` method. This keeps the two resets from drifting apart while making clear they're conceptually different (one preserves Age progress, one doesn't).

Bottom bar grew from one 60px row to two (`UI_BAR_HEIGHT` 60→120), and the canvas height grew accordingly (792→852) to fit.

Verified in a real browser: placed a building, advanced a turn (letting a hazard fire and change state further), clicked Reset, confirmed Cancel leaves everything untouched, then confirmed "Yes, Reset" restores Turn 1 / Age 1 / Ages Completed 0 / full starting resources / a fresh Town Hall / a newly-generated map, and clears `localStorage` entirely (confirmed via direct inspection — `savedNow: null` after reset). Also re-verified the responsive mobile layout (from the earlier margin/scaling fix) still holds with the new two-row bottom bar. No console errors.
