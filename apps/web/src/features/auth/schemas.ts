import type { TFunction } from 'i18next';
import { z } from 'zod';

import { isValidMoroccanPhone } from '@/lib/phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function optionalEmail(t: TFunction) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || EMAIL_PATTERN.test(value), t('auth.errors.email'));
}

/**
 * Every message comes from the translation files: schemas never carry
 * user-facing French text of their own.
 */
export function createLoginSchema(t: TFunction) {
  return z.object({
    identifier: z.string().trim().min(1, t('auth.errors.identifier')),
    password: z.string().min(1, t('auth.errors.passwordRequired')),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      name: z.string().trim().min(2, t('auth.errors.name')).max(120, t('auth.errors.name')),
      phone: z
        .string()
        .trim()
        .min(1, t('auth.errors.phone'))
        .refine(isValidMoroccanPhone, t('auth.errors.phone')),
      email: optionalEmail(t),
      password: z.string().min(8, t('auth.errors.password')),
      password_confirmation: z.string().min(1, t('auth.errors.passwordConfirmation')),
      marketing_opt_in: z.boolean(),
    })
    .refine((values) => values.password === values.password_confirmation, {
      message: t('auth.errors.passwordConfirmation'),
      path: ['password_confirmation'],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

export function createForgotSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('auth.errors.emailRequired'))
      .refine((value) => EMAIL_PATTERN.test(value), t('auth.errors.email')),
  });
}

export type ForgotFormValues = z.infer<ReturnType<typeof createForgotSchema>>;

export function createResetSchema(t: TFunction) {
  return z
    .object({
      email: z
        .string()
        .trim()
        .min(1, t('auth.errors.emailRequired'))
        .refine((value) => EMAIL_PATTERN.test(value), t('auth.errors.email')),
      password: z.string().min(8, t('auth.errors.password')),
      password_confirmation: z.string().min(1, t('auth.errors.passwordConfirmation')),
    })
    .refine((values) => values.password === values.password_confirmation, {
      message: t('auth.errors.passwordConfirmation'),
      path: ['password_confirmation'],
    });
}

export type ResetFormValues = z.infer<ReturnType<typeof createResetSchema>>;

export function createProfileSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(2, t('account.profile.errors.name')).max(120, t('account.profile.errors.name')),
    email: z
      .string()
      .trim()
      .refine((value) => value === '' || EMAIL_PATTERN.test(value), t('account.profile.errors.email')),
    marketing_opt_in: z.boolean(),
  });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

export function createAddressSchema(t: TFunction) {
  return z.object({
    label: z.string().trim().max(40, t('account.addresses.errors.labelMax')),
    recipient_name: z
      .string()
      .trim()
      .min(2, t('account.addresses.errors.recipient'))
      .max(120, t('account.addresses.errors.recipientMax')),
    phone: z
      .string()
      .trim()
      .min(1, t('account.addresses.errors.phone'))
      .refine(isValidMoroccanPhone, t('account.addresses.errors.phone')),
    city: z.string().min(1, t('account.addresses.errors.city')),
    district: z
      .string()
      .trim()
      .min(2, t('account.addresses.errors.district'))
      .max(80, t('account.addresses.errors.districtMax')),
    address: z
      .string()
      .trim()
      .min(5, t('account.addresses.errors.address'))
      .max(200, t('account.addresses.errors.addressMax')),
    landmark: z.string().trim().max(120, t('account.addresses.errors.landmarkMax')),
    is_default: z.boolean(),
  });
}

export type AddressFormValues = z.infer<ReturnType<typeof createAddressSchema>>;
