import type { ResourceSystem } from './ResourceSystem'
import type { TurnManager } from './TurnManager'

// Placeholder-but-concrete constants (grilling-session convention): shape is locked,
// exact numbers are tunable later. Population cap formula (10 + 5×Farms) was fixed
// during grilling and lives here alongside the rest of the loop it governs.
const FOOD_PER_POPULATION_UPKEEP = 1
const POPULATION_BASE_CAP = 10
const POPULATION_CAP_PER_FARM = 5

export class PopulationSystem {
  constructor(
    private resourceSystem: ResourceSystem,
    private getFarmCount: () => number,
  ) {}

  registerWithTurnManager(turnManager: TurnManager): void {
    turnManager.onPhase('populationGrowth', () => this.applyGrowth())
  }

  private getCap(): number {
    return POPULATION_BASE_CAP + POPULATION_CAP_PER_FARM * this.getFarmCount()
  }

  private applyGrowth(): void {
    const population = this.resourceSystem.get('population')
    const upkeep = population * FOOD_PER_POPULATION_UPKEEP
    const food = this.resourceSystem.get('food')

    if (food >= upkeep) {
      this.resourceSystem.add('food', -upkeep)
      if (population < this.getCap()) {
        this.resourceSystem.add('population', 1)
      }
    } else {
      this.resourceSystem.add('food', -food)
      if (population > 0) {
        this.resourceSystem.add('population', -1)
      }
    }
  }
}
