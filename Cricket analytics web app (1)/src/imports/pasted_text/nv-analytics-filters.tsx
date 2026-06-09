Act as an expert React frontend developer. I need to update the NV Play Analytics page and its sub-pages in my Cricket Analytics Dashboard application. The rest of the application is already fully responsive, so your changes must strictly target ONLY this analytics section, its filters, and its analytics content canvas.

To minimize token consumption and save credits, DO NOT rewrite unchanged boilerplate or unrelated routing components. Provide only the new or modified logic/layouts, using comments like `// ... existing code ...` to indicate where the remaining implementation stays intact.

Here are the strict requirements across three changes:

=========================================
CHANGE 1 — Player Filters: Nested Bidirectional Logic
=========================================
In the Player Filters panel only, implement these interdependencies. Use existing styles exactly—do not add new color tokens. Create 3 component state variants per filter chip: Default, Active/Selected, and Disabled (40% opacity, unclickable).

1. Batter ↔ Batter Style (Bidirectional):
- If Batter Style = 'RHB' is selected -> Filter the Batter multiselect to show ONLY RHB players. Grey out and disable LHB options.
- If ONLY LHB players are chosen in the Batter multiselect -> Auto-select Batter Style to 'LHB' and disable the 'RHB' option.
- Visual: Add a small lock/arrow indicator asset between these two filter chips to signal their coupling state.

2. Bowler ↔ Bowler Style ↔ Bowler Type (Three-Way):
- Default: Bowler Type dropdown items must show dynamic pill count badges next to labels—e.g., "Spin (12)", "Pace (5)", "Medium Pace (10)".
- Multiselect Interaction: If 3 spin bowlers are picked in the multiselect, recalculate counts -> "Spin (3)", while Pace & Medium Pace drop to "(0)", turn grey, and become unselectable.
- Style Interaction: If Bowler Style = 'Left-arm' is selected, recalculate counts for left-arm bowlers only, and filter the multiselect array to left-arm options only. When a count hit 0, grey out the row.

Deliverable for Change 1: Provide the updated filter components showing the conditional state rendering (Default, Batter-style-active, Bowler-selected, All-filters-active).

=========================================
CHANGE 2 — Global Filters: Cascade Dependencies
=========================================
The Global Filters bar acts as the absolute source of truth. Do not redesign visually; implement the following logic and state variations:

1. Tournament Cascades:
- Restrict 'Home Team' and 'Opposition Team' dropdowns to only include teams belonging to the selected tournament. Show a lock icon inside the chip when restricted.
- 'Match Type' must auto-select and lock to that tournament's specific format (e.g., selecting IPL auto-locks to T20). Show a lock icon + greyed chevron.

2. Home Team Cascades:
- Remove the selected 'Home Team' from the 'Opposition Team' dropdown options entirely. Add a hover tooltip: "Cannot select same team".
- 'Toss Result' must dynamically show won/lost counts based on the active team's historical data: "Won (8)", "Lost (6)".
- 'Bat/Field First' must grey out options that never occurred in the selected team's available dataset.

3. Venue (Team Filters Panel Local Filter):
- If BOTH Home Team and Opposition Team are actively selected globally -> Filter the Venue list to display only stadiums where those two teams have head-to-head history. Display match count next to the name: "The Oval (3 matches)".

4. Overs Slider (Team Filters Panel):
- If Global Match Type is locked or set to T20 -> Auto-cap the slider max at 20. If ODI -> Auto-cap at 50. Show the active cap threshold as a text label above the right handle: "Max: 20".

5. Date Range Picker (Tournament Performance Tab Local Filter):
- If a specific Tournament is selected globally -> Auto-snap the Date Range picker min/max constraints to match that tournament's start and end dates. Grey out and block clicks on dates outside this envelope. Support both standard calendar picker and manual input typing with verification (Start Date <= End Date). Add an info tag below: "Dates restricted to [Tournament Name]".

=========================================
CHANGE 3 — Wire Real Data & Responsive Charts
=========================================
Touch ONLY the chart grid containers and the individual chart components. Do not touch navigation headers or tab controls.

3A — Data Integration Strategy:
Assume a standard dataset named `WIMBLEDON_DATA` is imported containing relational arrays (`matches`, `batting`, `bowling`, `partnerships`, `wicketTypes`, `boundaries`, `phases`, `standings`). 
- Wrap data-filtering transformations inside `useMemo` hooks so that whenever a filter from Change 1 or Change 2 changes, the charts re-derive their subsets instantly. Ensure zero static fallback data remains inside components.

3B — Data Subsets Per Tab:
- Team Performance (Innings Progression): Connect Run Rate by Over chart to active match's `runsByOver` array; if no match is selected, calculate average across all valid matches. Connect Boundary donut chart to `boundaries` counts.
- Team Performance (Bowling Control): Connect Dot ball bar chart to `bowling` array sorted descending by dots. Connect Wicket types chart to `wicketTypes`.
- Team Performance (Match Impact): Connect Scoring phases chart to `phases` and Partnerships chart to `partnerships`.
- Player Performance (Batting Execution): Reactively filter the top 10 batting bar charts when `batterStyle` or `batters[]` filters change.
- Tournament Performance (Standings): Render `standings` data into the table grid. If winPct > 50, apply bold red typography accents; otherwise use grey.

3C — Responsive Mobile/Desktop Optimization:
Implement this precise width-tracking hook at the top of the analytics layout:
const useWidth = () => {
  const [w, setW] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
};
const isMobile = useWidth() < 768;

Apply these responsive overrides to your wrappers and Recharts parameters:
- Chart Grid Container: Set styling class to "grid grid-cols-1 gap-4 md:grid-cols-2".
- Chart Cards: Append "w-full overflow-hidden" and swap card paddings to "p-3 md:p-5".
- Recharts <ResponsiveContainer>: Enforce width="100%" and set dynamic height values: Line charts = `isMobile ? 200 : 300`, Bar charts = `isMobile ? 180 : 260`, Donut/Pie charts = `isMobile ? 200 : 280`.
- XAxis & YAxis Labels: Pass configuration property `tick={{ fontSize: isMobile ? 9 : 12 }}`.
- XAxis Line Intervals: Append property `interval={isMobile ? 9 : 4}` for dense line timelines.
- Legends: Update configurations using `wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}`.
- Stat Value Rows: Set wrapper styling layout to "grid grid-cols-2 gap-3 md:grid-cols-3".
- Data Tables: Wrap completely inside `<div className="overflow-x-auto w-full">` and apply text sizing `"text-xs md:text-sm"` with flexible layout paddings.

Please output the clean, integrated component update modifications now.