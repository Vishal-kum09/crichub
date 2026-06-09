import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}

export function Card({ children, className, dark = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[18px] p-4 lg:p-6',
        dark ? 'bg-[#1a1a1a] text-white' : 'bg-white',
        className
      )}
    >
      {children}
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KPICard({ label, value, change, trend, className }: KPICardProps) {
  const trendColors = {
    up: 'text-[#10b981]',
    down: 'text-[#ef4444]',
    neutral: 'text-[#666666]',
  };

  return (
    <Card className={className}>
      <div className="space-y-1 lg:space-y-2">
        <p className="text-xs lg:text-sm text-[#666666] truncate">{label}</p>
        <p className="text-xl lg:text-3xl font-semibold tabular-nums">{value}</p>
        {change && trend && (
          <p className={cn('text-xs lg:text-sm tabular-nums', trendColors[trend])}>
            {change}
          </p>
        )}
      </div>
    </Card>
  );
}
