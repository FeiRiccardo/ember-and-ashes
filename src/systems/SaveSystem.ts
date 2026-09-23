import type { TerrainType } from '../data/terrain'
import type { BuildingType } from '../data/buildings'
import type { ResourceType } from '../data/resources'

const SAVE_KEY = 'ember-and-ashes-save'
// Bumped for ticket 10 (Prestige Carry-Over): SaveData gained `agesCompleted`. An old
// save without that field would otherwise load with it `undefined` instead of 0; per
// ticket 06's "no existing save begins a fresh game" behavior, a version mismatch
// discards the old save and starts fresh rather than risk a malformed load.
const SAVE_VERSION = 2

export interface SaveData {
  version: number
  terrainMap: TerrainType[][]
  buildings: (BuildingType | null)[][]
  farmWaterBonus: boolean[][]
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
}
