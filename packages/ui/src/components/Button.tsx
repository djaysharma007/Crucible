import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-sans font-medium rounded-control transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantStyles = {
      primary: 'bg-accent text-accent-text hover:bg-accent-hover font-semibold',
      secondary: 'bg-accent-secondary text-primary hover:bg-accent-secondary-hover',
      outline: 'border border-border bg-transparent text-primary hover:bg-surface',
      ghost: 'bg-transparent text-primary hover:bg-surface',
      danger: 'bg-danger text-primary hover:opacity-90',
    };

    const sizeStyles = {
      sm: 'h-7 px-2 text-xs gap-1',
      md: 'h-9 px-3 text-sm gap-2',
      lg: 'h-11 px-4 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
