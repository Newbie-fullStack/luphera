import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface TagProps {
  children: ReactNode;
  tone?: 'gold' | 'rose';
  className?: string;
}

export function Tag({ children, tone = 'gold', className }: TagProps) {
  return (
    <span className={cn('tag', tone === 'rose' && 'tag-rose', className)}>{children}</span>
  );
}
