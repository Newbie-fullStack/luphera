interface MeterProps {
  label: string;
  value: number;
  max?: number;
}

export function Meter({ label, value, max = 5 }: MeterProps) {
  return (
    <div className="grid gap-2">
      <span className="text-[10.5px] uppercase tracking-[.24em] text-brume">{label}</span>
      <span className="meter" role="img" aria-label={`${label} : ${value} sur ${max}`}>
        {Array.from({ length: max }, (_, index) => (
          <i key={index} aria-hidden="true" className={index < value ? 'is-on' : undefined} />
        ))}
      </span>
    </div>
  );
}
