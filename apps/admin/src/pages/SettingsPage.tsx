import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { fetchSettings, saveSettings } from '@/lib/api/admin';
import type { ShopSettings } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  brand: z.object({
    tagline: z.string().trim().max(120),
    whatsapp: z.string().trim().max(32),
    email: z.string().trim(),
  }),
  announcement: z.object({
    text: z.string().trim().max(200),
    active: z.boolean(),
  }),
  shipping: z.object({
    flat_fee_cents: z.number().int().min(0).max(100000),
    free_threshold_cents: z.number().int().min(0).max(10000000),
  }),
});

type Values = z.infer<typeof schema>;

export function SettingsPage() {
  const { t } = useTranslation();
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  if (settings.isLoading) {
    return <Spinner />;
  }

  if (settings.isError || settings.data === undefined) {
    return <p className="text-err">{t('common.error')}</p>;
  }

  return (
    <SettingsForm key={JSON.stringify(settings.data)} settings={settings.data} />
  );
}

function SettingsForm({ settings }: { settings: ShopSettings }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: settings,
  });

  const save = useMutation({
    mutationFn: (values: Values) => saveSettings(values),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved);
      void queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      setFeedback(t('settings.saved'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) =>
        void handleSubmit((values) => {
          setFeedback(null);
          save.mutate(values);
        })(event)
      }
      noValidate
    >
      <PageHeader
        eyebrow={t('nav.groupSystem')}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{t('settings.brand')}</h2>
        </div>
        <div className="panel-body grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="brand-tagline">
              {t('settings.tagline')}
            </label>
            <input id="brand-tagline" className="field-input" {...register('brand.tagline')} />
          </div>
          <div>
            <label className="field-label" htmlFor="brand-whatsapp">
              {t('settings.whatsapp')}
            </label>
            <input id="brand-whatsapp" className="field-input" {...register('brand.whatsapp')} />
          </div>
          <div>
            <label className="field-label" htmlFor="brand-email">
              {t('settings.email')}
            </label>
            <input
              id="brand-email"
              type="email"
              className="field-input"
              {...register('brand.email')}
            />
            {errors.brand?.email !== undefined ? (
              <p className="field-error">{t('common.error')}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{t('settings.announcement')}</h2>
        </div>
        <div className="panel-body grid gap-4">
          <div>
            <label className="field-label" htmlFor="announcement-text">
              {t('settings.announcementText')}
            </label>
            <input
              id="announcement-text"
              className="field-input"
              {...register('announcement.text')}
            />
          </div>
          <label className="checkbox">
            <input type="checkbox" {...register('announcement.active')} />
            {t('settings.announcementActive')}
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{t('settings.shipping')}</h2>
        </div>
        <div className="panel-body grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="shipping-flat">
              {t('settings.flatFee')}
            </label>
            <input
              id="shipping-flat"
              type="number"
              min={0}
              className="field-input"
              {...register('shipping.flat_fee_cents', { valueAsNumber: true })}
            />
            {errors.shipping?.flat_fee_cents !== undefined ? (
              <p className="field-error">{t('common.error')}</p>
            ) : null}
          </div>
          <div>
            <label className="field-label" htmlFor="shipping-threshold">
              {t('settings.freeThreshold')}
            </label>
            <input
              id="shipping-threshold"
              type="number"
              min={0}
              className="field-input"
              {...register('shipping.free_threshold_cents', { valueAsNumber: true })}
            />
            {errors.shipping?.free_threshold_cents !== undefined ? (
              <p className="field-error">{t('common.error')}</p>
            ) : null}
          </div>
          <p className="field-hint sm:col-span-2">{t('settings.publicHint')}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending}>
          {save.isPending ? t('common.saving') : t('common.save')}
        </button>
        {feedback !== null ? (
          <p className="text-xs text-brume" role="status">
            {feedback}
          </p>
        ) : null}
      </div>
    </form>
  );
}
