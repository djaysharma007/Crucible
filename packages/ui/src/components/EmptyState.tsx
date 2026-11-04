import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-border bg-surface/30 p-8 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-control bg-surface p-2 text-muted border border-border">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
