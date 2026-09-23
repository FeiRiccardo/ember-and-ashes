import { BUILDING_DEFS, type BuildingType } from '../data/buildings'
import type { ResourceType } from '../data/resources'
import type { ResourceSystem } from './ResourceSystem'
import type { TurnManager } from './TurnManager'

// Placeholder-but-concrete constants (grilling-session convention): shapes are
// locked, exact numbers are tunable later via playtesting.
const POPULATION_SCORE_WEIGHT = 10
const RESOURCE_GOLD_EQUIVALENT_WEIGHT = 1
const THRESHOLD_BASE = 1000
const THRESHOLD_GROWTH_RATE = 1.5

export interface ScoreBoard {
  getAllBuildingTiles(): { row: number; col: number; type: BuildingType }[]
  resetForNewAge(): void
}

export class ScoreSystem {
  private age = 1

  constructor(
    private resourceSystem: ResourceSystem,
    private board: ScoreBoard,
    // Ticket 10 (Prestige Carry-Over): invoked once per cataclysm, after
    // resourceSystem.reset(), so a PrestigeSystem can apply its permanent bonus and
    // bump its own Ages-completed counter without ScoreSystem knowing its internals.
    private onAgeComplete?: () => void,
  ) {}

  registerWithTurnManager(turnManager: TurnManager): void {
    turnManager.onPhase('scoreThresholdCheck', () => this.checkThreshold())
  }

  getAge(): number {
    return this.age
  }

  // Used when restoring a save (ticket 06).
  setAge(age: number): void {
    this.age = age
  }

  // score = 10×Population + Σ(building prestige value) + banked resources at Gold-equivalent
  computeScore(): number {
    const population = this.resourceSystem.get('population')

    const buildingScore = this.board
      .getAllBuildingTiles()
      .reduce((sum, tile) => sum + BUILDING_DEFS[tile.type].prestigeValue, 0)

    const resources = this.resourceSystem.getAll()
    const resourceScore = (Object.keys(resources) as ResourceType[])
      .filter((resource) => resource !== 'population')
      .reduce((sum, resource) => sum + resources[resource] * RESOURCE_GOLD_EQUIVALENT_WEIGHT, 0)

    return population * POPULATION_SCORE_WEIGHT + buildingScore + resourceScore
  }

  getThreshold(): number {
    return Math.round(THRESHOLD_BASE * THRESHOLD_GROWTH_RATE ** (this.age - 1))
  }

  private checkThreshold(): void {
    if (this.computeScore() < this.getThreshold()) return

    this.age += 1
    this.resourceSystem.reset()
    this.onAgeComplete?.()
    this.board.resetForNewAge()
  }
}
