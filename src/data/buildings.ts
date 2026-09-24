import type { ResourceType } from './resources'

export type BuildingType =
  | 'townHall'
  | 'farm'
  | 'sawmill'
  | 'quarry'
  | 'forge'
  | 'market'
  | 'watchtower'

export interface BuildingDef {
  type: BuildingType
  label: string
  color: number
  // Town Hall is placed automatically at game start and never appears in the build menu.
  buildable: boolean
  cost: Partial<Record<ResourceType, number>>
  // Passive Food output per turn (Farm only for v1) and its Water-adjacency bonus.
  foodOutput?: number
  foodWaterBonus?: number
  // Passive Wood output per turn (Sawmill) and its on-Forest bonus (structure-effects-preview
  // ticket 01): built directly on Forest beats merely being adjacent to one.
  woodOutput?: number
  woodForestBonus?: number
  // Passive Stone output per turn (Quarry) and its Volcanic-adjacency bonus.
  stoneOutput?: number
  stoneVolcanicBonus?: number
  // Passive Fire output per turn (Forge) and its Volcanic-adjacency bonus (on or adjacent).
  fireOutput?: number
  fireVolcanicBonus?: number
  // Score contribution per building placed (locked during grilling; §8 formula).
  prestigeValue: number
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  // Colors (ticket 13): a cohesive warm flat palette grouped by material family
  // — gold/bronze for the two "prestige" gold buildings, wood brown for
  // Sawmill, warm vs. cool stone grays for Quarry/Watchtower, ember orange for
  // Forge (echoes the Fire resource + volcanic terrain), clay terracotta for
  // Market. Each building also gets a distinct flat icon drawn with Phaser
  // shape primitives in GameBoardScene.drawBuildingOverlay(), so color is a
  // secondary cue, not the only one distinguishing buildings.
  townHall: {
    type: 'townHall',
    label: 'Town Hall',
    color: 0xb8860b,
    buildable: false,
    cost: {},
    prestigeValue: 20,
  },
  farm: {
    type: 'farm',
    label: 'Farm',
    color: 0xd4b23c,
    buildable: true,
    cost: { gold: 5, wood: 15 },
    foodOutput: 3,
    foodWaterBonus: 2,
    prestigeValue: 15,
  },
  sawmill: {
    type: 'sawmill',
    label: 'Sawmill',
    color: 0x7a4a2b,
    buildable: true,
    cost: { gold: 10, stone: 5 },
    woodOutput: 4,
    woodForestBonus: 2,
    prestigeValue: 15,
  },
  quarry: {
    type: 'quarry',
    label: 'Quarry',
    color: 0x9b9587,
    buildable: true,
    cost: { gold: 10, wood: 15 },
    stoneOutput: 4,
    stoneVolcanicBonus: 2,
    prestigeValue: 15,
  },
  forge: {
    type: 'forge',
    label: 'Forge',
    color: 0xe0521c,
    buildable: true,
    cost: { gold: 15, stone: 20 },
    fireOutput: 3,
    fireVolcanicBonus: 2,
    prestigeValue: 30,
  },
  market: {
    type: 'market',
    label: 'Market',
    color: 0xc1652f,
    buildable: true,
    cost: { gold: 25, wood: 10 },
    prestigeValue: 20,
  },
  watchtower: {
    type: 'watchtower',
    label: 'Watchtower',
    color: 0x4a4e5a,
    buildable: true,
    cost: { gold: 10, stone: 15 },
    prestigeValue: 10,
  },
}

export const BUILDABLE_TYPES: BuildingType[] = [
  'farm',
  'sawmill',
  'quarry',
  'forge',
  'market',
  'watchtower',
]
