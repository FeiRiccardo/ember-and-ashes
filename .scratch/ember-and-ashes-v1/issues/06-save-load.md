# 06: Save / Load

**What to build:** Auto-save to localStorage on every turn end, plus a manual "Save & Quit," with full state restoration on reload.

**Blocked by:** 01 (Turn System), 03 (Resource System), 04 (Building Placement), 05 (Population & Food Loop)

**Status:** ready-for-agent

- [x] The game auto-saves to localStorage at the end of every turn
- [x] A manual "Save & Quit" action is available and saves immediately
- [x] Reloading the page restores the map (including terrain), resources, buildings, turn count, and current Age exactly as they were
- [x] Starting the game with no existing save begins a fresh game instead of erroring

## Comments

Implemented via `src/systems/SaveSystem.ts` (plain `localStorage` JSON blob under a single key, with a `version` field so a future format change can detect and discard an incompatible old save rather than crash on it). `GameBoardScene.create()` now checks for an existing save first: if found, restores `terrainMap`, `buildings`, `farmWaterBonus`, resources (new `ResourceSystem.setAll()`), turn number (new `TurnManager.setTurnNumber()`), and Age (new `ScoreSystem.setAge()`); if none exists, falls through to the same fresh-generation path as before. Auto-save is registered on `TurnManager`'s existing `autoSave` phase. A "Save & Quit" button sits between the turn counter and End Turn in the bottom bar, calling the same save routine immediately with a brief "Saved!" label flash.

**Bug found and fixed while testing**: auto-saving via the `autoSave` phase captured `turnManager.getTurnNumber()` *before* `TurnManager.endTurn()`'s increment (since all phases, including `autoSave`, ran before `this.turnNumber += 1`), so the saved turn was always one behind what the UI displayed — reload would show e.g. "Turn: 2" right after the UI had shown "Turn: 3". Fixed by restructuring `TurnManager.endTurn()` to run the increment before invoking `autoSave` handlers specifically, while every other phase (including `hazardRoll`, whose recovery-turn math depends on the pre-increment number) still runs beforehand unchanged.

Verified in a real browser end to end: fresh load with no save works; placed a building, ended turns, reloaded, and confirmed terrain/resources/buildings/turn number/score all match exactly (including a case where the Farm had been destroyed by a raid/hazard in between — persisted correctly, not just the happy path). Also let a longer run play out where Town Hall itself eventually got destroyed by an AI raid or hazard (turn 6) — confirmed via direct state inspection that this is legitimate gameplay (Town Hall has no special immunity once placed) and not a save-related bug, and confirmed that state too survives a reload byte-for-byte. Manual "Save & Quit" verified via localStorage inspection matching live state. No console errors throughout.
