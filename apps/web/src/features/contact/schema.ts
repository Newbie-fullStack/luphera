import type { TFunction } from 'i18next';
import { z } from 'zod';

import { isValidMoroccanPhone } from '@/lib/phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Field names mirror the API contract (`message`, not `body`), so a server
 * validation error lands on the right input without a mapping table.
 */
export function createContactSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(2, t('contact.errors.name')).max(120, t('contact.errors.name')),
    email: z
      .string()
      .trim()
      .min(1, t('contact.errors.email'))
      .refine((value) => EMAIL_PATTERN.test(value), t('contact.errors.email')),
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || isValidMoroccanPhone(value), t('contact.errors.phone')),
    subject: z.string().trim().min(1, t('contact.errors.subject')),
    message: z
      .string()
      .trim()
      .min(20, t('contact.errors.message'))
      .max(2000, t('contact.errors.message')),
    // Honeypot: never validated in the browser, the API rejects any value.
    website: z.string().optional(),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>;
