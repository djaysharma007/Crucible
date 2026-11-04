import * as React from 'react';
import { cn } from '../utils';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-control bg-surface/60 border border-border/30',
        className,
      )}
      {...props}
    />
  );
};
