import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { applyApiFieldErrors } from '@/lib/forms';
import { ApiError } from '@/lib/api/client';

import { AuthShell, FormAlert } from '@/features/auth/components/AuthShell';
import { createLoginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useAuth } from '@/features/auth/useAuth';

function safeRedirect(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return '/compte';
  }

  return value;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, user, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const target = safeRedirect(params.get('redirect'));
  const schema = useMemo(() => createLoginSchema(t), [t]);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => {
    document.title = `${t('auth.loginTitle')} — Luphéra`;
  }, [t]);

  useEffect(() => {
    if (!isLoading && user !== null) {
      void navigate(target, { replace: true });
    }
  }, [isLoading, navigate, target, user]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting) {
      return;
    }

    setServerError(null);
    setSubmitting(true);

    try {
      await login({ identifier: values.identifier, password: values.password });
      void navigate(target, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const focused = applyApiFieldErrors(
          error,
          ['identifier', 'password'],
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
      title={t('auth.loginTitle')}
      lead={t('auth.loginLead')}
      footer={
        <p className="flex flex-wrap items-center gap-2">
          <span>{t('auth.noAccount')}</span>
          <Link to="/inscription" className="text-or-clair underline-offset-4 hover:underline">
            {t('auth.createAccount')}
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6">
        <TextField
          id="identifier"
          label={t('auth.identifier')}
          placeholder={t('auth.identifierPlaceholder')}
          autoComplete="username"
          error={form.formState.errors.identifier?.message}
          {...form.register('identifier')}
        />

        <TextField
          id="password"
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <p className="-mt-2">
          <Link to="/mot-de-passe-oublie" className="text-[12px] text-brume hover:text-or-clair">
            {t('auth.forgot')}
          </Link>
        </p>

        <FormAlert message={serverError} />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? t('auth.loggingIn') : t('auth.loginSubmit')}
        </Button>
      </form>
    </AuthShell>
  );
}
