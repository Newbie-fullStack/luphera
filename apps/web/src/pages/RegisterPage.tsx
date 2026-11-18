import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';
import { applyApiFieldErrors } from '@/lib/forms';
import { normalizeMoroccanPhone } from '@/lib/phone';

import { AuthShell, FormAlert } from '@/features/auth/components/AuthShell';
import { createRegisterSchema, type RegisterFormValues } from '@/features/auth/schemas';
import { useAuth } from '@/features/auth/useAuth';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, user, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => createRegisterSchema(t), [t]);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      password_confirmation: '',
      marketing_opt_in: false,
    },
  });

  useEffect(() => {
    document.title = `${t('auth.registerTitle')} — Luphéra`;
  }, [t]);

  useEffect(() => {
    if (!isLoading && user !== null) {
      void navigate('/compte', { replace: true });
    }
  }, [isLoading, navigate, user]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting) {
      return;
    }

    setServerError(null);
    setSubmitting(true);

    try {
      await register({
        name: values.name,
        phone: normalizeMoroccanPhone(values.phone),
        email: values.email === '' ? null : values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
        marketing_opt_in: values.marketing_opt_in,
      });
      void navigate('/compte', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const focused = applyApiFieldErrors(
          error,
          ['name', 'phone', 'email', 'password', 'password_confirmation'],
          form.setError,
          form.setFocus,
        );
        setServerError(focused ? t('auth.errorFields') : error.message);
      } else {
        setServerError(t('auth.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      lead={t('auth.registerLead')}
      footer={
        <p className="flex flex-wrap items-center gap-2">
          <span>{t('auth.hasAccount')}</span>
          <Link to="/connexion" className="text-or-clair underline-offset-4 hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6">
        <TextField
          id="name"
          label={t('auth.name')}
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />

        <TextField
          id="phone"
          label={t('auth.phone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />

        <TextField
          id="email"
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <TextField
          id="password"
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <TextField
          id="password_confirmation"
          label={t('auth.passwordConfirmation')}
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password_confirmation?.message}
          {...form.register('password_confirmation')}
        />

        <label htmlFor="marketing_opt_in" className="flex items-start gap-3 text-[13px] leading-relaxed text-texte">
          <input
            id="marketing_opt_in"
            type="checkbox"
            className="mt-0.5 size-4 accent-or"
            {...form.register('marketing_opt_in')}
          />
          <span>{t('auth.marketing')}</span>
        </label>

        <FormAlert message={serverError} />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? t('auth.registering') : t('auth.registerSubmit')}
        </Button>
      </form>
    </AuthShell>
  );
}
