import { formatMAD } from '@/lib/format';

export interface SizeOption {
  id: string;
  ml: number;
  priceCents: number;
  available?: boolean;
}

interface SizeSelectorProps {
  options: SizeOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}

export function SizeSelector({ options, value, onChange, label }: SizeSelectorProps) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const checked = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={option.available === false}
            className="size-option disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onChange(option.id)}
          >
            <b>{option.ml} ml</b>
            <span>{formatMAD(option.priceCents)}</span>
          </button>
        );
      })}
    </div>
  );
}
