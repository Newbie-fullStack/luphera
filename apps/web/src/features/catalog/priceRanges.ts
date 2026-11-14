export const PRICE_RANGES = [
  { key: 'all', labelKey: 'shop.allPrices', min: undefined, max: undefined },
  { key: 'under-450', labelKey: 'shop.priceUnder', min: 0, max: 45000 },
  { key: '450-690', labelKey: 'shop.priceMid', min: 45000, max: 69000 },
  { key: '690-990', labelKey: 'shop.priceHigh', min: 69000, max: 99000 },
  { key: 'over-990', labelKey: 'shop.priceOver', min: 99000, max: undefined },
] as const;

export function priceRangeKey(min?: number, max?: number): string {
  const match = PRICE_RANGES.find((range) => range.min === min && range.max === max);

  return match?.key ?? 'all';
}
