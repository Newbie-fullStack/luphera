import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiError } from '@/lib/api/client';

import { useAuth } from './useAuth';

const schema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  if (!isLoading && user !== null) {
    return <Navigate to="/" replace />;
  }

  const from =
    typeof (location.state as { from?: unknown } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : '/';

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    try {
      await login(values);
      void navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('common.error'));
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-ligne bg-obsidienne lg:grid lg:place-items-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(201,162,75,.18), transparent 55%), radial-gradient(circle at 70% 80%, rgba(201,162,75,.1), transparent 60%)',
          }}
        />
        <div className="relative grid max-w-sm gap-6 px-12">
          <p className="eyebrow">{t('brand.console')}</p>
          <p className="font-display text-5xl leading-tight text-ivoire">
            Luphéra
            <span className="mt-3 block text-base tracking-[0.32em] text-or">Maison de parfums</span>
          </p>
          <p className="text-sm leading-relaxed text-brume">
            Commandes, catalogue, stock et clients. Chaque action sensible laisse une trace.
          </p>
        </div>
      </section>

      <section className="grid place-items-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-3">{t('brand.name')}</p>
          <h1 className="text-3xl">{t('auth.title')}</h1>
          <p className="mt-2 text-sm text-brume">{t('auth.subtitle')}</p>

          <form className="mt-8 grid gap-5" onSubmit={(event) => void onSubmit(event)} noValidate>
            <div>
              <label className="field-label" htmlFor="identifier">
                {t('auth.identifier')}
              </label>
              <input
                id="identifier"
                className="field-input"
                autoComplete="username"
                autoFocus
                {...register('identifier')}
              />
              {errors.identifier !== undefined ? (
                <p className="field-error">{t('common.required')}</p>
              ) : null}
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                className="field-input"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password !== undefined ? (
                <p className="field-error">{t('common.required')}</p>
              ) : null}
            </div>

            {error !== null ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? t('auth.submitting') : t('auth.submit')}
            </button>
          </form>

          {import.meta.env.DEV ? (
            <p className="mt-8 border-t border-ligne pt-5 text-xs leading-relaxed text-brume">
              {t('auth.demoHint')}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
