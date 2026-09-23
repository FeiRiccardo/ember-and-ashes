# Ember & Ashes

A browser-based, turn-based fantasy kingdom strategy game with a prestige/reset loop ("Ages").

## Language

**Population**:
A tracked resource (alongside Gold, Food, Wood, Stone, Fire, Water) representing the kingdom's inhabitants. Grows when Food is in surplus, stalls/shrinks on Food deficit. Not tied to a dedicated housing building.

**AI Kingdom**:
The rival opponent, modeled as an off-map abstraction — never rendered as tiles on the player's 8x8 grid. Tracks only the numbers its decision rules need: Gold, Food, and military strength. Raids are resolved as discrete events, not grid movement.
_Avoid_: AI player's territory, enemy tiles

**Tile**:
One cell of the 8x8 grid. Has a fixed terrain type (Plains, Forest, Hills, River/Water, Volcanic/Fire) that persists even once a Building occupies it — placing a Building doesn't erase the underlying terrain, it just marks the tile occupied (at most one Building per tile).

**Population Cap**:
The maximum Population a kingdom can sustain in the current Age, derived from Farm count (plus a Town Hall baseline). Population cannot grow past it even with Food surplus.

**Hazard Event**:
A random Fire or Flood occurrence (frequency scales per Age, §8) that strikes a Building, either damaging it (temporary output loss) or destroying it outright — a 50/50 roll decides which. Terrain-gated: Fire only threatens Buildings on Volcanic or Forest tiles, Flood only threatens Buildings on River/Water-adjacent tiles.

**Raid**:
An AI-initiated attack on the player's weakest undefended tile (one with no adjacent Watchtower). Always both destroys the Building on that tile and steals a portion of banked resources.

**Soldier**:
A unit whose count feeds the "military strength" number the AI's decision loop compares itself against (§7). Has no direct offensive action in v1 — purely a deterrence/comparison stat plus Gold+Food upkeep. The only unit type in v1 — Settler and Trader (both listed as "(optional)" in the GDD) are cut/deferred, since the player owns the full 8x8 grid from the start (no territory left to claim) and AI trade is Market-only for v1.
