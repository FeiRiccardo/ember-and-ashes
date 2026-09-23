import type { TerrainType } from '../data/terrain'
import type { BuildingType } from '../data/buildings'
import type { TurnManager } from './TurnManager'

// Placeholder-but-concrete constants (PopulationSystem's convention): shape is locked,
// exact numbers are tunable later. Age-based frequency scaling (documentation.md §8) is a
// separate, later ticket — this is just the flat per-turn base rate.
const HAZARD_CHANCE = 0.15 // 15% chance per turn that a hazard fires at all
const DAMAGE_RECOVERY_TURNS = 3 // turns until a damaged building's rebuild lands

// Difficulty scaling per Age (ticket 11 / documentation.md §8: "random hazard events
// [...] become more frequent"). Same flat placeholder rate/shape as AIOpponent's
// AGE_DIFFICULTY_RATE: effectiveChance = HAZARD_CHANCE * (1 + AGE_HAZARD_RATE * (age - 1)),
// clamped to 1.0 so it never exceeds certainty.
const AGE_HAZARD_RATE = 0.15

// Must match GameBoardScene's own GRID_SIZE (not exported/shared elsewhere in the codebase).
const GRID_SIZE = 8

// Minimal surface HazardSystem needs from GameBoardScene, so it can be constructed with
// `this` there without either file depending on the other's concrete class.
export interface HazardBoard {
  getTerrainAt(row: number, col: number): TerrainType
  getAllBuildingTiles(): { row: number; col: number; type: BuildingType }[]
  destroyBuildingAt(row: number, col: number): void
  placeBuildingFree(row: number, col: number, type: BuildingType): void
}

interface PendingRestore {
  row: number
  col: number
  type: BuildingType
  dueTurn: number
}

// Mirrors BuildingPlacement.ts's `hasWaterBonus` 4-directional adjacency check, generalized
// to any tile (that helper is Farm-specific and reads a terrainMap array directly).
function isAdjacentToWater(row: number, col: number, board: HazardBoard): boolean {
  const deltas: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  return deltas.some(([dr, dc]) => {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false
    return board.getTerrainAt(r, c) === 'water'
  })
}

export class HazardSystem {
  private pendingRestores: PendingRestore[] = []

  constructor(
    private board: HazardBoard,
    private getTurnNumber: () => number,
    private getAge: () => number,
  ) {}

  registerWithTurnManager(turnManager: TurnManager): void {
    turnManager.onPhase('hazardRoll', () => this.tick())
  }

  private getEffectiveHazardChance(): number {
    return Math.min(1, HAZARD_CHANCE * (1 + AGE_HAZARD_RATE * (this.getAge() - 1)))
  }

  private tick(): void {
    // Resolve any due restores before considering a new hazard this turn.
    this.resolvePendingRestores()

    if (Math.random() >= this.getEffectiveHazardChance()) return

    // Union of Fire-eligible (Volcanic/Forest) and Flood-eligible (Water-adjacent) tiles
    // that currently hold a building.
    const eligible: { row: number; col: number; type: BuildingType }[] = []
    for (const tile of this.board.getAllBuildingTiles()) {
      const terrain = this.board.getTerrainAt(tile.row, tile.col)
      const fireEligible = terrain === 'volcanic' || terrain === 'forest'
      const floodEligible = isAdjacentToWater(tile.row, tile.col, this.board)
      if (fireEligible || floodEligible) {
        eligible.push(tile)
      }
    }

    if (eligible.length === 0) return // no eligible tiles this turn: skip silently

    const target = eligible[Math.floor(Math.random() * eligible.length)]
    const destroy = Math.random() < 0.5

    // Damage is implemented as an immediate destroy plus a tracked future restore, so
    // production code (Farm output, Population cap, etc.) needs no "is this disabled"
    // branch anywhere else — the building is simply gone until it comes back.
    this.board.destroyBuildingAt(target.row, target.col)
    if (!destroy) {
      this.pendingRestores.push({
        row: target.row,
        col: target.col,
        type: target.type,
        dueTurn: this.getTurnNumber() + DAMAGE_RECOVERY_TURNS,
      })
    }
  }

  private resolvePendingRestores(): void {
    const currentTurn = this.getTurnNumber()
    const due = this.pendingRestores.filter((restore) => currentTurn >= restore.dueTurn)
    if (due.length === 0) return

    this.pendingRestores = this.pendingRestores.filter((restore) => currentTurn < restore.dueTurn)
    for (const restore of due) {
      this.board.placeBuildingFree(restore.row, restore.col, restore.type)
    }
  }
}
