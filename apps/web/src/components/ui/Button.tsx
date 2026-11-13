import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-secondary', className)}
      {...props}
    />
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  children: ReactNode;
}

export function ButtonLink({ variant = 'primary', className, children, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-secondary', className)}
      {...props}
    >
      {children}
    </Link>
  );
}
