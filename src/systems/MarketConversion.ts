import type { ResourceSystem } from './ResourceSystem'

// Fixed-increment conversion (structure-effects-preview ticket 05): matches the rest of the
// UI's flat-button style — no free-form quantity picker. 2:1 ratio (Q10/Q11 of the grilling
// session): 10 Wood or 10 Stone converts to 5 Gold.
export type MarketConvertibleResource = 'wood' | 'stone'

export const MARKET_CONVERSION_INPUT_AMOUNT = 10
export const MARKET_CONVERSION_OUTPUT_GOLD = 5

// `used` is that specific Market tile's one-per-turn allowance, tracked by the caller
// (GameBoardScene's marketConversionUsed grid) and reset at the start of each turn.
export function canConvert(
  resource: MarketConvertibleResource,
  used: boolean,
  resourceSystem: ResourceSystem,
): boolean {
  return !used && resourceSystem.get(resource) >= MARKET_CONVERSION_INPUT_AMOUNT
}

export function convert(resource: MarketConvertibleResource, resourceSystem: ResourceSystem): void {
  resourceSystem.add(resource, -MARKET_CONVERSION_INPUT_AMOUNT)
  resourceSystem.add('gold', MARKET_CONVERSION_OUTPUT_GOLD)
}
