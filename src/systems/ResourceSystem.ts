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

// Age-1-only starting bonus (placeholder-but-concrete, tunable via playtesting): a gentler
// first run without touching INITIAL_RESOURCES itself, since that baseline is also what every
// later Age restarts from and those should stay on the harder, unscaled numbers. Stone's +5
// specifically covers a Watchtower's 15-Stone cost from the start. Population/Fire/Water are
// untouched — growth and terrain-gathered resources aren't the kind of thing a flat starting
// gift makes sense for.
const AGE_ONE_RESOURCE_BONUS: Partial<Record<ResourceType, number>> = {
  gold: 20,
  food: 10,
  wood: 10,
  stone: 5,
}

function ageOneStartingResources(): Record<ResourceType, number> {
  const amounts = { ...INITIAL_RESOURCES }
  for (const [resource, bonus] of Object.entries(AGE_ONE_RESOURCE_BONUS) as [ResourceType, number][]) {
    amounts[resource] += bonus
  }
  return amounts
}

export class ResourceSystem {
  private amounts: Record<ResourceType, number> = ageOneStartingResources()

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
  // layered on top of this baseline reset. Deliberately the harder, un-bonused
  // baseline — only the true Age 1 start gets resetToAgeOne()'s training wheels.
  reset(): void {
    this.amounts = { ...INITIAL_RESOURCES }
  }

  // Used by Reset Game (a full restart back to Age 1): same Age-1-only bonus the
  // constructor applies on first-ever load, so starting over feels the same either way.
  resetToAgeOne(): void {
    this.amounts = ageOneStartingResources()
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
