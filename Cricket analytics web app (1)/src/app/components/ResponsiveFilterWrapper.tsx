import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface ResponsiveFilterWrapperProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}

/**
 * Responsive wrapper for filter sections
 * Desktop: Horizontal layout
 * Mobile: Collapsible accordion or horizontal scroll
 */
export function ResponsiveFilterWrapper({
  title,
  children,
  collapsible = true,
}: ResponsiveFilterWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-[#e0e0e0]">
      {/* Mobile: Collapsible Header */}
      {collapsible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between md:hidden mb-3"
        >
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#e60023]" />
            <h3 className="text-sm font-semibold text-[#1a1a1a]">{title}</h3>
          </div>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {/* Desktop: Always visible title */}
      <h3 className="hidden md:block text-sm font-semibold text-[#1a1a1a] mb-3">{title}</h3>

      {/* Filter Content */}
      {/* Mobile: Collapsible content OR horizontal scroll */}
      {/* Desktop: Always visible horizontal layout */}
      <div
        className={`${
          collapsible ? (isExpanded ? 'block' : 'hidden md:block') : 'block'
        }`}
      >
        {/* Horizontal scroll container for mobile, flex wrap for desktop */}
        <div className="flex gap-3 overflow-x-auto md:flex-wrap pb-2 scrollbar-hide">
          {children}
        </div>
      </div>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

/**
 * Responsive grid wrapper for analytics charts
 * Desktop: Multi-column grid (2-4 columns)
 * Tablet: 2 columns
 * Mobile: Single column stack
 */
export function ResponsiveChartGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const gridClasses = {
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4 md:gap-6`}>
      {children}
    </div>
  );
}

/**
 * Responsive chart card wrapper
 * Ensures consistent sizing and overflow handling
 */
export function ResponsiveChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl p-4 md:p-6 border border-[#e0e0e0] ${className}`}>
      <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-3 md:mb-4">
        {title}
      </h3>
      <div className="w-full overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
