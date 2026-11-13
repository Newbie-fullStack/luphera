import { formatMAD } from '@/lib/format';

interface ShippingProgressProps {
  subtotalCents: number;
  thresholdCents: number;
}

export function ShippingProgress({ subtotalCents, thresholdCents }: ShippingProgressProps) {
  const remaining = Math.max(0, thresholdCents - subtotalCents);
  const progress = Math.min(1, subtotalCents / thresholdCents);
  const reached = remaining === 0;

  return (
    <div className="shipbar">
      <p>
        {reached ? (
          <span className="text-or-clair">Livraison offerte.</span>
        ) : (
          <>
            Plus que <b>{formatMAD(remaining)}</b> pour la livraison offerte
          </>
        )}
      </p>
      <div
        className="shipbar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Progression vers la livraison offerte"
      >
        <span className="shipbar-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}
