import type { ResourceSystem } from './ResourceSystem'

// Placeholder-but-concrete constant (grilling-session convention, see ScoreSystem):
// a small permanent nudge, not a game-changer. +5 Gold added to the resource pool
// every time an Age completes (applied AFTER ResourceSystem.reset() so the cataclysm
// doesn't wipe it) — flat per completion, so by Age 3 the player has received it
// twice, by Age 4 three times, etc. The "compounding" is this repeated application
// across Ages, not a growing per-Age amount.
const PRESTIGE_GOLD_BONUS_PER_AGE = 5

// PrestigeSystem tracks ticket 10's cross-Age meta-progress: a running counter of
// completed Ages plus the small permanent bonus that survives the cataclysm reset.
// It doesn't hook into any TurnManager phase itself — ScoreSystem invokes
// onAgeComplete() directly (via the onAgeComplete callback passed to its
// constructor) at the exact point in checkThreshold() after resourceSystem.reset()
// but before/alongside the Age increment, so ScoreSystem never needs to know
// PrestigeSystem's internals.
export class PrestigeSystem {
  private agesCompleted = 0

  constructor(private resourceSystem: ResourceSystem) {}

  getAgesCompleted(): number {
    return this.agesCompleted
  }

  // Used when restoring a save (ticket 06 pattern).
  setAgesCompleted(agesCompleted: number): void {
    this.agesCompleted = agesCompleted
  }

  // Called by ScoreSystem's onAgeComplete callback once per cataclysm, after
  // ResourceSystem.reset() so the bonus lands in the fresh Age's resource pool.
  onAgeComplete(): void {
    this.agesCompleted += 1
    this.resourceSystem.add('gold', PRESTIGE_GOLD_BONUS_PER_AGE)
  }
}
