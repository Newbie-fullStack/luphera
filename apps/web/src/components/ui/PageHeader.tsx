import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
  children?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  align = 'left',
  as: Heading = 'h1',
  children,
}: PageHeaderProps) {
  return (
    <header
      className={
        align === 'center'
          ? 'mx-auto grid max-w-3xl justify-items-center gap-5 pb-14 text-center'
          : 'grid max-w-3xl gap-5 pb-14'
      }
    >
      <p className="eyebrow">{eyebrow}</p>
      <Heading className="text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.04] tracking-[.01em]">
        {title}
      </Heading>
      {lead ? <p className="max-w-[62ch] text-[17px] leading-relaxed text-texte">{lead}</p> : null}
      {children}
    </header>
  );
}
