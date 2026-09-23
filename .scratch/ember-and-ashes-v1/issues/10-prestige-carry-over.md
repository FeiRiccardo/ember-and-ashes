# 10: Prestige Carry-Over Between Ages

**What to build:** A small permanent bonus and an Ages-completed counter that persist across the Age reset, surviving save/reload.

**Blocked by:** 09 (Score, Destruction Threshold & Age Reset), 06 (Save / Load)

**Status:** ready-for-agent

- [x] Completing an Age (triggering ticket 09's reset) grants a small permanent bonus that persists into the next Age
- [x] The total number of completed Ages is tracked and displayed as a running counter
- [x] Prestige bonuses and the Ages-completed counter survive a save/reload

## Comments

Implemented via new `src/systems/PrestigeSystem.ts` (constructor-injected with `ResourceSystem`, same pattern as `PopulationSystem`/`ScoreSystem`). Tracks two things: an `agesCompleted` running counter and a placeholder permanent bonus — **+5 Gold added to the resource pool per completed Age** (`PRESTIGE_GOLD_BONUS_PER_AGE`), applied every time an Age completes via `onAgeComplete()`. It's flat per completion rather than a growing amount — the "compounding" is the repeated application across Ages (by Age 3 the player has received it twice), kept deliberately small per the ticket's "nudge, not a game-changer" framing.

Wiring into the cataclysm flow: `ScoreSystem`'s constructor gained an optional third param, `onAgeComplete?: () => void`, invoked in `checkThreshold()` right after `resourceSystem.reset()` and before `board.resetForNewAge()` — so the bonus lands in the fresh Age's resource pool instead of being wiped. `ScoreSystem` never references `PrestigeSystem` directly. `GameBoardScene` constructs `PrestigeSystem` and passes `() => this.prestigeSystem.onAgeComplete()` as that callback.

`SaveSystem`'s `SaveData` gained `agesCompleted: number`; bumped `SAVE_VERSION` from 1 to 2 (old saves lack this field, so a version mismatch now safely discards them and starts a fresh game, per ticket 06's existing "no save → fresh game" path, rather than loading `agesCompleted` as `undefined`). `GameBoardScene.create()`'s `saved` branch now calls `prestigeSystem.setAgesCompleted(saved.agesCompleted)`, and `performSave()` includes `agesCompleted: this.prestigeSystem.getAgesCompleted()`.

UI: extended the top bar from two lines to three (resources / Age+Score / `Ages Completed: N`), following ticket 09's precedent — bumped `RESOURCE_BAR_HEIGHT` from 64 to 92 (18px top/bottom padding, 28px line spacing, matching the existing two-line proportions) and the canvas height in `src/main.ts` from 764 to 792 to match. `formatPrestige()` refreshes alongside the other bar text on End Turn and on `resetForNewAge()`.

**Verified**: `npx tsc --noEmit` and `npm run build` both clean. In a real browser (dev server on port 5178, per the ticket's fixed-port instruction), temporarily lowered `THRESHOLD_BASE` from 1000 to 50 and drove three chained cataclysms — confirmed each time: Age incremented (1→2→3→4), `agesCompleted` incremented in lockstep (0→1→2→3), and Gold after reset was exactly `INITIAL_RESOURCES.gold (50) + 5 = 55` (not wiped by the reset). Verified a full save→reload round trip: saved mid-Age-2 state (`agesCompleted: 1`, Gold 55, Turn 2), reloaded the page, and confirmed the UI and in-memory state matched exactly, with `SAVE_VERSION: 2` present in the persisted blob. Verified starting completely fresh (cleared localStorage) works with no console errors. Also specifically verified the version-bump discard path: hand-edited localStorage to a `version: 1` payload missing `agesCompleted` (simulating an old pre-ticket-10 save) and confirmed reload discards it and begins a fresh Age-1 game rather than crashing — no console errors in any of these runs. Restored `THRESHOLD_BASE` to 1000 afterward and confirmed via rebuild. Removed the temporary `(window as any).__game` debug hook from `main.ts` used for state inspection during testing (note: a concurrently-running agent on ticket 11 independently added and is still using its own copy of the same debug hook in `main.ts` for its own verification — that's expected/shared scratch usage per the ticket's noted infra quirk, not something ticket 10 needs to clean up).

Stayed within the declared file scope (`PrestigeSystem.ts` new, `ScoreSystem.ts` one param + call site, `SaveSystem.ts` interface + version bump, `GameBoardScene.ts` save/load wiring + top-bar UI) plus the `main.ts` canvas-height bump the ticket explicitly called for. Did not touch `AIOpponent.ts`, `HazardSystem.ts`, `ResourceSystem.ts`'s Town Hall trickle, `data/terrain.ts`, `data/buildings.ts` colors, or `drawGrid`/`drawBuildingOverlay` (ticket 11 / ticket 13 territory) — those files showed concurrent changes landing on disk mid-session (visible via the harness's "file changed since you last read it" notices) but no conflicts occurred with this ticket's edits.
