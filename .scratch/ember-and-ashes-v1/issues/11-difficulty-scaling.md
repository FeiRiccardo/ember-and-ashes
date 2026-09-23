# 11: Difficulty Scaling Per Age

**What to build:** AI aggressiveness/multipliers, hazard frequency, and resource income taper all scale with the current Age number, by tuning existing numeric parameters rather than changing system logic.

**Blocked by:** 07 (AI Opponent), 08 (Hazard Events), 09 (Score, Destruction Threshold & Age Reset)

**Status:** ready-for-agent

- [x] The AI's resource multipliers and raid aggressiveness increase as the Age number increases
- [x] Hazard event frequency increases as the Age number increases
- [x] Base resource income per turn tapers slightly as the Age number increases
- [x] None of the scaling requires AI or hazard logic changes beyond adjusting existing numeric parameters by Age

## Comments

Implemented as three independent, purely numeric per-Age multipliers layered on each system's existing constants — no new decision branches or mechanics, per the ticket's scope. Each system gets the same constructor-injection shape `PopulationSystem` established (`getFarmCount: () => number` → here, `getAge: () => number`), wired from `GameBoardScene` as `() => this.scoreSystem.getAge()`.

**1. `AIOpponent.ts`** — added `getAge: () => number` as a third constructor param (after `buildingQuery`). New `AGE_DIFFICULTY_RATE = 0.15` constant and a private `getAgeMultiplier()` returning `1 + AGE_DIFFICULTY_RATE * (age - 1)` (Age 1 = 1.0x, Age 3 = 1.3x, Age 5 = 1.6x). Applied to:
- Per-turn `AI_GOLD_INCOME_PER_TURN` / `AI_FOOD_INCOME_PER_TURN` (multiplied directly, no rounding — mirrors the "resource multipliers" half of documentation.md §8).
- `RAID_CHANCE` and `RAID_STEAL_FRACTION` in `maybeRaid()`, each as `base * ageMultiplier` clamped to `Math.min(1, ...)` so neither can exceed 100% (the "more aggressive raids" half).

**2. `HazardSystem.ts`** — added `getAge: () => number` as a third constructor param (after `getTurnNumber`). New `AGE_HAZARD_RATE = 0.15` constant and a private `getEffectiveHazardChance()` returning `Math.min(1, HAZARD_CHANCE * (1 + AGE_HAZARD_RATE * (age - 1)))`, used in place of the flat `HAZARD_CHANCE` in `tick()`'s roll.

**3. `ResourceSystem.ts`** — `registerWithTurnManager` now takes a second param `getAge: () => number` (constructor injection wasn't viable here: `ResourceSystem` is a zero-arg class field initializer that runs before `ScoreSystem` exists in `GameBoardScene`'s field-declaration order, so the age-getter is threaded through the registration call instead, which already runs after all fields are initialized — same idea as the ticket's suggested fallback). New `TOWN_HALL_TAPER_RATE = 0.1` and `TOWN_HALL_TAPER_FLOOR = 0.5`; the production-phase handler now computes `taperMultiplier = Math.max(0.5, 1 - 0.1 * (age - 1))` and adds `TOWN_HALL_GOLD_PER_TURN * taperMultiplier` (rounded to 1 decimal) instead of the flat `2`/turn. Floor keeps the trickle at a minimum of `1.0`/turn (2 × 0.5) — it tapers but never reaches zero.

**`GameBoardScene.ts`** — touched only the three call sites: `resourceSystem.registerWithTurnManager(this.turnManager, () => this.scoreSystem.getAge())`, the `AIOpponent` construction at the `// AI TURN HOOK` marker, and the `HazardSystem` construction inside `registerHazardSystem()`. No other lines in the file were touched. Concurrent tickets 10 (prestige) and 13 (art pass) were mid-edit on the same file during this work — re-read it after a stale-file warning from one `Edit` call and confirmed no overlap with my three call sites (ticket 10 had added a `PrestigeSystem` field and threaded an `onAgeComplete` callback into `ScoreSystem`'s constructor, entirely separate from the lines I touched).

**Verification:**
- `npx tsc --noEmit` and `npm run build` both clean, before and after the browser session.
- Real-browser check via `npm run dev -- --port 5179 --strictPort` + chrome-devtools MCP (the shared browser was available). Used a temporary `(window as any).__game = new Phaser.Game(config)` hook in `main.ts` (removed again before finishing, confirmed via a final clean `tsc`/`build`) to drive `ScoreSystem.setAge(N)` directly (already a public method — no need to touch `ScoreSystem.ts`'s threshold constant at all, unlike ticket 09's technique) and to call each system's registered `TurnManager` phase handlers directly (`turnManager.handlers.production/aiTurn/hazardRoll`), bypassing `scoreThresholdCheck` — necessary because concurrent ticket 10 work had the Destruction Threshold temporarily lowered for its own testing, which was triggering cataclysms (and resetting resources) mid-test when driving turns via the full `handleEndTurn()`.
  - **Town Hall taper**: measured the production-phase gold delta directly at Age 1/3/5/10: `+2, +1.6, +1.2, +1` — exactly matching `2 * max(0.5, 1 - 0.1*(age-1))`, confirming both the taper and the floor.
  - **Hazard chance**: placed a building on a Forest tile, fixed `Math.random` at `0.17` (between Age 1's effective 0.15 and Age 3's effective 0.195) and called the `hazardRoll` handler directly: no hazard fired at Age 1, hazard fired (building destroyed) at Age 3.
  - **AI raid chance/steal fraction**: placed a Farm, fixed `Math.random` at `0.23` (between Age 1's effective raid chance 0.2 and Age 3's effective 0.26) and called the `aiTurn` handler directly: no raid at Age 1; at Age 3 the raid fired, destroyed the Farm, and stole exactly `floor(57.2 * 0.195) = 11` Gold — matching the scaled steal fraction (`0.15 * 1.3 = 0.195`) applied to the player's actual banked Gold at the time.
  - No console errors at any point (`list_console_messages` showed only Vite/Phaser startup lines).
- One concurrent-edit collision on `main.ts`'s temporary debug hook (same infra quirk noted in tickets 07/08): another agent had already added and then removed its own hook mid-session; re-added mine cleanly after confirming the file matched the pre-hook baseline, then removed it again at the end and confirmed a clean `tsc`/`build`.
- Stopped the port-5179 dev server (`taskkill` on its PID) before finishing; no background processes left running.
