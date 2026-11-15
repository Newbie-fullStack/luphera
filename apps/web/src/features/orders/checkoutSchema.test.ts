import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';

import { createCheckoutSchema } from '@/features/orders/checkoutSchema';

// The schema receives the translation function: the test only checks which
// key is used, never the French wording itself.
const t = ((key: string) => key) as unknown as TFunction;
const schema = createCheckoutSchema(t);

const valid = {
  customer_name: 'Salma Bennani',
  phone: '06 12 34 56 78',
  email: '',
  city: 'casablanca',
  district: 'Maarif',
  address: '12 rue des Orangers',
  landmark: '',
  note: '',
  terms: true,
};

describe('checkoutSchema', () => {
  it('accepts a complete checkout', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('accepts the +212 and 00212 phone formats', () => {
    expect(schema.safeParse({ ...valid, phone: '+212612345678' }).success).toBe(true);
    expect(schema.safeParse({ ...valid, phone: '00212612345678' }).success).toBe(true);
  });

  it('rejects a non Moroccan phone with the translated key', () => {
    const result = schema.safeParse({ ...valid, phone: '01 02 03 04 05' });

    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe(
      'checkout.errors.phoneFormat',
    );
  });

  it('requires the terms to be accepted', () => {
    const result = schema.safeParse({ ...valid, terms: false });

    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe('checkout.errors.terms');
  });

  it('keeps the email optional but well formed', () => {
    expect(schema.safeParse({ ...valid, email: 'salma@exemple.ma' }).success).toBe(true);
    expect(schema.safeParse({ ...valid, email: 'pas-un-email' }).success).toBe(false);
  });

  it('rejects a missing city and a too short address', () => {
    expect(schema.safeParse({ ...valid, city: '' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, address: '12' }).success).toBe(false);
  });

  it('trims the surrounding spaces before validating', () => {
    expect(schema.safeParse({ ...valid, customer_name: '  Salma  ' }).success).toBe(true);
  });
});
