import * as React from 'react';
import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-primary select-none">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'h-9 px-3 text-sm bg-surface text-primary border rounded-control transition-colors duration-fast',
            'placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-danger focus-visible:ring-danger focus-visible:border-danger'
              : 'border-border',
            className,
          )}
          {...props}
        />
        {error && (
          <span id={errorId} className="text-xs text-danger font-medium">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="text-xs text-muted">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
