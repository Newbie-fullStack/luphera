import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageHeader } from '@/components/ui/PageHeader';

interface AuthShellProps {
  title: string;
  lead: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared frame for the four authentication screens: same rhythm, same width,
 * so the forms stay calm and consistent.
 */
export function AuthShell({ title, lead, children, footer }: AuthShellProps) {
  const { t } = useTranslation();

  return (
    <div className="gutter pb-24 pt-10">
      <Breadcrumbs
        items={[
          { label: t('product.breadcrumbHome'), to: '/' },
          { label: t('nav.account'), to: '/compte' },
          { label: title },
        ]}
      />

      <div className="mt-8">
        <PageHeader eyebrow={t('auth.eyebrow')} title={title} lead={lead} />
      </div>

      <div className="w-full max-w-[520px] border border-ligne bg-obsidienne p-6 sm:p-8">
        {children}
      </div>

      {footer ? <div className="mt-6 w-full max-w-[520px] text-[13px] text-brume">{footer}</div> : null}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }

  return (
    <p
      role="alert"
      className="border border-[#5a2b2b] bg-[#2a1414] p-4 text-[13px] leading-relaxed text-[#e8b4b4]"
    >
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="border border-ligne-forte bg-or/5 p-4 text-[13px] leading-relaxed text-or-clair"
    >
      {message}
    </p>
  );
}
