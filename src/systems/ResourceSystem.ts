import { INITIAL_RESOURCES, type ResourceType } from '../data/resources'
import type { TurnManager } from './TurnManager'

// Town Hall is always present (GDD §5) and produces a passive Gold trickle even
// before Building Placement (ticket 04) exists.
const TOWN_HALL_GOLD_PER_TURN = 2

// Difficulty scaling per Age (ticket 11 / documentation.md §8: "resource income per
// turn tapers slightly"). Placeholder taper rate/shape, mirroring AIOpponent's/
// HazardSystem's AGE_DIFFICULTY_RATE/AGE_HAZARD_RATE: effectiveIncome = base *
// max(TOWN_HALL_TAPER_FLOOR, 1 - TOWN_HALL_TAPER_RATE * (age - 1)). The floor keeps
// the trickle from ever hitting zero or going negative, just gradually shrinking.
const TOWN_HALL_TAPER_RATE = 0.1
const TOWN_HALL_TAPER_FLOOR = 0.5

export class ResourceSystem {
  private amounts: Record<ResourceType, number> = { ...INITIAL_RESOURCES }

  get(resource: ResourceType): number {
    return this.amounts[resource]
  }

  add(resource: ResourceType, delta: number): void {
    this.amounts[resource] += delta
  }

  getAll(): Record<ResourceType, number> {
    return { ...this.amounts }
  }

  // Used when a new Age begins (ticket 09): the run's banked resources don't
  // carry across a cataclysm. Permanent cross-Age bonuses are ticket 10's job,
  // layered on top of this baseline reset.
  reset(): void {
    this.amounts = { ...INITIAL_RESOURCES }
  }

  // Used when restoring a save (ticket 06).
  setAll(amounts: Record<ResourceType, number>): void {
    this.amounts = { ...amounts }
  }

  // Extracted so the structure-effects-preview UI (build-menu preview, inspect panel) can
  // describe Town Hall's current Age-tapered income without duplicating the taper formula.
  getTownHallIncome(age: number): number {
    const taperMultiplier = Math.max(TOWN_HALL_TAPER_FLOOR, 1 - TOWN_HALL_TAPER_RATE * (age - 1))
    return Math.round(TOWN_HALL_GOLD_PER_TURN * taperMultiplier * 10) / 10
  }

  registerWithTurnManager(turnManager: TurnManager, getAge: () => number): void {
    turnManager.onPhase('production', () => {
      this.add('gold', this.getTownHallIncome(getAge()))
    })
  }
}
