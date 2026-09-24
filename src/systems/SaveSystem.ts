import type { TerrainType } from '../data/terrain'
import type { BuildingType } from '../data/buildings'
import type { ResourceType } from '../data/resources'

const SAVE_KEY = 'ember-and-ashes-save'
// Separate key (not part of SaveData/SAVE_VERSION): whether the rules modal has ever been
// dismissed. Deliberately independent of the save-game state so it survives Reset Game (the
// player hasn't forgotten the rules just because their kingdom did) and isn't wiped by a
// future SAVE_VERSION bump.
const RULES_SEEN_KEY = 'ember-and-ashes-rules-seen'
// Bumped for structure-effects-preview tickets 01 (three new per-tile bonus grids: Sawmill/
// Quarry/Forge) and 05 (Market's per-tile one-conversion-per-turn flag). Same reasoning as the
// version-2 bump for `agesCompleted` — an old save without these fields would load with
// `undefined` instead of a boolean grid, so a version mismatch discards the old save and
// starts fresh rather than risk a malformed load.
const SAVE_VERSION = 4

export interface SaveData {
  version: number
  terrainMap: TerrainType[][]
  buildings: (BuildingType | null)[][]
  farmWaterBonus: boolean[][]
  sawmillForestBonus: boolean[][]
  quarryVolcanicBonus: boolean[][]
  forgeVolcanicBonus: boolean[][]
  marketConversionUsed: boolean[][]
  resources: Record<ResourceType, number>
  turnNumber: number
  age: number
  agesCompleted: number
}

export class SaveSystem {
  save(data: Omit<SaveData, 'version'>): void {
    const payload: SaveData = { version: SAVE_VERSION, ...data }
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  }

  load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as SaveData
      if (parsed.version !== SAVE_VERSION) return null
      return parsed
    } catch {
      return null
    }
  }

  // Used by the Reset Game feature: wipes the save so a fresh game starts
  // immediately, with nothing left to reload on next visit.
  clear(): void {
    localStorage.removeItem(SAVE_KEY)
  }

  hasSeenRules(): boolean {
    return localStorage.getItem(RULES_SEEN_KEY) !== null
  }

  markRulesSeen(): void {
    localStorage.setItem(RULES_SEEN_KEY, '1')
  }
}
