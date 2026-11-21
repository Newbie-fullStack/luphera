import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { FieldShell, TextField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormAlert } from '@/features/auth/components/AuthShell';
import { sendContactMessage } from '@/features/contact/api';
import { createContactSchema, type ContactFormValues } from '@/features/contact/schema';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api/client';
import { applyApiFieldErrors } from '@/lib/forms';
import { normalizeMoroccanPhone } from '@/lib/phone';

const KNOWN_FIELDS = ['name', 'email', 'phone', 'subject', 'message'] as const;

export function ContactPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `${t('contact.title')} — Luphéra`;
  }, [t]);

  const schema = useMemo(() => createContactSchema(t), [t]);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      subject: '',
      message: '',
      website: '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);

    try {
      await sendContactMessage({
        name: values.name,
        email: values.email,
        phone: values.phone === '' ? null : normalizeMoroccanPhone(values.phone),
        subject: values.subject,
        message: values.message,
        website: values.website ?? '',
      });
      setSent(true);
      form.reset({ ...values, message: '' });
    } catch (error) {
      if (error instanceof ApiError) {
        const matched = applyApiFieldErrors(
          error,
          KNOWN_FIELDS,
          form.setError,
          form.setFocus,
        );

        if (!matched) {
          setServerError(error.message);
        }
      } else {
        setServerError(t('contact.error'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  if (sent) {
    return (
      <div className="gutter pb-32 pt-10 lg:pb-24">
        <PageHeader eyebrow={t('contact.eyebrow')} title={t('contact.successTitle')} lead={t('contact.successBody')} />
        <Button type="button" variant="secondary" onClick={() => setSent(false)}>
          {t('contact.sendAnother')}
        </Button>
      </div>
    );
  }

  return (
    <div className="gutter pb-32 pt-10 lg:pb-24">
      <PageHeader eyebrow={t('contact.eyebrow')} title={t('contact.title')} lead={t('contact.lead')} />

      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="grid w-full max-w-[640px] gap-5 border border-ligne bg-obsidienne p-6 sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="contact-name"
            label={t('contact.name')}
            autoComplete="name"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <TextField
            id="contact-email"
            label={t('contact.email')}
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <TextField
            id="contact-phone"
            label={t('contact.phone')}
            hint={t('contact.phoneOptional')}
            type="tel"
            autoComplete="tel"
            error={form.formState.errors.phone?.message}
            {...form.register('phone')}
          />
          <FieldShell
            id="contact-subject"
            label={t('contact.subject')}
            error={form.formState.errors.subject?.message}
          >
            <select
              id="contact-subject"
              className="field-input"
              aria-invalid={form.formState.errors.subject ? true : undefined}
              aria-describedby={form.formState.errors.subject ? 'contact-subject-error' : undefined}
              {...form.register('subject')}
            >
              <option value="">—</option>
              <option value={t('contact.subjects.order')}>{t('contact.subjects.order')}</option>
              <option value={t('contact.subjects.product')}>{t('contact.subjects.product')}</option>
              <option value={t('contact.subjects.return')}>{t('contact.subjects.return')}</option>
              <option value={t('contact.subjects.other')}>{t('contact.subjects.other')}</option>
            </select>
          </FieldShell>
        </div>

        <FieldShell
          id="contact-message"
          label={t('contact.message')}
          hint={t('contact.messageHint')}
          error={form.formState.errors.message?.message}
        >
          <textarea
            id="contact-message"
            rows={7}
            className="field-input py-3"
            aria-invalid={form.formState.errors.message ? true : undefined}
            aria-describedby={
              form.formState.errors.message ? 'contact-message-error' : 'contact-message-hint'
            }
            {...form.register('message')}
          />
        </FieldShell>

        {/*
          Honeypot: hidden from people and assistive tech, filled only by bots.
          The API rejects any non-empty value.
        */}
        <div aria-hidden="true" className="hidden">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" tabIndex={-1} autoComplete="off" {...form.register('website')} />
        </div>

        <FormAlert message={serverError} />

        <p className="text-[12.5px] leading-relaxed text-brume">{t('contact.privacy')}</p>

        <Button type="submit" disabled={submitting}>
          {submitting ? t('contact.submitting') : t('contact.submit')}
        </Button>
      </form>
    </div>
  );
}
