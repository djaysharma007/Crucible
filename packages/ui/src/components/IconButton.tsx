import * as React from 'react';
import { cn } from '../utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      'aria-label': ariaLabel,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-control transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantStyles = {
      primary: 'bg-accent text-accent-text hover:bg-accent-hover',
      secondary: 'bg-accent-secondary text-primary hover:bg-accent-secondary-hover',
      outline: 'border border-border bg-transparent text-primary hover:bg-surface',
      ghost: 'bg-transparent text-primary hover:bg-surface',
      danger: 'bg-danger text-primary hover:opacity-90',
    };

    const sizeStyles = {
      sm: 'w-7 h-7 p-1 text-xs',
      md: 'w-9 h-9 p-2 text-sm',
      lg: 'w-11 h-11 p-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
