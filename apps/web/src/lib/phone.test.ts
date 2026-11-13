import { describe, expect, it } from 'vitest';

import {
  formatMoroccanPhone,
  isValidMoroccanPhone,
  normalizeMoroccanPhone,
} from '@/lib/phone';

describe('Moroccan phone helpers', () => {
  it.each([
    ['0612345678', '+212612345678'],
    ['06 12 34 56 78', '+212612345678'],
    ['+212612345678', '+212612345678'],
    ['00212612345678', '+212612345678'],
    ['0712345678', '+212712345678'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeMoroccanPhone(input)).toBe(expected);
  });

  it.each(['061234567', '06123456789', '0212345678', 'not-a-phone', '+33612345678'])(
    'rejects %s',
    (input) => {
      expect(isValidMoroccanPhone(input)).toBe(false);
    },
  );

  it('accepts separators', () => {
    expect(isValidMoroccanPhone('+212 612-345-678')).toBe(true);
  });

  it('formats for display', () => {
    expect(formatMoroccanPhone('+212612345678')).toBe('06 12 34 56 78');
  });
});
