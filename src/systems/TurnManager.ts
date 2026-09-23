export type TurnPhase =
  | 'production'
  | 'populationGrowth'
  | 'constructionCompletion'
  | 'aiTurn'
  | 'hazardRoll'
  | 'scoreThresholdCheck'
  | 'autoSave'

const PHASE_ORDER: TurnPhase[] = [
  'production',
  'populationGrowth',
  'constructionCompletion',
  'aiTurn',
  'hazardRoll',
  'scoreThresholdCheck',
  'autoSave',
]

type PhaseHandler = () => void

export class TurnManager {
  private turnNumber = 1
  private handlers: Record<TurnPhase, PhaseHandler[]> = {
    production: [],
    populationGrowth: [],
    constructionCompletion: [],
    aiTurn: [],
    hazardRoll: [],
    scoreThresholdCheck: [],
    autoSave: [],
  }

  onPhase(phase: TurnPhase, handler: PhaseHandler): void {
    this.handlers[phase].push(handler)
  }

  getTurnNumber(): number {
    return this.turnNumber
  }

  // Used when restoring a save (ticket 06).
  setTurnNumber(turnNumber: number): void {
    this.turnNumber = turnNumber
  }

  endTurn(): number {
    // All phases except autoSave see the turn that's ending (unchanged since
    // ticket 08's Hazard Events math relies on this for its recovery-turn
    // countdown). autoSave runs after the increment so a handler reading
    // getTurnNumber() during that phase sees the same number the UI will show.
    for (const phase of PHASE_ORDER) {
      if (phase === 'autoSave') continue
      for (const handler of this.handlers[phase]) {
        handler()
      }
    }
    this.turnNumber += 1
    for (const handler of this.handlers.autoSave) {
      handler()
    }
    return this.turnNumber
  }
}
