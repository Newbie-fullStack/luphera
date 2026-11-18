import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';
import { applyApiFieldErrors } from '@/lib/forms';

import { AuthShell, FormAlert, FormNotice } from '@/features/auth/components/AuthShell';
import { requestPasswordReset } from '@/features/auth/api';
import { createForgotSchema, type ForgotFormValues } from '@/features/auth/schemas';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => createForgotSchema(t), [t]);
  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    document.title = `${t('auth.forgotTitle')} — Luphéra`;
  }, [t]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting) {
      return;
    }

    setServerError(null);
    setSubmitting(true);

    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        const focused = applyApiFieldErrors(error, ['email'], form.setError, form.setFocus);
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
      title={t('auth.forgotTitle')}
      lead={t('auth.forgotLead')}
      footer={
        <p>
          <Link to="/connexion" className="text-or-clair underline-offset-4 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="grid gap-5">
          <FormNotice message={t('auth.forgotSent')} />
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

          <FormAlert message={serverError} />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('auth.loggingIn') : t('auth.forgotSubmit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
