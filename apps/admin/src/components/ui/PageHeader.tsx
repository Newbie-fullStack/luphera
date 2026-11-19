import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1.5">
        {eyebrow !== undefined ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle !== undefined ? (
          <p className="max-w-2xl text-sm text-brume">{subtitle}</p>
        ) : null}
      </div>
      {actions !== undefined ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
