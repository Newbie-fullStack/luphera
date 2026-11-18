import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';
import { applyApiFieldErrors } from '@/lib/forms';

import { AuthShell, FormAlert, FormNotice } from '@/features/auth/components/AuthShell';
import { resetPassword } from '@/features/auth/api';
import { createResetSchema, type ResetFormValues } from '@/features/auth/schemas';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => createResetSchema(t), [t]);
  const form = useForm<ResetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email, password: '', password_confirmation: '' },
  });

  useEffect(() => {
    document.title = `${t('auth.resetTitle')} — Luphéra`;
  }, [t]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting) {
      return;
    }

    setServerError(null);
    setSubmitting(true);

    try {
      await resetPassword({
        token,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError) {
        const focused = applyApiFieldErrors(
          error,
          ['email', 'password', 'password_confirmation'],
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
      title={t('auth.resetTitle')}
      lead={t('auth.resetLead')}
      footer={
        <p>
          <Link to="/connexion" className="text-or-clair underline-offset-4 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      }
    >
      {token === '' ? (
        <div className="grid gap-5">
          <FormAlert message={t('auth.errors.resetToken')} />
          <Link to="/mot-de-passe-oublie" className="lnk justify-self-start">
            {t('auth.forgotSubmit')}
          </Link>
        </div>
      ) : done ? (
        <div className="grid gap-5">
          <FormNotice message={t('auth.resetDone')} />
          <Link to="/connexion" className="lnk justify-self-start">
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6">
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

          <FormAlert message={serverError} />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('auth.loggingIn') : t('auth.resetSubmit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
