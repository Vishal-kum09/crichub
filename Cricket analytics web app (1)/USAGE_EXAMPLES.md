# NV Play Analytics - Usage Examples

## Example 1: Complete Filter Section with All Features

```typescript
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { EnhancedDateRangePicker } from '../components/EnhancedDateRangePicker';
import { ResponsiveFilterWrapper } from '../components/ResponsiveFilterWrapper';

function TeamPerformanceDashboard() {
  const {
    filters,
    updateFilter,
    availableOptions,
    homeTeamOptions,
    oppositionTeamOptions,
    bowlerTypeCounts,
  } = useDashboardFilters();

  return (
    <div>
      {/* Global Filters */}
      <ResponsiveFilterWrapper title="Global Filters" collapsible={true}>
        <MultiSelectDropdown
          label="Tournament"
          options={['IPL 2024', 'T20 World Cup', 'The Hundred']}
          selected={filters.tournament}
          onChange={(val) => updateFilter('tournament', val)}
        />
        
        {/* These options cascade from tournament selection */}
        <MultiSelectDropdown
          label="Home Team"
          options={homeTeamOptions} // Excludes opposition teams
          selected={filters.homeTeam}
          onChange={(val) => updateFilter('homeTeam', val)}
        />
        
        <MultiSelectDropdown
          label="Venue"
          options={availableOptions.venues} // Only venues from selected tournaments
          selected={filters.venue}
          onChange={(val) => updateFilter('venue', val)}
        />
      </ResponsiveFilterWrapper>

      {/* Player Filters with Bi-directional Logic */}
      <ResponsiveFilterWrapper title="Player Filters">
        <MultiSelectDropdown
          label="Bowler Type"
          options={[
            { label: `Spin (${bowlerTypeCounts['Spin'] || 0})`, value: 'Spin' },
            { label: `Pace (${bowlerTypeCounts['Pace'] || 0})`, value: 'Pace' },
            { label: `Medium Pace (${bowlerTypeCounts['Medium Pace'] || 0})`, value: 'Medium Pace' },
          ]}
          selected={filters.bowlerType}
          onChange={(val) => updateFilter('bowlerType', val)}
        />
      </ResponsiveFilterWrapper>

      {/* Date Range with Tournament Constraints */}
      <ResponsiveFilterWrapper title="Tournament Filters">
        <EnhancedDateRangePicker
          startDate={filters.dateRange.startDate}
          endDate={filters.dateRange.endDate}
          onChange={(start, end) => 
            updateFilter('dateRange', { startDate: start, endDate: end })
          }
          minDate={availableOptions.dateRange.min}
          maxDate={availableOptions.dateRange.max}
          disabled={filters.tournament.length === 0}
        />
      </ResponsiveFilterWrapper>
    </div>
  );
}
```

---

## Example 2: Responsive Chart Layout

```typescript
import { ResponsiveChartGrid, ResponsiveChartCard } from '../components/ResponsiveFilterWrapper';

function AnalyticsDashboard() {
  return (
    <div className="p-4 md:p-6">
      {/* 2-column grid on desktop, single column on mobile */}
      <ResponsiveChartGrid columns={2}>
        <ResponsiveChartCard title="Run Rate Progression">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={runRateData}>
              {/* ... chart config ... */}
            </LineChart>
          </ResponsiveContainer>
        </ResponsiveChartCard>

        <ResponsiveChartCard title="Boundary Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              {/* ... chart config ... */}
            </PieChart>
          </ResponsiveContainer>
        </ResponsiveChartCard>
      </ResponsiveChartGrid>

      {/* 3-column grid on desktop, 2 on tablet, 1 on mobile */}
      <ResponsiveChartGrid columns={3}>
        {kpiCards.map(kpi => (
          <ResponsiveChartCard key={kpi.title} title={kpi.title}>
            <div className="text-center py-8">
              <p className="text-4xl md:text-5xl font-bold text-[#e60023]">
                {kpi.value}
              </p>
              <p className="text-sm text-[#666666] mt-2">{kpi.subtitle}</p>
            </div>
          </ResponsiveChartCard>
        ))}
      </ResponsiveChartGrid>
    </div>
  );
}
```

---

## Example 3: Data Filtering with Memoization

```typescript
import { useMemo } from 'react';
import { useDashboardFilters } from '../hooks/useDashboardFilters';

function PerformanceDashboard() {
  const { filters } = useDashboardFilters();
  
  // Assume you have a master dataset loaded once
  const masterData = useMasterDataset(); // Your data fetching hook

  // Filter data based on active filters - runs only when filters change
  const filteredMatches = useMemo(() => {
    let matches = masterData.matches;

    // Tournament filter
    if (filters.tournament.length > 0) {
      matches = matches.filter(m => 
        filters.tournament.includes(m.tournament)
      );
    }

    // Team filters (mutually exclusive logic handled by hook)
    if (filters.homeTeam.length > 0) {
      matches = matches.filter(m => 
        filters.homeTeam.includes(m.homeTeam)
      );
    }
    if (filters.oppositionTeam.length > 0) {
      matches = matches.filter(m => 
        filters.oppositionTeam.includes(m.oppositionTeam)
      );
    }

    // Venue filter (cascaded from tournament)
    if (filters.venue.length > 0) {
      matches = matches.filter(m => 
        filters.venue.includes(m.venue)
      );
    }

    // Date range filter
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      matches = matches.filter(m => 
        m.date >= filters.dateRange.startDate && 
        m.date <= filters.dateRange.endDate
      );
    }

    return matches;
  }, [filters, masterData]);

  // Derive innings data from filtered matches
  const filteredInnings = useMemo(() => {
    return filteredMatches.flatMap(m => m.innings);
  }, [filteredMatches]);

  // Derive deliveries data
  const filteredDeliveries = useMemo(() => {
    let deliveries = filteredInnings.flatMap(i => i.deliveries);

    // Player filters
    if (filters.batter.length > 0) {
      deliveries = deliveries.filter(d => 
        filters.batter.includes(d.batterName)
      );
    }
    if (filters.bowler.length > 0) {
      deliveries = deliveries.filter(d => 
        filters.bowler.includes(d.bowlerName)
      );
    }

    // Overs range
    deliveries = deliveries.filter(d => 
      d.over >= filters.oversRange[0] && 
      d.over <= filters.oversRange[1]
    );

    return deliveries;
  }, [filteredInnings, filters.batter, filters.bowler, filters.oversRange]);

  // Now pass filtered data to charts - NO API CALLS on filter change
  return (
    <ResponsiveChartGrid columns={2}>
      <ResponsiveChartCard title="Runs by Over">
        <RunsByOverChart data={filteredDeliveries} />
      </ResponsiveChartCard>
      
      <ResponsiveChartCard title="Bowling Analysis">
        <BowlingChart data={filteredDeliveries} />
      </ResponsiveChartCard>
    </ResponsiveChartGrid>
  );
}
```

---

## Example 4: Date Picker Edge Cases

```typescript
// Case 1: Manual date entry validation
<EnhancedDateRangePicker
  startDate={filters.dateRange.startDate}
  endDate={filters.dateRange.endDate}
  onChange={(start, end) => updateFilter('dateRange', { startDate: start, endDate: end })}
  minDate="2024-03-22"  // Tournament start
  maxDate="2024-05-26"  // Tournament end
/>

// User types: "15-03-2024" in start date
// ❌ Error shown: "Date must be after 22-03-2024"

// User types: "30-05-2024" in start date, "25-05-2024" in end date
// ❌ Error shown: "End date cannot be before start date"

// User types: "01-04-2024" in start date, "30-04-2024" in end date
// ✅ Success: Both dates applied, dropdown closes on Apply

// Case 2: Disabled when no tournament selected
<EnhancedDateRangePicker
  startDate={filters.dateRange.startDate}
  endDate={filters.dateRange.endDate}
  onChange={(start, end) => updateFilter('dateRange', { startDate: start, endDate: end })}
  minDate={availableOptions.dateRange.min}
  maxDate={availableOptions.dateRange.max}
  disabled={filters.tournament.length === 0} // ✅ Grayed out until tournament selected
/>
```

---

## Example 5: Mobile Filter Behavior

```typescript
// Desktop: Filters visible in horizontal row
// Mobile: Filters in collapsible accordion

<ResponsiveFilterWrapper title="Team Filters" collapsible={true}>
  {/* On Mobile */}
  {/* 📱 Shows: */}
  {/* [🔍 Team Filters ▼] */}
  {/* User taps, expands to show: */}
  {/* ┌─────────────────────┐ */}
  {/* │ Opposition Team     │ */}
  {/* │ Venue               │ */}
  {/* │ Overs Range         │ */}
  {/* └─────────────────────┘ */}
  
  {/* On Desktop */}
  {/* 💻 Shows: */}
  {/* Team Filters */}
  {/* [Opposition Team] [Venue] [Overs Range] */}
  {/* Always expanded */}
  
  <MultiSelectDropdown {...props} />
  <MultiSelectDropdown {...props} />
  <RangeSlider {...props} />
</ResponsiveFilterWrapper>

// Alternative: Horizontal scroll on mobile (collapsible=false)
<ResponsiveFilterWrapper title="Team Filters" collapsible={false}>
  {/* On Mobile */}
  {/* 📱 Shows: */}
  {/* Team Filters */}
  {/* ← [Opp Team] [Venue] [Overs] → */}
  {/* User can scroll horizontally */}
  
  <MultiSelectDropdown {...props} />
  <MultiSelectDropdown {...props} />
  <RangeSlider {...props} />
</ResponsiveFilterWrapper>
```

---

## Example 6: Batch Filter Updates

```typescript
import { useDashboardFilters } from '../hooks/useDashboardFilters';

function QuickFilters() {
  const { updateFilters, resetFilters } = useDashboardFilters();

  const applyIPLDefaults = () => {
    // Update multiple filters at once (single re-render)
    updateFilters({
      tournament: ['IPL 2024'],
      matchType: ['T20'],
      venue: ['Wankhede Stadium', 'M.A. Chidambaram Stadium'],
      dateRange: {
        startDate: '2024-03-22',
        endDate: '2024-05-26',
      },
    });
  };

  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={applyIPLDefaults}
        className="px-4 py-2 bg-[#e60023] text-white rounded-lg"
      >
        IPL 2024 Quick View
      </button>
      
      <button
        onClick={resetFilters}
        className="px-4 py-2 border border-[#e0e0e0] rounded-lg"
      >
        Clear All Filters
      </button>
    </div>
  );
}
```

---

## Example 7: Conditional Filter Display

```typescript
function ConditionalFilters() {
  const { filters, updateFilter, availableBatters } = useDashboardFilters();

  return (
    <ResponsiveFilterWrapper title="Advanced Filters">
      {/* Show batter filter only if batter style is selected */}
      {filters.batterStyle.length > 0 && (
        <MultiSelectDropdown
          label="Select Batters"
          options={availableBatters.map(p => p.name)}
          selected={filters.batter}
          onChange={(val) => updateFilter('batter', val)}
        />
      )}

      {/* Show additional filters only if tournament is selected */}
      {filters.tournament.length > 0 && (
        <>
          <MultiSelectDropdown
            label="Venue"
            options={availableOptions.venues}
            selected={filters.venue}
            onChange={(val) => updateFilter('venue', val)}
          />
          
          <EnhancedDateRangePicker
            startDate={filters.dateRange.startDate}
            endDate={filters.dateRange.endDate}
            onChange={(start, end) => 
              updateFilter('dateRange', { startDate: start, endDate: end })
            }
            minDate={availableOptions.dateRange.min}
            maxDate={availableOptions.dateRange.max}
          />
        </>
      )}
    </ResponsiveFilterWrapper>
  );
}
```

---

## Performance Tips

1. **Use useMemo for derived data:**
   ```typescript
   const chartData = useMemo(() => 
     processData(filteredDeliveries), 
     [filteredDeliveries]
   );
   ```

2. **Avoid inline functions in render:**
   ```typescript
   // ❌ Bad: Creates new function on every render
   onChange={(val) => updateFilter('tournament', val)}
   
   // ✅ Good: Use useCallback
   const handleTournamentChange = useCallback((val) => 
     updateFilter('tournament', val), 
     [updateFilter]
   );
   ```

3. **Lazy load heavy charts:**
   ```typescript
   const HeavyChart = lazy(() => import('./HeavyChart'));
   
   <Suspense fallback={<Spinner />}>
     <HeavyChart data={filteredData} />
   </Suspense>
   ```

4. **Debounce text inputs:**
   ```typescript
   import { debounce } from 'lodash';
   
   const debouncedUpdate = useMemo(
     () => debounce((value) => updateFilter('search', value), 300),
     [updateFilter]
   );
   ```

---

## Troubleshooting

**Issue**: Filters not cascading correctly
- **Solution**: Ensure you're calling `updateFilter()` from the hook, not `setState()` directly

**Issue**: Date picker showing wrong format
- **Solution**: Component uses DD-MM-YYYY for display, YYYY-MM-DD internally - check your date source format

**Issue**: Charts overflowing on mobile
- **Solution**: Wrap in `ResponsiveChartCard` and ensure parent has `overflow-x-auto`

**Issue**: Filter counts not updating
- **Solution**: Verify `bowlerTypeCounts` is computed from the correct data subset

**Issue**: Tournament constraint not working
- **Solution**: Check that `availableOptions.dateRange` has valid min/max dates
