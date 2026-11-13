import { cn } from '@/lib/cn';

interface ChipProps {
  children: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  className?: string;
}

export function Chip({ children, pressed, onPressedChange, className }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn('chip', className)}
      onClick={() => onPressedChange(!pressed)}
    >
      {children}
    </button>
  );
}
