import type { ReactNode } from 'react';

interface DsSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
}

export function DsSection({ title, subtitle, children, id }: DsSectionProps) {
  return (
    <section id={id} className="grid gap-7 border-t border-ligne pb-24 pt-8">
      <h2 className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-4 font-display text-[clamp(1.5rem,3vw,1.9rem)] leading-tight text-ivoire">
        {title}
        {subtitle ? (
          <small className="font-body text-[11px] font-medium uppercase tracking-[.28em] text-or">
            {subtitle}
          </small>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

interface DListProps {
  items: Array<{ term: string; value: ReactNode }>;
}

export function DList({ items }: DListProps) {
  return (
    <dl className="grid border-t border-ligne">
      {items.map((item) => (
        <div
          key={item.term}
          className="grid gap-1.5 border-b border-ligne py-4 sm:grid-cols-[minmax(120px,.28fr)_1fr] sm:gap-7"
        >
          <dt className="pt-1 text-[11px] font-medium uppercase tracking-[.26em] text-or">
            {item.term}
          </dt>
          <dd className="m-0 min-w-0 text-[15px] leading-relaxed text-ivoire">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
