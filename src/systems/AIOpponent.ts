import { BUILDING_DEFS, type BuildingType } from '../data/buildings'
import type { ResourceSystem } from './ResourceSystem'
import type { TurnManager } from './TurnManager'

// Off-map AI kingdom (ADR-0002 / "AI Kingdom" glossary entry): tracks only the
// numbers its decision rules (GDD §7) actually reference. No Wood/Stone/Fire/Water/
// Population — the AI never places buildings on a grid, so those resources have
// nothing to model.

// Minimal surface GameBoardScene exposes for raid targeting, so AIOpponent doesn't
// reach into scene internals (mirrors PopulationSystem's constructor-injection
// pattern via a getFarmCount callback).
export interface BuildingTileQuery {
  getAllBuildingTiles(): { row: number; col: number; type: BuildingType }[]
  isTileDefendedByWatchtower(row: number, col: number): boolean
  destroyBuildingAt(row: number, col: number): void
}

// --- Starting state ---
// Gold/Food mirror the player's own INITIAL_RESOURCES (data/resources.ts) so the two
// kingdoms start at rough parity. Military strength has no player-side equivalent to
// mirror (no Soldier-training UI exists yet — see limitation note below), so it gets
// its own modest placeholder baseline.
const AI_STARTING_GOLD = 50
const AI_STARTING_FOOD = 20
const AI_STARTING_MILITARY = 3

// --- Passive off-map economy ---
// The AI has no Buildings to individually simulate, so its "economy" is a single
// flat trickle per turn standing in for Town Hall + Farm output combined. Food
// trickle mirrors a single Farm's base output (3, see data/buildings.ts); Gold
// trickle is set a bit above the player's Town Hall rate (2/turn) to reflect a
// whole off-map kingdom's income rather than one building.
const AI_GOLD_INCOME_PER_TURN = 5
const AI_FOOD_INCOME_PER_TURN = 3

// --- Decision-rule thresholds (GDD §7), checked in priority order each turn ---
// 1. Food shortage is existential, so it's checked first: prioritize Food over
//    military/economy while short.
const FOOD_LOW_THRESHOLD = 10
const FOOD_EMERGENCY_BOOST = 8
// 2. Defensive military buildup if the player's military exceeds the AI's by a
//    margin. Player military is currently always 0 (see limitation below), so in
//    practice this branch is unreachable until a future ticket adds player
//    Soldiers — it's implemented per the ticket's decision rules regardless.
const MILITARY_MARGIN = 3
const MILITARY_DEFENSIVE_BOOST = 3
// 3. Otherwise, invest surplus Gold into economy/military growth.
const GOLD_HIGH_THRESHOLD = 60
const GOLD_INVESTMENT_COST = 20
const MILITARY_GROWTH_BOOST = 2

// --- Raid mechanic ---
// Placeholder chance/steal-fraction, picked from the middle of the ticket's
// suggested 15-25% / 10-20% ranges.
const RAID_CHANCE = 0.2
const RAID_STEAL_FRACTION = 0.15

// --- Difficulty scaling per Age (ticket 11 / documentation.md §8: "AI opponent
// gets stronger [...], more aggressive raids") ---
// A single flat placeholder rate applied uniformly to income and raid
// aggressiveness: effectiveValue = baseValue * (1 + AGE_DIFFICULTY_RATE * (age - 1)).
// Age 1 is baseline (1.0x); Age 3 is 1.3x; Age 5 is 1.6x, etc. Raid chance/steal
// fraction are each clamped to 1.0 so they never exceed certainty/100%.
const AGE_DIFFICULTY_RATE = 0.15

export class AIOpponent {
  private gold = AI_STARTING_GOLD
  private food = AI_STARTING_FOOD
  private militaryStrength = AI_STARTING_MILITARY

  constructor(
    private playerResources: ResourceSystem,
    private buildingQuery: BuildingTileQuery,
    private getAge: () => number,
    // Lets the player know a raid actually landed and what it cost them, instead
    // of the building/resources silently changing with no on-screen feedback.
    private notify: (message: string) => void,
  ) {}

  registerWithTurnManager(turnManager: TurnManager): void {
    turnManager.onPhase('aiTurn', () => this.takeTurn())
  }

  // Exposed for debugging/future HUD use - not required by the ticket's acceptance
  // criteria, but harmless and consistent with ResourceSystem.get()/getAll().
  getState(): { gold: number; food: number; militaryStrength: number } {
    return { gold: this.gold, food: this.food, militaryStrength: this.militaryStrength }
  }

  private getAgeMultiplier(): number {
    return 1 + AGE_DIFFICULTY_RATE * (this.getAge() - 1)
  }

  private takeTurn(): void {
    const ageMultiplier = this.getAgeMultiplier()
    this.gold += AI_GOLD_INCOME_PER_TURN * ageMultiplier
    this.food += AI_FOOD_INCOME_PER_TURN * ageMultiplier

    this.applyDecisionRules()
    this.maybeRaid()
  }

  private applyDecisionRules(): void {
    // Known limitation (see ticket Comments): no ticket in this project's breakdown
    // ever added a way for the player to train Soldiers, so "player military" has
    // no real value to read. Treated as always 0 here rather than building an
    // out-of-scope Soldier-training system.
    const playerMilitary = 0

    if (this.food < FOOD_LOW_THRESHOLD) {
      this.food += FOOD_EMERGENCY_BOOST
    } else if (playerMilitary > this.militaryStrength + MILITARY_MARGIN) {
      this.militaryStrength += MILITARY_DEFENSIVE_BOOST
    } else if (this.gold >= GOLD_HIGH_THRESHOLD) {
      this.gold -= GOLD_INVESTMENT_COST
      this.militaryStrength += MILITARY_GROWTH_BOOST
    }
  }

  private maybeRaid(): void {
    const ageMultiplier = this.getAgeMultiplier()
    const effectiveRaidChance = Math.min(1, RAID_CHANCE * ageMultiplier)
    if (Math.random() >= effectiveRaidChance) return

    const targets = this.buildingQuery
      .getAllBuildingTiles()
      .filter((tile) => !this.buildingQuery.isTileDefendedByWatchtower(tile.row, tile.col))
    if (targets.length === 0) return

    const target = targets[Math.floor(Math.random() * targets.length)]
    this.buildingQuery.destroyBuildingAt(target.row, target.col)

    const effectiveStealFraction = Math.min(1, RAID_STEAL_FRACTION * ageMultiplier)
    const stolenGold = Math.floor(this.playerResources.get('gold') * effectiveStealFraction)
    if (stolenGold > 0) {
      this.playerResources.add('gold', -stolenGold)
      this.gold += stolenGold
    }

    const label = BUILDING_DEFS[target.type].label
    const goldClause = stolenGold > 0 ? ` and ${stolenGold} Gold was stolen` : ''
    this.notify(`Raided! Your ${label} was destroyed${goldClause}.`)
  }
}
