# 07: AI Opponent

**What to build:** The off-map AI kingdom (Gold/Food/military-strength only, per ADR-0002) that takes a turn during the AI-turn phase: builds per its priority rules and raids the player's weakest undefended tile.

**Blocked by:** 01 (Turn System), 03 (Resource System), 04 (Building Placement)

**Status:** ready-for-agent

- [x] The AI kingdom tracks only Gold, Food, and a military-strength number (no map presence)
- [x] During the AI-turn phase, the AI applies its decision rules (build toward priorities when Gold is high, prioritize Food when short, build Soldiers defensively when player military exceeds its own)
- [x] The AI occasionally raids the player's weakest undefended tile (one with no adjacent Watchtower), destroying that tile's building and stealing a portion of the player's banked resources
- [x] A tile adjacent to a Watchtower is never selected as a raid target

## Comments

Implemented via `src/systems/AIOpponent.ts`, following the `PopulationSystem` shape: constructor-injected (`ResourceSystem` for the player's bank, plus a small `BuildingTileQuery` interface — `getAllBuildingTiles`/`isTileDefendedByWatchtower`/`destroyBuildingAt` — implemented structurally by `GameBoardScene`, same idea as `PopulationSystem`'s `getFarmCount` callback) and a `registerWithTurnManager(turnManager)` that hooks the `aiTurn` phase. Wired up in `GameBoardScene.create()` at the `// AI TURN HOOK` marker only, per the ticket's instruction not to touch anything else in that file.

**Internal AI state (Gold/Food/military only, per ADR-0002 and the "AI Kingdom" glossary entry — no Wood/Stone/Fire/Water/Population, since the AI's decision rules never reference those):**
- Starting Gold 50 / Food 20 — mirrors the player's own `INITIAL_RESOURCES` so both kingdoms start at parity.
- Starting military strength 3 — a modest placeholder baseline; there's no player-side number to mirror since Soldiers can't be trained yet (see limitation below).
- Passive per-turn trickle: +5 Gold, +3 Food — standing in for the AI's whole off-map economy in one flat number (Food trickle mirrors a single Farm's base output; Gold trickle is set a bit above the player's Town Hall rate of 2/turn to reflect a full kingdom rather than one building).

**Decision rules (GDD §7), checked in priority order each turn:**
1. Food short (< 10) → +8 Food emergency boost (survival takes priority).
2. Else if player military > AI military + margin (3) → +3 military (defensive buildup). Player military is currently always 0 (see limitation), so this branch is unreachable today but is implemented per the ticket's stated rule for when a future ticket adds player Soldiers.
3. Else if Gold high (>= 60) → -20 Gold, +2 military (invest surplus into economy/military growth).

**Raid mechanic:** 20% chance per turn (middle of the ticket's suggested 15–25% range) to raid. Eligible targets = all tiles from `getAllBuildingTiles()` where `isTileDefendedByWatchtower()` is false; one is picked at random and destroyed via `destroyBuildingAt()`, and 15% (middle of the ticket's suggested 10–20% range) of the player's *current* Gold is transferred from the player's `ResourceSystem` into the AI's own Gold. If no tile is eligible (e.g. every Building is Watchtower-protected), the raid is skipped for that turn. Per the literal building/tile rule, a Watchtower tile itself is a valid raid target when nothing else defends it (a Watchtower protects its neighbors, not itself) — confirmed intentional during verification (see below), matching "a tile with a building that has no adjacent Watchtower."

**Known limitation — player military is always 0:** No ticket in this project's breakdown ever added a way for the player to train Soldiers (Soldier is the sole v1 unit per the domain glossary, but no build-a-Soldier UI exists anywhere in the codebase). Per this ticket's scoping guidance, building a Soldier-training system was out of scope here. `AIOpponent`'s decision rules therefore treat player military as a hardcoded `0` rather than reading a real value. This should be its own future ticket (something like "Soldier training & player military strength") once that gap is ready to be closed; until then, rule 2 above ("defensive buildup when player military exceeds AI's") is effectively dead code.

**Verification:** `npm run build` succeeds. Ran a live browser check via `chrome-devtools` MCP against `npm run dev -- --port 5176 --strictPort`: grid renders, End Turn works, no console errors. The shared automation browser was available this time (no need to fall back, unlike ticket 12's note about the same infra quirk). Verified actual gameplay behavior by temporarily exposing `(window as any).__game = game` in `main.ts` (removed again before finishing, confirmed via `npm run build` after removal) and driving turns directly against the live scene/TurnManager instances rather than synthetic canvas clicks:
- Placed free Farms via `placeBuildingFree` and ran dozens of turns: observed multiple raids (buildings destroyed, player Gold reduced) matching the ~20%/turn chance and ~15% steal fraction.
- Isolated `AIOpponent`'s `aiTurn`-phase handler from the rest of the turn cycle (ticket 08's concurrent Hazard Events work shares the same `TurnManager` instance and was mid-registration on `hazardRoll` during testing, which otherwise confounds a raid-only test since Hazards also destroy Buildings) and confirmed: a Farm adjacent to a Watchtower was never chosen as a raid target while the Watchtower stood; once the Watchtower itself was raided (it has no adjacent Watchtower of its own, so it's a valid target), the Farm lost its protection and was raided on a later turn — matching the "never selected while defended" acceptance criterion exactly.
- No console errors observed at any point.

Note on concurrent work: `main.ts` briefly had a duplicate-declaration syntax error from both this ticket's and ticket 08's agents adding the same temporary debug hook at the same time; I fixed it in place (single `(window as any).__game = game` line) so both agents could keep testing, then removed my own addition and confirmed the build was clean before finishing.
