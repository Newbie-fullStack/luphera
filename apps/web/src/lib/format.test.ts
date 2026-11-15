import { describe, expect, it } from 'vitest';

import { formatDateTime, formatMAD, formatPrice } from '@/lib/format';

describe('formatMAD', () => {
  it('formats integer centimes as MAD', () => {
    expect(formatMAD(45000)).toBe('450 MAD');
    expect(formatMAD(99000)).toBe('990 MAD');
  });

  it('groups thousands', () => {
    expect(formatMAD(198000).replace(/\s/g, ' ')).toBe('1 980 MAD');
  });

  it('never displays decimals', () => {
    expect(formatMAD(45050)).toBe('451 MAD');
  });

  it('guards against invalid input', () => {
    expect(formatMAD(Number.NaN)).toBe('0 MAD');
  });

  it('keeps the price helper aligned with the amount helper', () => {
    expect(formatPrice(69000)).toBe(formatMAD(69000));
  });
});

describe('formatDateTime', () => {
  it('renders an ISO timestamp for a French reader', () => {
    const formatted = formatDateTime('2026-11-15T10:30:00+00:00');

    expect(formatted).not.toBeNull();
    expect(formatted).toContain('2026');
  });

  it('returns null instead of inventing a date', () => {
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime('pas-une-date')).toBeNull();
  });
});
