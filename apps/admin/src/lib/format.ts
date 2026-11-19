const numberFormat = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Amounts travel as integer centimes, never as floats.
 */
export function formatMAD(cents: number | null | undefined): string {
  const safe = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;

  return `${numberFormat.format(Math.round(safe / 100))} MAD`;
}

/**
 * Centimes in a dense table: "1 250" without the currency, which lives in the
 * column header. Never used for a final amount shown alone.
 */
export function formatCents(cents: number | null | undefined): string {
  const safe = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;

  return numberFormat.format(safe);
}

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
});

function parse(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);

  return date === null ? '—' : dateTimeFormat.format(date);
}

export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso);

  return date === null ? '—' : dateFormat.format(date);
}

export function formatPercent(value: number): string {
  return `${Number.isFinite(value) ? Math.round(value) : 0} %`;
}

/**
 * Phone numbers are stored E.164; the display keeps the readable local shape
 * without changing what the API stores.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '—';
  }

  if (phone.startsWith('+212')) {
    const local = `0${phone.slice(4)}`;

    return local.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }

  return phone;
}

export function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
