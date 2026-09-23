# 16: Hints Panel

**What to build:** A toggle that shows/hides a panel of contextual tips on what to do next, computed from the current game state rather than a static rules list.

**Blocked by:** 03 (Resource System), 04 (Building Placement), 09 (Score, Destruction Threshold & Age Reset)

**Status:** ready-for-agent

- [x] A "Hints" toggle is available during a game session
- [x] Toggling it on shows a panel of 1-4 short, relevant tips; toggling it off hides it
- [x] The tips reflect the current game state (e.g. missing a Farm, no Watchtower, surplus Gold, score nearing the threshold), not just a fixed list
- [x] The panel refreshes automatically each turn while it's toggled on

## Comments

Implemented as a pure function, `computeHints()` in a new `src/systems/HintSystem.ts` — takes a plain snapshot of relevant state (Gold, Food, Population, turn number, Farm/Watchtower counts, total buildings, score, threshold) and returns a prioritized list of up to 4 tip strings. Kept as a plain function rather than a class since it holds no state of its own; `GameBoardScene` calls it fresh whenever the panel needs to (re)render.

Current tip rules, in priority order: first building placement nudge (turn 1, ≤1 building), no Farm yet, no Watchtower yet (once there's something worth defending), surplus Gold with few buildings, and score closing in on the Destruction Threshold (≥70%) — falling back to a generic "click End Turn" tip if none of those apply.

A "Hints" button sits alongside Reset and Save & Quit in the bottom bar's second row. Toggling it on renders the panel anchored to the bottom of the grid (the Kingdom Report notification panel from ticket 15 anchors to the top, so the two never overlap even if both are showing at once). `handleEndTurn()` re-renders the panel each turn if it's currently visible, so the tips stay current as the game state changes; toggling off simply destroys it.

Verified in a real browser: toggled Hints on with a fresh game and confirmed it showed the expected early-game tips ("Click any empty tile...", "Build a Farm..."); toggled off and confirmed the panel disappeared cleanly. No console errors.
