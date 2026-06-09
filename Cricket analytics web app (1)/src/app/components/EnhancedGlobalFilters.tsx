import { Lock, Info } from 'lucide-react';
import { MultiSelectDropdownEnhanced } from './EnhancedPlayerFilters';

/**
 * CHANGE 2.2: Toss Result Filter with Dynamic Counts
 */
export function TossResultFilter({
  selected,
  onChange,
  counts,
  disabled,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
  counts: { Won: number; Lost: number };
  disabled: boolean;
}) {
  const options = [
    { label: `Won (${counts.Won})`, value: 'Won', count: counts.Won },
    { label: `Lost (${counts.Lost})`, value: 'Lost', count: counts.Lost },
  ];

  return (
    <MultiSelectDropdownEnhanced
      label="Toss Result"
      options={options}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
      showCounts={false}
    />
  );
}

/**
 * CHANGE 2.2: Bat/Field First Filter with Availability
 */
export function BatFieldFirstFilter({
  selected,
  onChange,
  availability,
  disabled,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
  availability: { batFirst: boolean; fieldFirst: boolean };
  disabled: boolean;
}) {
  const options = [
    { label: 'Bat First', value: 'Bat First', disabled: !availability.batFirst },
    { label: 'Field First', value: 'Field First', disabled: !availability.fieldFirst },
  ];

  return (
    <MultiSelectDropdownEnhanced
      label="Bat/Field First"
      options={options}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

/**
 * CHANGE 2.3: Venue Filter with Head-to-Head Match Counts
 */
export function VenueFilter({
  selected,
  onChange,
  venuesWithHistory,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
  venuesWithHistory: Array<{ venue: string; matchCount: number }>;
}) {
  const options = venuesWithHistory.map(v => ({
    label: v.matchCount > 0 ? `${v.venue} (${v.matchCount} matches)` : v.venue,
    value: v.venue,
  }));

  return (
    <MultiSelectDropdownEnhanced
      label="Venue"
      options={options}
      selected={selected}
      onChange={onChange}
    />
  );
}

/**
 * CHANGE 2.4: Overs Range Slider with Auto-Capping
 */
export function OversRangeSlider({
  value,
  onChange,
  max,
}: {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  max: number;
}) {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    // Auto-adjust if max changes and current value exceeds it
    if (localValue[1] > max) {
      const newValue: [number, number] = [localValue[0], max];
      setLocalValue(newValue);
      onChange(newValue);
    }
  }, [max, localValue, onChange]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseInt(e.target.value);
    const newValue: [number, number] = [Math.min(newMin, localValue[1]), localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value);
    const cappedMax = Math.min(newMax, max);
    const newValue: [number, number] = [localValue[0], Math.max(cappedMax, localValue[0])];
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="px-4 py-3 border border-[#e0e0e0] rounded-lg bg-white min-w-[220px] flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-[#666666] whitespace-nowrap">
          Overs: {localValue[0]} - {localValue[1]}
        </div>
        <div className="text-xs text-[#e60023] font-medium">
          Max: {max}
        </div>
      </div>
      <div className="relative h-2">
        <div className="absolute w-full h-2 bg-[#e0e0e0] rounded-lg"></div>
        <input
          type="range"
          min={1}
          max={max}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-auto cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e60023] [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#e60023] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        />
        <input
          type="range"
          min={1}
          max={max}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-auto cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e60023] [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#e60023] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        />
        <div
          className="absolute h-2 bg-[#e60023] rounded-lg pointer-events-none"
          style={{
            left: `${((localValue[0] - 1) / (max - 1)) * 100}%`,
            right: `${((max - localValue[1]) / (max - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * CHANGE 2.1: Locked Match Type Indicator
 */
export function MatchTypeFilter({
  selected,
  onChange,
  isLocked,
  lockedValue,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
  isLocked: boolean;
  lockedValue: string | null;
}) {
  if (isLocked && lockedValue) {
    return (
      <div className="px-4 py-2 border border-[#e60023] rounded-lg text-sm bg-[#e60023]/5 flex items-center gap-2 min-w-[150px] text-[#e60023] cursor-not-allowed">
        <Lock size={14} />
        <span>{lockedValue}</span>
        <span className="text-xs text-[#999999]">▼</span>
      </div>
    );
  }

  return (
    <MultiSelectDropdownEnhanced
      label="Match Type"
      options={[
        { label: 'T20', value: 'T20' },
        { label: '50 Overs', value: '50 Overs' },
      ]}
      selected={selected}
      onChange={onChange}
    />
  );
}

/**
 * CHANGE 2.1: Team Filter with Tournament Lock Indicator
 */
export function TeamFilter({
  label,
  selected,
  onChange,
  options,
  isRestricted,
  tooltip,
}: {
  label: string;
  selected: string[];
  onChange: (value: string[]) => void;
  options: string[];
  isRestricted: boolean;
  tooltip?: string;
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const formattedOptions = options.map(opt => ({
    label: opt,
    value: opt,
  }));

  return (
    <div
      className="relative"
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative">
        <MultiSelectDropdownEnhanced
          label={label}
          options={formattedOptions}
          selected={selected}
          onChange={onChange}
        />
        {isRestricted && (
          <div className="absolute top-1/2 right-10 -translate-y-1/2 pointer-events-none">
            <Lock size={12} className="text-[#e60023]" />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute top-full left-0 mt-1 px-3 py-2 bg-[#1a1a1a] text-white text-xs rounded shadow-lg z-50 whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// Import React for hooks
import React from 'react';
