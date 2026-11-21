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

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

/**
 * ISO 8601 date from the API, rendered for a French reader without the time.
 */
export function formatDate(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

/**
 * ISO 8601 timestamp from the API, rendered for a French reader.
 * Returns null when the date is missing rather than inventing one.
 */
export function formatDateTime(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : dateTimeFormat.format(date);
}
