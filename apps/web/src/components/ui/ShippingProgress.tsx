import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface ShippingProgressProps {
  subtotalCents: number;
  thresholdCents: number;
  freeLabel: string;
  renderRemaining: (remainingCents: number) => ReactNode;
  progressLabel: string;
  className?: string;
}

export function ShippingProgress({
  subtotalCents,
  thresholdCents,
  freeLabel,
  renderRemaining,
  progressLabel,
  className,
}: ShippingProgressProps) {
  const remaining = Math.max(0, thresholdCents - subtotalCents);
  const progress = thresholdCents <= 0 ? 1 : Math.min(1, subtotalCents / thresholdCents);
  const reached = remaining === 0;

  return (
    <div className={cn('shipbar', className)}>
      <p>{reached ? <span className="text-or-clair">{freeLabel}</span> : renderRemaining(remaining)}</p>
      <div
        className="shipbar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={progressLabel}
      >
        <span className="shipbar-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}
