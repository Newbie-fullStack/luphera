const numberFormat = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Amounts travel as integer centimes, never as floats.
 * Display format from the brief: "1 980 MAD".
 */
export function formatMAD(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;

  return `${numberFormat.format(Math.round(safe / 100))} MAD`;
}

export function formatPrice(cents: number): string {
  return formatMAD(cents);
}
