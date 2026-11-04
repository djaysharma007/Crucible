import * as React from 'react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'secondary' | 'success' | 'danger' | 'warning';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  const variantStyles = {
    default: 'bg-surface text-primary border-border',
    accent: 'bg-accent text-accent-text border-transparent font-medium',
    secondary: 'bg-accent-secondary/20 text-[#6B9499] border-accent-secondary/40',
    success: 'bg-success/20 text-[#6FAF7E] border-success/40',
    danger: 'bg-danger/20 text-[#D47070] border-danger/40',
    warning: 'bg-warning/20 text-[#DEAA5E] border-warning/40',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-control border px-2 py-0.5 text-[11px] font-medium leading-none select-none',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
};
