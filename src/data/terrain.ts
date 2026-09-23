export type TerrainType = 'plains' | 'forest' | 'hills' | 'water' | 'volcanic'

// Flat, intentional palette (ticket 13): warm-leaning hues so the 5 terrain
// types stay legible next to each other even for viewers who don't cleanly
// separate similar greens/browns — plains reads yellow-green, forest reads
// deep cool green, hills reads warm clay-brown, water reads clear blue,
// volcanic reads ember red-brown. Paired with a small drawn texture motif per
// type in GameBoardScene.drawGrid() for a second, non-color cue.
export const TERRAIN_COLORS: Record<TerrainType, number> = {
  plains: 0xb5c177,
  forest: 0x2e5233,
  hills: 0xa8814f,
  water: 0x3b7da8,
  volcanic: 0x7a2a1d,
}

// Cumulative weights: Plains most common, Volcanic rare but resource-rich (GDD §3).
export const TERRAIN_WEIGHTS: { type: TerrainType; weight: number }[] = [
  { type: 'plains', weight: 0.4 },
  { type: 'forest', weight: 0.2 },
  { type: 'hills', weight: 0.2 },
  { type: 'water', weight: 0.15 },
  { type: 'volcanic', weight: 0.05 },
]
