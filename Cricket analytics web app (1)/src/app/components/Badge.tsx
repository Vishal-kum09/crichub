import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'won' | 'lost' | 'scheduled' | 'role';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-[#f9f9f9] text-[#1a1a1a]',
    won: 'bg-[#10b981] text-white',
    lost: 'bg-[#ef4444] text-white',
    scheduled: 'bg-[#6b7280] text-white',
    role: 'bg-[#e60023]/10 text-[#e60023]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'Won' | 'Lost' | 'Scheduled' | 'In Progress';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variantMap: Record<string, 'won' | 'lost' | 'scheduled'> = {
    Won: 'won',
    Lost: 'lost',
    Scheduled: 'scheduled',
    'In Progress': 'scheduled',
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
}
