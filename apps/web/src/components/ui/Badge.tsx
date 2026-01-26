import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'low' | 'medium' | 'high' | 'urgent';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export function Badge({ children, variant = 'default', className, 'data-testid': testId }: BadgeProps & { 'data-testid'?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      data-testid={testId}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const variant = priority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent';
  return <Badge variant={variant} data-testid="priority-badge">{priority}</Badge>;
}
