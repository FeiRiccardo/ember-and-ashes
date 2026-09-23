# 15: Raid & Hazard Notifications

**What to build:** When the AI raids the player or a Hazard Event strikes a building, show a clear, dismissible summary of what happened — previously these events changed game state silently with no on-screen feedback.

**Blocked by:** 07 (AI Opponent), 08 (Hazard Events)

**Status:** ready-for-agent

- [x] A raid that actually lands shows a message naming the building lost and how much Gold was stolen
- [x] A Hazard Event that actually strikes a building shows a message naming the hazard type, the building, and whether it was destroyed or damaged (with recovery time)
- [x] Multiple events in the same turn are all shown together, not just the last one
- [x] The report is dismissible and doesn't block play

## Comments

`AIOpponent` and `HazardSystem` each gained a `notify: (message: string) => void` constructor parameter (same DI pattern as their existing `getAge` callback), called only when an event actually affects a building — never on a "rolled but no eligible target" skip, so the report only ever reflects real changes. `GameBoardScene` wires both to `(message) => this.pendingEvents.push(message)`.

`pendingEvents` is cleared at the start of `handleEndTurn()`, filled during that same `turnManager.endTurn()` call (both `aiTurn` and `hazardRoll` phases can push independently), and then handed to a new `showNotifications()` method that renders a "Kingdom Report" panel — one line per message — with a "Dismiss" link. No auto-fade timer: per the GDD's own "no timers, no real-time pressure" philosophy (§10), a message that disappears on its own would work against the game's whole pacing, so it stays up until the player dismisses it or ends another turn (which replaces it with that turn's own report, or clears it if nothing happened).

Sample messages: `"Raided! Your Farm was destroyed and 8 Gold was stolen."`, `"Fire! Your Town Hall was damaged — it recovers in 3 turns."`, `"Flood! Your Sawmill was destroyed."`

Verified in a real browser: played through several turns and captured a real Hazard Event firing naturally (not artificially forced) — the report correctly read "Fire! Your Town Hall was damaged — it recovers in 3 turns," matching the actual state change (`buildings[3][3]` went to `null` with a pending restore scheduled 3 turns out). Confirmed the panel is positioned clear of the Hints panel (top of the grid vs. bottom) so the two don't overlap when both are showing. No console errors.
