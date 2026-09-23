import { TERRAIN_WEIGHTS, type TerrainType } from '../data/terrain'

// Deterministic seeded PRNG (mulberry32) so a given seed always reproduces the same map.
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickTerrain(roll: number): TerrainType {
  let cumulative = 0
  for (const { type, weight } of TERRAIN_WEIGHTS) {
    cumulative += weight
    if (roll < cumulative) return type
  }
  return TERRAIN_WEIGHTS[TERRAIN_WEIGHTS.length - 1].type
}

export function generateMap(seed: number, size = 8): TerrainType[][] {
  const random = mulberry32(seed)
  const map: TerrainType[][] = []
  for (let row = 0; row < size; row++) {
    const rowTiles: TerrainType[] = []
    for (let col = 0; col < size; col++) {
      rowTiles.push(pickTerrain(random()))
    }
    map.push(rowTiles)
  }
  return map
}
