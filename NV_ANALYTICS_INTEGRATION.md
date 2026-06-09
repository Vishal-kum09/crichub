# NV Play Analytics - Complete Integration Guide

## Implementation Overview

This guide shows how to integrate all three changes into the existing NVPlayAnalytics.tsx file.

---

## Step 1: Update Imports

```typescript
// At the top of NVPlayAnalytics.tsx
import { useMemo } from 'react';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useResponsiveWidth, getChartHeight, getAxisConfig, getLegendConfig, getChartGridClasses, getChartCardClasses, getTableClasses } from '../hooks/useResponsiveWidth';
import { EnhancedDateRangePicker } from '../components/EnhancedDateRangePicker';
import {
  BatterFiltersGroup,
  BowlerFiltersGroup,
  MultiSelectDropdownEnhanced,
} from '../components/EnhancedPlayerFilters';
import {
  TossResultFilter,
  BatFieldFirstFilter,
  VenueFilter,
  OversRangeSlider,
  MatchTypeFilter,
  TeamFilter,
} from '../components/EnhancedGlobalFilters';

// ... existing imports remain unchanged
```

---

## Step 2: Replace State Management in Main Component

```typescript
export function NVPlayAnalytics({ onNavigate }: NVPlayAnalyticsProps) {
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<string>('');

  // CHANGE 1 & 2: Replace old filter state with enhanced hook
  const {
    filters,
    updateFilter,
    // CHANGE 2: Cascade values
    isMatchTypeLocked,
    lockedMatchType,
    homeTeamOptions,
    oppositionTeamOptions,
    tossResultCounts,
    batFieldFirstAvailability,
    venueOptionsWithHistory,
    oversMax,
    dateRangeConstraints,
    // CHANGE 1: Player filter values
    availableBatters,
    detectedBatterStyle,
    availableBowlers,
    bowlerTypeCounts,
  } = useDashboardFilters();

  // CHANGE 3: Responsive width tracking
  const { isMobile } = useResponsiveWidth();

  // ... rest of component logic remains unchanged
```

---

## Step 3: Update Global Filters Section

```typescript
{/* CHANGE 2: Enhanced Global Filters with Cascade Logic */}
<div className="bg-white border-b border-[#e0e0e0] px-4 md:px-6 py-4">
  <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Global Filters</h3>
  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
    {/* Tournament - Source of truth */}
    <MultiSelectDropdownEnhanced
      label="Tournament"
      options={[
        { label: 'IPL 2024', value: 'IPL 2024' },
        { label: 'T20 World Cup 2024', value: 'T20 World Cup 2024' },
        { label: 'ODI World Cup 2023', value: 'ODI World Cup 2023' },
      ]}
      selected={filters.tournament}
      onChange={(val) => updateFilter('tournament', val)}
    />

    {/* CHANGE 2.1: Home Team with tournament restriction */}
    <TeamFilter
      label="Home Team"
      selected={filters.homeTeam}
      onChange={(val) => updateFilter('homeTeam', val)}
      options={homeTeamOptions}
      isRestricted={filters.tournament.length > 0}
      tooltip={filters.tournament.length > 0 ? `Restricted to ${filters.tournament[0]} teams` : undefined}
    />

    {/* CHANGE 2.2: Opposition Team (mutually exclusive with home team) */}
    <TeamFilter
      label="Opposition Team"
      selected={filters.oppositionTeam}
      onChange={(val) => updateFilter('oppositionTeam', val)}
      options={oppositionTeamOptions}
      isRestricted={filters.tournament.length > 0}
      tooltip={filters.homeTeam.length > 0 ? 'Cannot select same team as home' : undefined}
    />

    {/* CHANGE 2.2: Toss Result with dynamic counts */}
    <TossResultFilter
      selected={filters.tossResult}
      onChange={(val) => updateFilter('tossResult', val)}
      counts={tossResultCounts}
      disabled={filters.homeTeam.length === 0}
    />

    {/* CHANGE 2.1: Auto-locked Match Type */}
    <MatchTypeFilter
      selected={filters.matchType}
      onChange={(val) => updateFilter('matchType', val)}
      isLocked={isMatchTypeLocked}
      lockedValue={lockedMatchType}
    />

    {/* CHANGE 2.2: Bat/Field First with availability */}
    <BatFieldFirstFilter
      selected={filters.batFieldFirst}
      onChange={(val) => updateFilter('batFieldFirst', val)}
      availability={batFieldFirstAvailability}
      disabled={filters.homeTeam.length === 0}
    />

    <MultiSelectDropdownEnhanced
      label="Home/Away"
      options={[
        { label: 'Home', value: 'Home' },
        { label: 'Away', value: 'Away' },
        { label: 'Neutral', value: 'Neutral' },
      ]}
      selected={filters.homeAway}
      onChange={(val) => updateFilter('homeAway', val)}
    />
  </div>
</div>
```

---

## Step 4: Update Team Filters Section

```typescript
{/* Team Filters inside TeamPerformanceDashboard component */}
<div className="bg-white rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-[#e0e0e0]">
  <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Team Filters</h3>
  <div className="flex gap-3 overflow-x-auto pb-2">
    {/* CHANGE 2.3: Venue with head-to-head history */}
    <VenueFilter
      selected={filters.venue}
      onChange={(val) => updateFilter('venue', val)}
      venuesWithHistory={venueOptionsWithHistory}
    />

    {/* CHANGE 2.4: Overs slider with auto-capping */}
    <OversRangeSlider
      value={filters.oversRange}
      onChange={(val) => updateFilter('oversRange', val)}
      max={oversMax}
    />
  </div>
</div>
```

---

## Step 5: Update Player Filters Section

```typescript
{/* CHANGE 1: Enhanced Player Filters with Bidirectional Logic */}
<div className="bg-white rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-[#e0e0e0]">
  <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Player Filters</h3>
  <div className="flex gap-3 overflow-x-auto pb-2 flex-wrap md:flex-nowrap">
    {/* CHANGE 1.1: Batter filters with bidirectional coupling */}
    <BatterFiltersGroup
      batters={filters.batter}
      batterStyle={filters.batterStyle}
      availableBatters={availableBatters}
      detectedBatterStyle={detectedBatterStyle}
      onBatterChange={(val) => updateFilter('batter', val)}
      onBatterStyleChange={(val) => updateFilter('batterStyle', val)}
    />

    {/* CHANGE 1.2: Bowler filters with three-way coupling */}
    <BowlerFiltersGroup
      bowlers={filters.bowler}
      bowlerStyle={filters.bowlerStyle}
      bowlerType={filters.bowlerType}
      availableBowlers={availableBowlers}
      bowlerTypeCounts={bowlerTypeCounts}
      onBowlerChange={(val) => updateFilter('bowler', val)}
      onBowlerStyleChange={(val) => updateFilter('bowlerStyle', val)}
      onBowlerTypeChange={(val) => updateFilter('bowlerType', val)}
    />

    {/* Other player filters remain unchanged */}
    <MultiSelectDropdownEnhanced
      label="Delivery Line"
      options={[
        { label: 'Off Stump', value: 'Off Stump' },
        { label: 'Middle Stump', value: 'Middle Stump' },
        { label: 'Leg Stump', value: 'Leg Stump' },
      ]}
      selected={filters.deliveryLine}
      onChange={(val) => updateFilter('deliveryLine', val)}
    />
    
    <MultiSelectDropdownEnhanced
      label="Delivery Length"
      options={[
        { label: 'Full', value: 'Full' },
        { label: 'Good Length', value: 'Good Length' },
        { label: 'Short', value: 'Short' },
      ]}
      selected={filters.deliveryLength}
      onChange={(val) => updateFilter('deliveryLength', val)}
    />
  </div>
</div>
```

---

## Step 6: Update Tournament Filters with Enhanced Date Picker

```typescript
{/* Tournament Filters inside TournamentPerformanceDashboard component */}
<div className="bg-white rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-[#e0e0e0]">
  <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Tournament Filters</h3>
  <div className="flex gap-3 overflow-x-auto pb-2">
    {/* CHANGE 2.5: Enhanced date picker with tournament constraints */}
    <EnhancedDateRangePicker
      startDate={filters.dateRange.startDate}
      endDate={filters.dateRange.endDate}
      onChange={(start, end) => 
        updateFilter('dateRange', { startDate: start, endDate: end })
      }
      minDate={dateRangeConstraints.min}
      maxDate={dateRangeConstraints.max}
      disabled={filters.tournament.length === 0}
    />
  </div>
  
  {/* Show tournament constraint info below */}
  {dateRangeConstraints.tournamentName && (
    <div className="mt-2 text-xs text-[#666666] flex items-center gap-1">
      <Info size={12} />
      Dates restricted to {dateRangeConstraints.tournamentName}
    </div>
  )}
</div>
```

---

## Step 7: Implement Data Filtering with useMemo (CHANGE 3A)

```typescript
// Inside TeamPerformanceDashboard component
function TeamPerformanceDashboard({ selectedSubTab, setSelectedSubTab }: Props) {
  const { filters } = useDashboardFilters();
  const { isMobile } = useResponsiveWidth();

  // CHANGE 3A: Filter data reactively using useMemo
  const filteredMatches = useMemo(() => {
    let matches = WIMBLEDON_DATA.matches; // Your master dataset

    // Apply global filters
    if (filters.tournament.length > 0) {
      matches = matches.filter(m => filters.tournament.includes(m.tournament));
    }
    if (filters.homeTeam.length > 0) {
      matches = matches.filter(m => filters.homeTeam.includes(m.homeTeam));
    }
    if (filters.oppositionTeam.length > 0) {
      matches = matches.filter(m => filters.oppositionTeam.includes(m.oppositionTeam));
    }
    if (filters.venue.length > 0) {
      matches = matches.filter(m => filters.venue.includes(m.venue));
    }

    return matches;
  }, [filters.tournament, filters.homeTeam, filters.oppositionTeam, filters.venue]);

  // CHANGE 3B: Derive chart data from filtered matches
  const runRateData = useMemo(() => {
    if (filteredMatches.length === 0) return [];
    
    // Calculate average run rate by over across filtered matches
    const overData: Record<number, { total: number; count: number }> = {};
    
    filteredMatches.forEach(match => {
      match.runsByOver?.forEach((entry: any) => {
        if (!overData[entry.over]) {
          overData[entry.over] = { total: 0, count: 0 };
        }
        overData[entry.over].total += entry.runRate;
        overData[entry.over].count += 1;
      });
    });

    return Object.keys(overData).map(over => ({
      over: parseInt(over),
      runRate: overData[parseInt(over)].total / overData[parseInt(over)].count,
    }));
  }, [filteredMatches]);

  const boundaryData = useMemo(() => {
    const totals = { fours: 0, sixes: 0, singles: 0, dots: 0 };
    
    filteredMatches.forEach(match => {
      if (match.boundaries) {
        totals.fours += match.boundaries.fours || 0;
        totals.sixes += match.boundaries.sixes || 0;
        totals.singles += match.boundaries.singles || 0;
        totals.dots += match.boundaries.dots || 0;
      }
    });

    return [
      { name: 'Fours', value: totals.fours, color: '#e60023' },
      { name: 'Sixes', value: totals.sixes, color: '#ff758f' },
      { name: 'Singles', value: totals.singles, color: '#c41e3a' },
      { name: 'Dots', value: totals.dots, color: '#666666' },
    ];
  }, [filteredMatches]);

  // ... rest of component
}
```

---

## Step 8: Update Chart Rendering with Responsive Config (CHANGE 3C)

```typescript
{/* CHANGE 3C: Responsive chart grid */}
{selectedSubTab === 'innings' && (
  <div className={getChartGridClasses()}>
    {/* Run Rate Chart */}
    <div className={`bg-white rounded-xl border border-[#e0e0e0] ${getChartCardClasses()}`}>
      <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-3 md:mb-4">
        Run Rate Progression by Over
      </h3>
      <ResponsiveContainer width="100%" height={getChartHeight('line', isMobile)}>
        <LineChart data={runRateData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="over" 
            stroke="#666666"
            {...getAxisConfig(isMobile)}
          />
          <YAxis 
            stroke="#666666"
            {...getAxisConfig(isMobile)}
          />
          <Tooltip />
          <Legend {...getLegendConfig(isMobile)} />
          <Line
            type="monotone"
            dataKey="runRate"
            name="Run Rate"
            stroke="#e60023"
            strokeWidth={2}
            dot={{ fill: '#e60023', r: isMobile ? 3 : 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* Boundary Donut Chart */}
    <div className={`bg-white rounded-xl border border-[#e0e0e0] ${getChartCardClasses()}`}>
      <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-3 md:mb-4">
        Boundary & Scoring Shot Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={getChartHeight('donut', isMobile)}>
        <PieChart>
          <Pie
            data={boundaryData}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 40 : 60}
            outerRadius={isMobile ? 70 : 100}
            paddingAngle={2}
            dataKey="value"
          >
            {boundaryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend {...getLegendConfig(isMobile)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
```

---

## Step 9: Update Player Performance Filters (CHANGE 3B)

```typescript
// Inside PlayerPerformanceDashboard component
const filteredBattingData = useMemo(() => {
  let data = WIMBLEDON_DATA.batting;

  // CHANGE 1 & 3B: Filter by batter selection
  if (filters.batter.length > 0) {
    data = data.filter(b => filters.batter.includes(b.batterName));
  }

  // CHANGE 1: Filter by batter style
  if (filters.batterStyle.length > 0) {
    data = data.filter(b => filters.batterStyle.includes(b.batterStyle));
  }

  // Sort and take top 10 for charts
  return data
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 10);
}, [filters.batter, filters.batterStyle]);

const filteredBowlingData = useMemo(() => {
  let data = WIMBLEDON_DATA.bowling;

  // CHANGE 1 & 3B: Filter by bowler selection
  if (filters.bowler.length > 0) {
    data = data.filter(b => filters.bowler.includes(b.bowlerName));
  }

  // CHANGE 1: Filter by bowler type
  if (filters.bowlerType.length > 0) {
    data = data.filter(b => filters.bowlerType.includes(b.bowlerType));
  }

  // CHANGE 1: Filter by bowler style
  if (filters.bowlerStyle.length > 0) {
    data = data.filter(b => filters.bowlerStyle.includes(b.bowlerStyle));
  }

  return data;
}, [filters.bowler, filters.bowlerType, filters.bowlerStyle]);
```

---

## Step 10: Update Tournament Performance Table (CHANGE 3B)

```typescript
{/* CHANGE 3B: Tournament standings with bold red for winPct > 50 */}
<div className={getTableClasses()}>
  <table className="w-full">
    <thead>
      <tr className="border-b border-[#e0e0e0]">
        <th className="text-left py-3 px-4 font-semibold text-[#666666]">Team</th>
        <th className="text-center py-3 px-4 font-semibold text-[#666666]">W</th>
        <th className="text-center py-3 px-4 font-semibold text-[#666666]">L</th>
        <th className="text-center py-3 px-4 font-semibold text-[#666666]">Win %</th>
      </tr>
    </thead>
    <tbody>
      {WIMBLEDON_DATA.standings.map((team, idx) => (
        <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
          <td className="py-3 px-4 font-medium text-[#1a1a1a]">{team.name}</td>
          <td className="py-3 px-4 text-center text-[#666666]">{team.wins}</td>
          <td className="py-3 px-4 text-center text-[#666666]">{team.losses}</td>
          <td className={`py-3 px-4 text-center font-semibold ${
            team.winPct > 50 ? 'text-[#e60023] font-bold' : 'text-[#666666]'
          }`}>
            {team.winPct}%
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Complete Example: TeamPerformanceDashboard Component

```typescript
function TeamPerformanceDashboard({ 
  selectedSubTab, 
  setSelectedSubTab 
}: { 
  selectedSubTab: string; 
  setSelectedSubTab: (tab: string) => void;
}) {
  const { filters, updateFilter, venueOptionsWithHistory, oversMax } = useDashboardFilters();
  const { isMobile } = useResponsiveWidth();

  // CHANGE 3A: Memoized data filtering
  const filteredMatches = useMemo(() => {
    // ... filter logic as shown above
  }, [filters]);

  const runRateData = useMemo(() => {
    // ... derive from filteredMatches
  }, [filteredMatches]);

  const boundaryData = useMemo(() => {
    // ... derive from filteredMatches
  }, [filteredMatches]);

  return (
    <div>
      {/* Team Filters */}
      <div className="bg-white rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-[#e0e0e0]">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Team Filters</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <VenueFilter
            selected={filters.venue}
            onChange={(val) => updateFilter('venue', val)}
            venuesWithHistory={venueOptionsWithHistory}
          />
          <OversRangeSlider
            value={filters.oversRange}
            onChange={(val) => updateFilter('oversRange', val)}
            max={oversMax}
          />
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-3 mb-4 md:mb-6 overflow-x-auto pb-2">
        {/* ... tab buttons remain unchanged ... */}
      </div>

      {/* Charts */}
      {selectedSubTab === 'innings' && (
        <div className={getChartGridClasses()}>
          {/* ... charts with responsive config as shown above ... */}
        </div>
      )}
    </div>
  );
}
```

---

## Summary of Changes

### CHANGE 1 ✅
- ✅ Bidirectional Batter ↔ Batter Style with visual lock indicator
- ✅ Three-way Bowler ↔ Bowler Style ↔ Bowler Type with dynamic counts
- ✅ Default, Active, and Disabled states (40% opacity)
- ✅ Lock/link icons between coupled filters

### CHANGE 2 ✅
- ✅ Tournament cascades to teams, venues, match type (auto-locked)
- ✅ Home Team cascades to opposition, toss result, bat/field first
- ✅ Venue shows head-to-head match counts
- ✅ Overs slider auto-caps based on match type
- ✅ Date range picker constrained by tournament with info tag
- ✅ Lock icons and tooltips throughout

### CHANGE 3 ✅
- ✅ useMemo data filtering for reactive charts
- ✅ Zero static fallback data in components
- ✅ Responsive width hook (useWidth)
- ✅ Dynamic chart heights, axis configs, legend configs
- ✅ Responsive grid classes for all layouts
- ✅ Tournament standings with bold red for winPct > 50

All changes strictly target the NV Play Analytics section only.
