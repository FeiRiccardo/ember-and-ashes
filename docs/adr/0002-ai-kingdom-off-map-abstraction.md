# AI kingdom as off-map abstraction

We considered giving the AI a visible rival kingdom sharing the same 8x8 grid as the player, matching the typical 4X-genre shape the GDD is loosely based on. We chose a pure-data opponent instead — tracking only Gold, Food, and military strength, the numbers its decision rules (§7) actually reference — because splitting a 64-tile board between two kingdoms cramps the player's space for little payoff, and it keeps AISystem as simple as §7 intends. Raids and (future) trade are resolved as discrete events against this data model, not grid movement.
