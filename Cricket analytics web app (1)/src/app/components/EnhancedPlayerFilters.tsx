import { Lock, Link2 } from 'lucide-react';
import { useMemo } from 'react';

interface MultiSelectDropdownEnhancedProps {
  label: string;
  options: Array<{
    label: string;
    value: string;
    count?: number;
    disabled?: boolean;
  }>;
  selected: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  locked?: boolean;
  showCounts?: boolean;
}

/**
 * CHANGE 1: Enhanced MultiSelect with Default, Active, and Disabled states
 */
export function MultiSelectDropdownEnhanced({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  locked = false,
  showCounts = false,
}: MultiSelectDropdownEnhancedProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Determine chip state
  const chipState = useMemo(() => {
    if (disabled) return 'disabled';
    if (locked) return 'locked';
    if (selected.length > 0) return 'active';
    return 'default';
  }, [disabled, locked, selected.length]);

  const chipClasses = {
    default: 'border-[#e0e0e0] text-[#1a1a1a] bg-white hover:border-[#e60023]',
    active: 'border-[#e60023] text-[#e60023] bg-[#e60023]/5',
    locked: 'border-[#e60023] text-[#e60023] bg-[#e60023]/5 cursor-not-allowed',
    disabled: 'border-[#e0e0e0] text-[#999999] bg-[#f5f5f5] opacity-40 cursor-not-allowed',
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => !disabled && !locked && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-4 py-2 border rounded-lg text-sm transition-all flex items-center gap-2 min-w-[150px] justify-between whitespace-nowrap ${chipClasses[chipState]}`}
      >
        <span className="flex-1 text-left truncate">
          {label}
          {selected.length > 0 && ` (${selected.length})`}
        </span>
        {locked && <Lock size={14} className="text-[#e60023]" />}
        {!disabled && !locked && <span className="text-xs">▼</span>}
      </button>

      {isOpen && !disabled && !locked && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-[200px]">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
                option.disabled
                  ? 'opacity-40 cursor-not-allowed bg-[#f9f9f9]'
                  : 'hover:bg-[#f5f5f5]'
              }`}
            >
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => !option.disabled && handleToggle(option.value)}
                  disabled={option.disabled}
                  className="w-4 h-4 rounded border-[#e0e0e0] text-[#e60023] focus:ring-[#e60023]"
                  style={{ accentColor: '#e60023' }}
                />
                <span className={`text-sm ${option.disabled ? 'text-[#999999]' : 'text-[#1a1a1a]'}`}>
                  {option.label}
                </span>
              </div>
              {showCounts && option.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  option.count === 0
                    ? 'bg-[#f0f0f0] text-[#999999]'
                    : 'bg-[#e60023]/10 text-[#e60023]'
                }`}>
                  {option.count}
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CHANGE 1.1: Bidirectional Batter ↔ Batter Style Filter with Visual Coupling
 */
export function BatterFiltersGroup({
  batters,
  batterStyle,
  availableBatters,
  detectedBatterStyle,
  onBatterChange,
  onBatterStyleChange,
}: {
  batters: string[];
  batterStyle: string[];
  availableBatters: Array<{ name: string; batterStyle: 'RHB' | 'LHB' }>;
  detectedBatterStyle: 'RHB' | 'LHB' | null;
  onBatterChange: (value: string[]) => void;
  onBatterStyleChange: (value: string[]) => void;
}) {
  // Determine which batter styles are disabled
  const batterStyleOptions = useMemo(() => {
    return [
      {
        label: 'RHB',
        value: 'RHB',
        disabled: detectedBatterStyle === 'LHB',
      },
      {
        label: 'LHB',
        value: 'LHB',
        disabled: detectedBatterStyle === 'RHB',
      },
    ];
  }, [detectedBatterStyle]);

  // Determine which batters are disabled based on style filter
  const batterOptions = useMemo(() => {
    return availableBatters.map(batter => ({
      label: batter.name,
      value: batter.name,
      disabled: batterStyle.length > 0 && !batterStyle.includes(batter.batterStyle),
    }));
  }, [availableBatters, batterStyle]);

  const isCoupled = batterStyle.length > 0 || detectedBatterStyle !== null;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <MultiSelectDropdownEnhanced
        label="Batter"
        options={batterOptions}
        selected={batters}
        onChange={onBatterChange}
      />

      {/* Visual coupling indicator */}
      {isCoupled && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e60023]/10">
          <Link2 size={12} className="text-[#e60023]" />
        </div>
      )}

      <MultiSelectDropdownEnhanced
        label="Batter Style"
        options={batterStyleOptions}
        selected={batterStyle}
        onChange={onBatterStyleChange}
        locked={detectedBatterStyle !== null}
      />
    </div>
  );
}

/**
 * CHANGE 1.2: Three-Way Bowler ↔ Bowler Style ↔ Bowler Type with Dynamic Counts
 */
export function BowlerFiltersGroup({
  bowlers,
  bowlerStyle,
  bowlerType,
  availableBowlers,
  bowlerTypeCounts,
  onBowlerChange,
  onBowlerStyleChange,
  onBowlerTypeChange,
}: {
  bowlers: string[];
  bowlerStyle: string[];
  bowlerType: string[];
  availableBowlers: Array<{
    name: string;
    bowlerStyle?: 'Right-arm' | 'Left-arm';
    bowlerType?: 'Spin' | 'Pace' | 'Medium Pace';
  }>;
  bowlerTypeCounts: Record<string, number>;
  onBowlerChange: (value: string[]) => void;
  onBowlerStyleChange: (value: string[]) => void;
  onBowlerTypeChange: (value: string[]) => void;
}) {
  // Bowler type options with dynamic counts
  const bowlerTypeOptions = useMemo(() => {
    return ['Spin', 'Pace', 'Medium Pace'].map(type => ({
      label: type,
      value: type,
      count: bowlerTypeCounts[type] || 0,
      disabled: (bowlerTypeCounts[type] || 0) === 0,
    }));
  }, [bowlerTypeCounts]);

  // Bowler style options
  const bowlerStyleOptions = useMemo(() => {
    return [
      {
        label: 'Right-arm',
        value: 'Right-arm',
        disabled: false,
      },
      {
        label: 'Left-arm',
        value: 'Left-arm',
        disabled: false,
      },
    ];
  }, []);

  // Bowler options filtered by type and style
  const bowlerOptions = useMemo(() => {
    return availableBowlers.map(bowler => ({
      label: bowler.name,
      value: bowler.name,
      disabled: false,
    }));
  }, [availableBowlers]);

  const isCoupled = bowlerStyle.length > 0 || bowlerType.length > 0 || bowlers.length > 0;

  return (
    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap md:flex-nowrap">
      <MultiSelectDropdownEnhanced
        label="Bowler"
        options={bowlerOptions}
        selected={bowlers}
        onChange={onBowlerChange}
      />

      {/* Visual coupling indicator */}
      {isCoupled && (
        <div className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-[#e60023]/10">
          <Link2 size={12} className="text-[#e60023]" />
        </div>
      )}

      <MultiSelectDropdownEnhanced
        label="Bowler Style"
        options={bowlerStyleOptions}
        selected={bowlerStyle}
        onChange={onBowlerStyleChange}
      />

      {/* Visual coupling indicator */}
      {isCoupled && (
        <div className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-[#e60023]/10">
          <Link2 size={12} className="text-[#e60023]" />
        </div>
      )}

      <MultiSelectDropdownEnhanced
        label="Bowler Type"
        options={bowlerTypeOptions}
        selected={bowlerType}
        onChange={onBowlerTypeChange}
        showCounts={true}
      />
    </div>
  );
}

// Re-export for backwards compatibility
export { MultiSelectDropdownEnhanced as MultiSelectDropdown };
