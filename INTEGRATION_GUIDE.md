# NV Play Analytics Integration Guide

## Overview
This guide shows how to integrate the centralized filter hook, enhanced date picker, and responsive components into the existing NVPlayAnalytics page.

---

## Step 1: Update NVPlayAnalytics.tsx Import Section

```typescript
// Add these imports at the top of NVPlayAnalytics.tsx
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { EnhancedDateRangePicker } from '../components/EnhancedDateRangePicker';
import {
  ResponsiveFilterWrapper,
  ResponsiveChartGrid,
  ResponsiveChartCard,
} from '../components/ResponsiveFilterWrapper';

// ... existing imports remain unchanged
```

---

## Step 2: Replace Filter State Management

**REMOVE the old state declarations:**
```typescript
// ❌ DELETE these lines:
const [globalFilters, setGlobalFilters] = useState({
  tournament: [] as string[],
  homeTeam: [] as string[],
  // ... etc
});
```

**ADD the custom hook:**
```typescript
// ✅ ADD this single line:
const {
  filters,
  updateFilter,
  availableOptions,
  homeTeamOptions,
  oppositionTeamOptions,
  availableBatters,
  availableBowlers,
  bowlerTypeCounts,
} = useDashboardFilters();
```

---

## Step 3: Update Global Filters Section

**REPLACE the existing Global Filters div with:**

```typescript
<ResponsiveFilterWrapper title="Global Filters">
  <MultiSelectDropdown
    label="Tournament"
    options={['IPL 2024', 'T20 World Cup', 'The Hundred']}
    selected={filters.tournament}
    onChange={(val) => updateFilter('tournament', val)}
  />
  <MultiSelectDropdown
    label="Home Team"
    options={homeTeamOptions} // ✅ Now uses filtered options
    selected={filters.homeTeam}
    onChange={(val) => updateFilter('homeTeam', val)}
  />
  <MultiSelectDropdown
    label="Opposition Team"
    options={oppositionTeamOptions} // ✅ Now excludes selected home teams
    selected={filters.oppositionTeam}
    onChange={(val) => updateFilter('oppositionTeam', val)}
  />
  <MultiSelectDropdown
    label="Home/Away"
    options={['Home', 'Away', 'Neutral']}
    selected={filters.homeAway}
    onChange={(val) => updateFilter('homeAway', val)}
  />
  <MultiSelectDropdown
    label="Toss Result"
    options={['Won', 'Lost']}
    selected={filters.tossResult}
    onChange={(val) => updateFilter('tossResult', val)}
  />
  <MultiSelectDropdown
    label="Match Type"
    options={availableOptions.matchTypes} // ✅ Cascades from tournament
    selected={filters.matchType}
    onChange={(val) => updateFilter('matchType', val)}
  />
</ResponsiveFilterWrapper>
```

---

## Step 4: Update Team Filters Section (TeamPerformanceDashboard)

**FIND this section in TeamPerformanceDashboard and REPLACE:**

```typescript
<ResponsiveFilterWrapper title="Team Filters">
  <MultiSelectDropdown
    label="Opposition Team"
    options={oppositionTeamOptions}
    selected={filters.oppositionTeam}
    onChange={(val) => updateFilter('oppositionTeam', val)}
  />
  <MultiSelectDropdown
    label="Venue"
    options={availableOptions.venues} // ✅ Cascades from tournament
    selected={filters.venue}
    onChange={(val) => updateFilter('venue', val)}
  />
  <RangeSlider
    min={1}
    max={20}
    value={filters.oversRange}
    onChange={(val) => updateFilter('oversRange', val)}
  />
</ResponsiveFilterWrapper>
```

---

## Step 5: Update Player Filters with Bi-directional Logic

**REPLACE the Player Filters section:**

```typescript
<ResponsiveFilterWrapper title="Player Filters">
  {/* Batter Filters */}
  <MultiSelectDropdown
    label="Batter"
    options={availableBatters.map(p => p.name)} // ✅ Filtered by batter style
    selected={filters.batter}
    onChange={(val) => updateFilter('batter', val)}
  />
  <MultiSelectDropdown
    label="Batter Style"
    options={['RHB', 'LHB']}
    selected={filters.batterStyle}
    onChange={(val) => updateFilter('batterStyle', val)} // ✅ Auto-filters batters
  />

  {/* Bowler Filters */}
  <MultiSelectDropdown
    label="Bowler"
    options={availableBowlers.map(p => p.name)} // ✅ Filtered by type and style
    selected={filters.bowler}
    onChange={(val) => updateFilter('bowler', val)}
  />
  <MultiSelectDropdown
    label="Bowler Type"
    options={['Spin', 'Pace', 'Medium Pace'].map(type => ({
      label: `${type} (${bowlerTypeCounts[type] || 0})`, // ✅ Shows counts
      value: type,
    }))}
    selected={filters.bowlerType}
    onChange={(val) => updateFilter('bowlerType', val)}
  />
  <MultiSelectDropdown
    label="Bowler Style"
    options={['RHB', 'LHB']}
    selected={filters.bowlerStyle}
    onChange={(val) => updateFilter('bowlerStyle', val)}
  />
  
  {/* ... other filters remain unchanged */}
</ResponsiveFilterWrapper>
```

---

## Step 6: Update Tournament Filters with Enhanced Date Picker

**REPLACE the DateRangePicker component:**

```typescript
<ResponsiveFilterWrapper title="Tournament Filters">
  <EnhancedDateRangePicker
    startDate={filters.dateRange.startDate}
    endDate={filters.dateRange.endDate}
    onChange={(start, end) => 
      updateFilter('dateRange', { startDate: start, endDate: end })
    }
    minDate={availableOptions.dateRange.min} // ✅ Tournament constraint
    maxDate={availableOptions.dateRange.max} // ✅ Tournament constraint
    disabled={filters.tournament.length === 0} // ✅ Requires tournament selection
  />
  
  {/* ... other tournament filters */}
</ResponsiveFilterWrapper>
```

---

## Step 7: Update Chart Grids for Responsive Layout

**REPLACE existing chart grid containers:**

```typescript
// Example: Innings Progression Tab
{selectedSubTab === 'innings' && (
  <ResponsiveChartGrid columns={2}>
    <ResponsiveChartCard title="Run Rate Progression by Over">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={runRateData}>
          {/* ... existing chart code unchanged ... */}
        </LineChart>
      </ResponsiveContainer>
    </ResponsiveChartCard>

    <ResponsiveChartCard title="Boundary & Scoring Shot Breakdown">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          {/* ... existing chart code unchanged ... */}
        </PieChart>
      </ResponsiveContainer>
    </ResponsiveChartCard>

    {/* ... more charts ... */}
  </ResponsiveChartGrid>
)}
```

**For 3-column layouts:**
```typescript
<ResponsiveChartGrid columns={3}>
  {/* Charts automatically become single column on mobile */}
</ResponsiveChartGrid>
```

---

## Step 8: Update MultiSelectDropdown to Support Counts

**MODIFY MultiSelectDropdown component to accept objects with counts:**

```typescript
// In MultiSelectDropdown component, update the options type:
interface Option {
  label: string;
  value: string;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: (string | Option)[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  // Normalize options
  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  // ... rest of component uses normalizedOptions ...

  return (
    <div className="relative flex-shrink-0">
      {/* ... existing code ... */}
      <div className="absolute top-full left-0 mt-1 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-[150px]">
        {normalizedOptions.map((option) => (
          <label key={option.value} className="flex items-center gap-2 px-3 py-2 hover:bg-[#f5f5f5] cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="w-4 h-4 rounded border-[#e0e0e0] text-[#e60023] focus:ring-[#e60023]"
              style={{ accentColor: '#e60023' }}
            />
            <span className="text-sm text-[#1a1a1a]">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 9: Performance Optimization for Data Filtering

**ADD a memoized data filtering function:**

```typescript
import { useMemo } from 'react';

// At the top of your dashboard component
const filteredData = useMemo(() => {
  // This runs once when filters change, not on every render
  let data = masterDataset; // Your full dataset

  // Apply tournament filter
  if (filters.tournament.length > 0) {
    data = data.filter(item => filters.tournament.includes(item.tournament));
  }

  // Apply team filters
  if (filters.homeTeam.length > 0) {
    data = data.filter(item => filters.homeTeam.includes(item.homeTeam));
  }

  // ... apply other filters ...

  return data;
}, [filters, masterDataset]);

// Then pass filteredData to your charts instead of making separate API calls
```

---

## Step 10: Mobile-Specific Considerations

**ADD mobile-specific overrides in your page container:**

```typescript
return (
  <div className="min-h-screen bg-[#f5f5f5]">
    {/* Top Navigation - Already responsive from previous implementation */}
    {/* ... existing code ... */}

    {/* Main Content Container */}
    <div className="p-4 md:p-6">
      {/* Filters - Now use ResponsiveFilterWrapper */}
      {/* Charts - Now use ResponsiveChartGrid */}
      
      {/* For tables, add horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          {/* Table content */}
        </table>
      </div>
    </div>
  </div>
);
```

---

## Testing Checklist

- [ ] Desktop: Filters display in horizontal row
- [ ] Mobile: Filters are collapsible or horizontally scrollable
- [ ] Desktop: Charts display in multi-column grid
- [ ] Mobile: Charts stack in single column
- [ ] Tournament selection updates available teams/venues/match types
- [ ] Home team selection removes that team from opposition options
- [ ] Batter style filters available batters
- [ ] Selected batters auto-adjust batter style
- [ ] Bowler type shows dynamic counts
- [ ] Date picker validates against tournament boundaries
- [ ] Date picker prevents end date before start date
- [ ] Manual date entry works with DD-MM-YYYY format
- [ ] Calendar picker respects min/max constraints

---

## Notes

1. **Token Efficiency**: Only the filter logic and layout wrappers changed. All chart implementations, data structures, and business logic remain untouched.

2. **Cascading Updates**: The hook handles all filter dependencies automatically. No manual cascade logic needed in components.

3. **Performance**: Filters update without re-rendering unaffected components thanks to the hook's memoization.

4. **Accessibility**: All components maintain keyboard navigation and ARIA attributes from the original implementation.

5. **Extensibility**: Add new filters by simply calling `updateFilter(key, value)` - the hook handles cascading automatically.
