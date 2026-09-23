// Pure, stateless hint generator: given a snapshot of the current game state,
// returns a short, prioritized list of contextual tips on what to do next.
// Kept as a plain function (not a class) since it holds no state of its own —
// GameBoardScene calls it fresh each time the Hints panel needs to refresh.

export interface HintContext {
  gold: number
  food: number
  population: number
  turnNumber: number
  farmCount: number
  watchtowerCount: number
  totalBuildings: number
  score: number
  threshold: number
}

const MAX_HINTS = 4

// Surplus Gold worth pointing out; matches the "high Gold" investment
// threshold AIOpponent itself uses (GOLD_HIGH_THRESHOLD), so the hint fires
// around the same point a player's stockpile starts feeling excessive.
const SURPLUS_GOLD_THRESHOLD = 60
const SURPLUS_GOLD_BUILDING_CAP = 4
const THRESHOLD_WARNING_FRACTION = 0.7

export function computeHints(ctx: HintContext): string[] {
  const hints: string[] = []

  if (ctx.turnNumber <= 1 && ctx.totalBuildings <= 1) {
    hints.push('Click any empty tile to open the build menu and place your first building.')
  }

  if (ctx.farmCount === 0) {
    hints.push('Build a Farm to produce Food — without one, your Population will shrink over time.')
  }

  if (ctx.watchtowerCount === 0 && ctx.totalBuildings > 1) {
    hints.push('Build a Watchtower — it protects every adjacent tile from AI raids.')
  }

  if (ctx.gold >= SURPLUS_GOLD_THRESHOLD && ctx.totalBuildings < SURPLUS_GOLD_BUILDING_CAP) {
    hints.push('You have surplus Gold — consider expanding with a Market, Forge, or another Farm.')
  }

  if (ctx.threshold > 0 && ctx.score / ctx.threshold >= THRESHOLD_WARNING_FRACTION) {
    hints.push(
      'Your Score is closing in on the Destruction Threshold — a cataclysm will reset the map soon. Keep building to make the most of this Age!',
    )
  }

  if (hints.length === 0) {
    hints.push(
      'Click End Turn to progress — production, population growth, the AI, and hazards all resolve automatically.',
    )
  }

  return hints.slice(0, MAX_HINTS)
}
