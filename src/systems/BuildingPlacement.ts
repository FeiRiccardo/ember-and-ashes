import type { TerrainType } from '../data/terrain'
import { BUILDING_DEFS, type BuildingType } from '../data/buildings'
import type { ResourceSystem } from './ResourceSystem'
import type { ResourceType } from '../data/resources'

export type BuildingGrid = (BuildingType | null)[][]

function neighbors(row: number, col: number, size: number): [number, number][] {
  const deltas: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  return deltas
    .map(([dr, dc]): [number, number] => [row + dr, col + dc])
    .filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size)
}

// Sawmill: on/near Forest (GDD §5). Quarry: on Hills only. Everything else is unconstrained for v1.
export function isTerrainSatisfied(
  type: BuildingType,
  row: number,
  col: number,
  terrainMap: TerrainType[][],
): boolean {
  const size = terrainMap.length
  if (type === 'sawmill') {
    if (terrainMap[row][col] === 'forest') return true
    return neighbors(row, col, size).some(([r, c]) => terrainMap[r][c] === 'forest')
  }
  if (type === 'quarry') {
    return terrainMap[row][col] === 'hills'
  }
  return true
}

// Farm gets a Food bonus when adjacent to a River/Water tile (GDD §5).
export function hasWaterBonus(row: number, col: number, terrainMap: TerrainType[][]): boolean {
  const size = terrainMap.length
  return neighbors(row, col, size).some(([r, c]) => terrainMap[r][c] === 'water')
}

// Sawmill gets a Wood bonus when built directly on Forest, beating merely being adjacent
// to one (structure-effects-preview ticket 01) — the two are otherwise treated as equally
// valid by isTerrainSatisfied's own on/near-Forest check above.
export function hasForestBonus(row: number, col: number, terrainMap: TerrainType[][]): boolean {
  return terrainMap[row][col] === 'forest'
}

// Quarry/Forge get a bonus when on or adjacent to a Volcanic tile (structure-effects-preview
// ticket 01). Quarry can never actually be "on" Volcanic (it requires Hills to place), so for
// Quarry this reduces to adjacency only; Forge has no placement constraint, so both count.
export function hasVolcanicAdjacency(row: number, col: number, terrainMap: TerrainType[][]): boolean {
  const size = terrainMap.length
  if (terrainMap[row][col] === 'volcanic') return true
  return neighbors(row, col, size).some(([r, c]) => terrainMap[r][c] === 'volcanic')
}

export function canAfford(type: BuildingType, resourceSystem: ResourceSystem): boolean {
  const cost = BUILDING_DEFS[type].cost
  return (Object.entries(cost) as [ResourceType, number][]).every(
    ([resource, amount]) => resourceSystem.get(resource) >= amount,
  )
}

export function deductCost(type: BuildingType, resourceSystem: ResourceSystem): void {
  const cost = BUILDING_DEFS[type].cost
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    resourceSystem.add(resource, -amount)
  }
}

export function formatCost(type: BuildingType): string {
  const cost = BUILDING_DEFS[type].cost
  return (Object.entries(cost) as [ResourceType, number][])
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(', ')
}
