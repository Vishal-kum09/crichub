import { useState, useEffect, useRef } from 'react';
import { Calendar, X } from 'lucide-react';

interface EnhancedDateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  minDate?: string; // Tournament start date
  maxDate?: string; // Tournament end date
  disabled?: boolean;
}

export function EnhancedDateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  disabled = false,
}: EnhancedDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Format date from YYYY-MM-DD to DD-MM-YYYY for display
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  // Format date from DD-MM-YYYY to YYYY-MM-DD for internal use
  const formatInternalDate = (displayStr: string) => {
    if (!displayStr) return '';
    const parts = displayStr.split('-');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Initialize input fields
  useEffect(() => {
    setStartInput(formatDisplayDate(startDate));
    setEndInput(formatDisplayDate(endDate));
  }, [startDate, endDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate date against constraints
  const validateDate = (dateStr: string, isStartDate: boolean): string | null => {
    if (!dateStr) return 'Date is required';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date format';

    // Check tournament boundaries
    if (minDate && dateStr < minDate) {
      return `Date must be after ${formatDisplayDate(minDate)}`;
    }
    if (maxDate && dateStr > maxDate) {
      return `Date must be before ${formatDisplayDate(maxDate)}`;
    }

    // Check start/end relationship
    if (isStartDate && endDate && dateStr > endDate) {
      return 'Start date cannot be after end date';
    }
    if (!isStartDate && startDate && dateStr < startDate) {
      return 'End date cannot be before start date';
    }

    return null;
  };

  // Handle manual input change with live formatting
  const handleInputChange = (value: string, isStartDate: boolean) => {
    // Remove non-numeric and non-dash characters
    let cleaned = value.replace(/[^\d-]/g, '');

    // Auto-add dashes as user types DD-MM-YYYY
    if (cleaned.length >= 2 && cleaned[2] !== '-') {
      cleaned = cleaned.slice(0, 2) + '-' + cleaned.slice(2);
    }
    if (cleaned.length >= 5 && cleaned[5] !== '-') {
      cleaned = cleaned.slice(0, 5) + '-' + cleaned.slice(5);
    }

    // Limit to DD-MM-YYYY format (10 chars)
    cleaned = cleaned.slice(0, 10);

    if (isStartDate) {
      setStartInput(cleaned);
    } else {
      setEndInput(cleaned);
    }

    // If complete date entered (DD-MM-YYYY), validate and apply
    if (cleaned.length === 10) {
      const internalDate = formatInternalDate(cleaned);
      const error = validateDate(internalDate, isStartDate);

      if (error) {
        setValidationError(error);
      } else {
        setValidationError('');
        if (isStartDate) {
          onChange(internalDate, endDate);
        } else {
          onChange(startDate, internalDate);
        }
      }
    }
  };

  // Handle calendar date selection
  const handleCalendarChange = (value: string, isStartDate: boolean) => {
    const error = validateDate(value, isStartDate);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError('');
    if (isStartDate) {
      onChange(value, endDate);
      setStartInput(formatDisplayDate(value));
    } else {
      onChange(startDate, value);
      setEndInput(formatDisplayDate(value));
    }
  };

  // Clear dates
  const handleClear = () => {
    onChange('', '');
    setStartInput('');
    setEndInput('');
    setValidationError('');
  };

  const displayText = startDate && endDate
    ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
    : 'Select Date Range';

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-4 py-2 border rounded-lg text-sm bg-white transition-colors flex items-center gap-2 min-w-[200px] justify-between whitespace-nowrap ${
          disabled
            ? 'border-[#e0e0e0] text-[#999999] cursor-not-allowed'
            : 'border-[#e0e0e0] text-[#1a1a1a] hover:border-[#e60023] focus:border-[#e60023] focus:outline-none'
        }`}
      >
        <Calendar size={16} className={disabled ? 'text-[#999999]' : 'text-[#666666]'} />
        <span className="flex-1 text-left truncate">{displayText}</span>
        {startDate && endDate && !disabled && (
          <X
            size={16}
            className="text-[#666666] hover:text-[#e60023]"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-50 p-4 min-w-[320px]">
          {/* Manual Input Fields */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#666666] mb-2">
              Manual Entry (DD-MM-YYYY)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={startInput}
                  onChange={(e) => handleInputChange(e.target.value, true)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded text-sm focus:outline-none focus:border-[#e60023]"
                  maxLength={10}
                />
                <span className="text-xs text-[#999999]">Start Date</span>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={endInput}
                  onChange={(e) => handleInputChange(e.target.value, false)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded text-sm focus:outline-none focus:border-[#e60023]"
                  maxLength={10}
                />
                <span className="text-xs text-[#999999]">End Date</span>
              </div>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {validationError}
            </div>
          )}

          {/* CHANGE 2.5: Tournament Constraint Info */}
          {minDate && maxDate && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600 flex items-start gap-2">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Dates restricted to tournament</div>
                <div className="text-blue-500 mt-0.5">
                  {formatDisplayDate(minDate)} to {formatDisplayDate(maxDate)}
                </div>
              </div>
            </div>
          )}

          {/* Calendar Pickers */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCalendarChange(e.target.value, true)}
                min={minDate}
                max={maxDate || endDate}
                className="w-full px-3 py-2 border border-[#e0e0e0] rounded text-sm focus:outline-none focus:border-[#e60023]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCalendarChange(e.target.value, false)}
                min={minDate || startDate}
                max={maxDate}
                className="w-full px-3 py-2 border border-[#e0e0e0] rounded text-sm focus:outline-none focus:border-[#e60023]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 bg-[#e60023] text-white rounded text-sm hover:bg-[#c41e3a] transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 border border-[#e0e0e0] text-[#666666] rounded text-sm hover:border-[#e60023] hover:text-[#e60023] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
