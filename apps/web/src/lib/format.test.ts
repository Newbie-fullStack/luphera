import { describe, expect, it } from 'vitest';

import { formatMAD, formatPrice } from '@/lib/format';

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
