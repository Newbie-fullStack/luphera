import type { TFunction } from 'i18next';
import { z } from 'zod';

import { isValidMoroccanPhone } from '@/lib/phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Checkout validation. Every message comes from the translation files, so the
 * schema never carries user-facing French text of its own.
 */
export function createCheckoutSchema(t: TFunction) {
  return z.object({
    customer_name: z
      .string()
      .trim()
      .min(2, t('checkout.errors.name'))
      .max(120, t('checkout.errors.nameMax')),
    phone: z
      .string()
      .trim()
      .min(1, t('checkout.errors.phone'))
      .refine(isValidMoroccanPhone, t('checkout.errors.phoneFormat')),
    email: z
      .string()
      .trim()
      .refine((value) => value === '' || EMAIL_PATTERN.test(value), t('checkout.errors.email')),
    city: z.string().min(1, t('checkout.errors.city')),
    district: z
      .string()
      .trim()
      .min(2, t('checkout.errors.district'))
      .max(80, t('checkout.errors.districtMax')),
    address: z
      .string()
      .trim()
      .min(5, t('checkout.errors.address'))
      .max(200, t('checkout.errors.addressMax')),
    landmark: z.string().trim().max(120, t('checkout.errors.landmarkMax')),
    note: z.string().trim().max(500, t('checkout.errors.noteMax')),
    terms: z.boolean().refine((value) => value, t('checkout.errors.terms')),
  });
}

export type CheckoutFormValues = z.infer<ReturnType<typeof createCheckoutSchema>>;
