import { useState, useEffect } from 'react';

/**
 * CHANGE 3C: Responsive width tracking hook
 * Tracks window width and provides mobile detection
 */
export function useResponsiveWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}

/**
 * CHANGE 3C: Chart height configuration based on device
 */
export function getChartHeight(
  chartType: 'line' | 'bar' | 'pie' | 'donut',
  isMobile: boolean
): number {
  const heights = {
    line: isMobile ? 200 : 300,
    bar: isMobile ? 180 : 260,
    pie: isMobile ? 200 : 280,
    donut: isMobile ? 200 : 280,
  };

  return heights[chartType];
}

/**
 * CHANGE 3C: Recharts axis configuration
 */
export function getAxisConfig(isMobile: boolean) {
  return {
    tick: { fontSize: isMobile ? 9 : 12 },
    interval: isMobile ? 9 : 4,
  };
}

/**
 * CHANGE 3C: Recharts legend configuration
 */
export function getLegendConfig(isMobile: boolean) {
  return {
    wrapperStyle: { fontSize: isMobile ? 10 : 12 },
  };
}

/**
 * CHANGE 3C: Grid configuration for stat cards
 */
export function getStatGridClasses(isMobile: boolean): string {
  return 'grid grid-cols-2 gap-3 md:grid-cols-3';
}

/**
 * CHANGE 3C: Chart grid configuration
 */
export function getChartGridClasses(): string {
  return 'grid grid-cols-1 gap-4 md:grid-cols-2';
}

/**
 * CHANGE 3C: Chart card configuration
 */
export function getChartCardClasses(): string {
  return 'w-full overflow-hidden p-3 md:p-5';
}

/**
 * CHANGE 3C: Table configuration
 */
export function getTableClasses(): string {
  return 'overflow-x-auto w-full text-xs md:text-sm';
}
