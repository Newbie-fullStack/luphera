import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { FormAlert, FormNotice } from '@/features/auth/components/AuthShell';
import { createProfileSchema, type ProfileFormValues } from '@/features/auth/schemas';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api/client';
import { applyApiFieldErrors } from '@/lib/forms';
import { formatMoroccanPhone } from '@/lib/phone';

export function AccountProfilePage() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => createProfileSchema(t), [t]);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      marketing_opt_in: user?.marketing_opt_in ?? false,
    },
  });

  useEffect(() => {
    document.title = `${t('account.profile.title')} — Luphéra`;
  }, [t]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting) {
      return;
    }

    setServerError(null);
    setSaved(false);
    setSubmitting(true);

    try {
      await updateProfile({
        name: values.name,
        email: values.email === '' ? null : values.email,
        marketing_opt_in: values.marketing_opt_in,
      });
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError) {
        const focused = applyApiFieldErrors(
          error,
          ['name', 'email'],
          form.setError,
          form.setFocus,
        );
        setServerError(focused ? t('auth.errorFields') : error.message);
      } else {
        setServerError(t('account.profile.error'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <section className="grid gap-6">
      <header className="grid gap-2">
        <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] leading-tight">{t('account.profile.title')}</h2>
        <p className="text-[14px] leading-relaxed text-brume">{t('account.profile.lead')}</p>
      </header>

      <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid max-w-[520px] gap-5">
        <TextField
          id="profile-name"
          label={t('account.profile.name')}
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />

        <TextField
          id="profile-email"
          label={t('account.profile.email')}
          hint={t('account.profile.emailHint')}
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <div className="grid gap-2">
          <span className="field-label">{t('account.profile.phone')}</span>
          <p className="border border-ligne bg-charbon/40 px-4 py-3 text-[15px] text-ivoire">
            {user?.phone !== undefined ? formatMoroccanPhone(user.phone) : '—'}
          </p>
          <p className="field-hint">{t('account.profile.phoneHint')}</p>
        </div>

        <label htmlFor="marketing_opt_in" className="flex items-start gap-3 text-[13px] leading-relaxed text-texte">
          <input
            id="marketing_opt_in"
            type="checkbox"
            className="mt-0.5 size-4 accent-or"
            {...form.register('marketing_opt_in')}
          />
          <span>{t('account.profile.marketing')}</span>
        </label>

        <FormAlert message={serverError} />
        {saved ? <FormNotice message={t('account.profile.saved')} /> : null}

        <Button type="submit" disabled={submitting} className="justify-self-start">
          {submitting ? t('account.profile.saving') : t('account.profile.save')}
        </Button>
      </form>
    </section>
  );
}
