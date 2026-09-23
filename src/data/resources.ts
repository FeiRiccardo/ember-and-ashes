export type ResourceType = 'gold' | 'food' | 'wood' | 'stone' | 'fire' | 'water' | 'population'

export const RESOURCE_ORDER: ResourceType[] = [
  'gold',
  'food',
  'wood',
  'stone',
  'fire',
  'water',
  'population',
]

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  gold: 'Gold',
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
  fire: 'Fire',
  water: 'Water',
  population: 'Population',
}

export const INITIAL_RESOURCES: Record<ResourceType, number> = {
  gold: 50,
  food: 20,
  wood: 20,
  stone: 10,
  fire: 0,
  water: 0,
  population: 5,
}
