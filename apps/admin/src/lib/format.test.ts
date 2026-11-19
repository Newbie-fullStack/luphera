import { describe, expect, it } from 'vitest';

import {
  formatCents,
  formatDate,
  formatMAD,
  formatPercent,
  formatPhone,
  whatsappHref,
} from './format';

/**
 * French number formatting uses a narrow no-break space; the assertion
 * normalises it so the test reads like the visible output.
 */
function plain(value: string): string {
  return value.replace(/[\u202f\u00a0]/g, ' ');
}

describe('format helpers', () => {
  it('renders amounts from integer centimes', () => {
    expect(plain(formatMAD(198000))).toBe('1 980 MAD');
    expect(formatMAD(0)).toBe('0 MAD');
    expect(formatMAD(null)).toBe('0 MAD');
  });

  it('keeps dense table amounts without the currency', () => {
    expect(plain(formatCents(1250))).toBe('1 250');
    expect(formatCents(undefined)).toBe('0');
  });

  it('formats a missing date as an em dash instead of inventing one', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate('2026-11-18T10:00:00+00:00')).toContain('2026');
  });

  it('rounds percentages', () => {
    expect(formatPercent(49.6)).toBe('50 %');
  });

  it('renders a Moroccan number in local shape', () => {
    expect(formatPhone('+212612345678')).toBe('06 12 34 56 78');
    expect(formatPhone(null)).toBe('—');
  });

  it('builds a WhatsApp link from the stored number', () => {
    expect(whatsappHref('+212612345678')).toBe('https://wa.me/212612345678');
    expect(whatsappHref(null)).toBeNull();
  });
});
