import type { ReactNode } from 'react';

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-14 text-center">
      <p className="text-sm text-brume">{title}</p>
      {action}
    </div>
  );
}
