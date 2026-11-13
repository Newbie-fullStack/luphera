import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ id, label, hint, error, className, ...props }: TextFieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={cn('field-input', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldShell>
  );
}
