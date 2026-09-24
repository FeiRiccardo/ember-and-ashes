import type { TerrainType } from '../data/terrain'
import { BUILDING_DEFS, type BuildingType } from '../data/buildings'
import { hasWaterBonus, hasForestBonus, hasVolcanicAdjacency } from './BuildingPlacement'

export interface EffectContext {
  row: number
  col: number
  terrainMap: TerrainType[][]
  // Town Hall's Gold trickle tapers per Age (ResourceSystem.getTownHallIncome); every other
  // building's numbers are flat, so this is the only place Age matters here.
  townHallIncome: number
  // Live state for an already-placed Market (ticket 05): whether it's used this turn's one
  // conversion already. Always false for a not-yet-placed candidate tile in the build menu.
  marketUsedThisTurn?: boolean
}

// Shared by the build-menu preview (ticket 03) and the click-to-inspect panel (ticket 04): both
// want the same tile-specific text, since the build menu already opens bound to one exact tile
// just like the inspect panel does, so there's no "generic" vs. "live" distinction to make.
export function describeBuildingEffect(type: BuildingType, ctx: EffectContext): string {
  const def = BUILDING_DEFS[type]

  switch (type) {
    case 'townHall':
      return `+${ctx.townHallIncome} Gold/turn`

    case 'farm':
      return describeBaseAndBonus(
        def.foodOutput ?? 0,
        def.foodWaterBonus ?? 0,
        hasWaterBonus(ctx.row, ctx.col, ctx.terrainMap),
        'Food',
        'adjacent to Water',
      )

    case 'sawmill':
      return describeBaseAndBonus(
        def.woodOutput ?? 0,
        def.woodForestBonus ?? 0,
        hasForestBonus(ctx.row, ctx.col, ctx.terrainMap),
        'Wood',
        'built directly on Forest',
      )

    case 'quarry':
      return describeBaseAndBonus(
        def.stoneOutput ?? 0,
        def.stoneVolcanicBonus ?? 0,
        hasVolcanicAdjacency(ctx.row, ctx.col, ctx.terrainMap),
        'Stone',
        'adjacent to Volcanic',
      )

    case 'forge':
      return describeBaseAndBonus(
        def.fireOutput ?? 0,
        def.fireVolcanicBonus ?? 0,
        hasVolcanicAdjacency(ctx.row, ctx.col, ctx.terrainMap),
        'Fire',
        'built on or adjacent to Volcanic',
      )

    case 'watchtower':
      return 'Protects adjacent tiles from AI raids'

    case 'market':
      // Player-triggered, not a passive per-turn number (ticket 05's Convert buttons do
      // the actual work) — this just describes the mechanic and its current live state.
      return ctx.marketUsedThisTurn
        ? 'Convert Wood/Stone to Gold — already converted this turn'
        : 'Convert Wood/Stone to Gold, once per turn'
  }
}

function describeBaseAndBonus(
  base: number,
  bonus: number,
  bonusActive: boolean,
  resource: string,
  condition: string,
): string {
  if (bonusActive) {
    return `+${base + bonus} ${resource}/turn (+${bonus} for ${condition})`
  }
  return `+${base} ${resource}/turn (+${bonus} if ${condition})`
}
