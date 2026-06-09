Act as an expert UX/UI Designer and React Frontend Developer. I need to build a new prominent page called "NV Play Analytics" and integrate it into this existing application.

1. THEME & INTEGRATION RULES
Inherit Existing Design System: Do NOT overwrite the current global theme. Inherit the existing color palette (Light/Dark mode), typography, spacing, Top Bar, and Left Sidebar components currently established in this project.

Routing: Add "NV Play Analytics" as a primary item in the existing Left Sidebar.

Accent Consistency: If an accent color is needed for active states or primary actions on this new page, use Pinterest Red (#e60023).

2. PAGE LAYOUT & RESPONSIVENESS (CRITICAL FIXES)
Full-Page Scroll: The entire page must be easily scrollable from top to bottom. Do not lock the scroll area only to the content below the filters. The main container must handle overflow-y-auto.

Dropdown Fix (Z-Index): All dropdown menus in the filter section must use absolute positioning with a high z-index (e.g., z-50) so they overlay the content below them. They must NOT create a separate vertical scrollbar inside the filter container, and they must be fully visible on mobile.

Mobile Responsiveness (390px): Utilize a strict CSS Grid or Flexbox architecture. On desktop, use a 2x2 or 3-column layout. On tablet, shift to a 2-column layout. On mobile, absolutely all widgets, charts, and filters MUST stack vertically (1-column layout) to prevent horizontal scrolling entirely. No side-by-side elements on mobile.

3. THE "NV PLAY ANALYTICS" LANDING PAGE
When navigating to this page, do NOT show the "Team Performance" tab or any "Quick Stats" instantly.

Instead, the opening view serves as a Home Hub displaying 4 large, clickable dashboard options (Cards or Tabs): "Team Performance", "Player Performance", "Tournament Performance", and "AI Custom Analytics".

4. GLOBAL FILTERS (Sticky below header, applies to all dashboards)
Tournament (Multi-select)

Home Team (Multi-select)

Home/Away (Multi-select)

Match Type (Multi-select: T20, 50 overs)

Toss Result (Dropdown, Single-select only)

Bat/Field First (Dropdown, Single-select only)

5. DASHBOARD 1: TEAM PERFORMANCE
Team Local Filters: Opposition Team (Multi-select), Venue (Multi-select), Overs (Custom Range Slider).

Sub-tab 1 (Innings Progression): Run rate progression by over (Line Chart), Boundary & scoring shot breakdown (Donut Chart), Partnership contribution map (Bar Chart), Power Play vs non-power play efficiency (Comparative KPI).

Sub-tab 2 (Bowling & Fielding Control): Bowling economy by phase (Stacked Bar), Extras conceded breakdown (Pie Chart), Wicket fall timeline (Timeline/Scatter Plot), Fielding runs saved/lost (Table/List).

Sub-tab 3 (Match Impact & Strategy): Toss decision impact on result (Gauge/Donut), Required run rate pressure curve (Line Chart), Batting position contribution (Bar Chart), Bowler type effectiveness (Table).

6. DASHBOARD 2: PLAYER PERFORMANCE
Player Local Filters: Batter (Multi-select), Bowler (Multi-select), Bowler Type (Multi-select: Spin, Pace, Medium-Pace), Bowler Style (Multi-select: LHB, RHB), Delivery Line (Multi-select: Outside Off, Middle, Leg), Delivery Length (Multi-select: Short, Good Length, Full, Yorker), Bowler Action (Multi-select: Over Wicket, Around Wicket).

Sub-tab 1 (Batting Execution): Batter strike rate & average (KPIs), Dot ball pressure index (Line Chart), Shot selection map (Radar/Pie), Wagon wheel (Field placement map).

Sub-tab 2 (Bowling Execution): Bowler economy, SR & wickets (KPIs), Pitch map (Heatmap showing length & line), Bowling speed & variation profile (Histogram), Swing & deviation analysis (Bar Chart).

Sub-tab 3 (Matchups & Trends): Batter vs Bowler Head-to-Head (Data Table), Dismissal type & pattern analysis (Donut), Batter performance by bowler type (Bar Chart), Spell & over-by-over bowler form (Line Chart).

7. DASHBOARD 3: TOURNAMENT PERFORMANCE
Tournament Local Filters: Date Range (Provide two separate Calendar inputs: one for Start Date, one for End Date. Do not use a standard dropdown).

Sub-tab 1 (Standings & Totals): Tournament points table & win % (Sortable Table), Highest & lowest team totals (List), Run rate comparison across matches (Bar Chart), Highest individual innings scores (List).

Sub-tab 2 (Top Performers): Top run scorers (Leaderboard), Top wicket takers (Leaderboard), Most economical bowlers (Chart or Table), Partnership records (Leaderboard).

Sub-tab 3 (Conditions & Venues): Toss & venue advantage matrix (Heatmap/Table), Extras conceded per team (Bar Chart), Match conditions impact / weather (Scatter Plot), Venue scoring pattern analysis (KPIs).

8. DASHBOARD 4: AI CUSTOM ANALYTICS
Layout: A 2-column view tailored for conversational data retrieval (stacks to 1-column on mobile).

Left Column (30%): A chat-like interface for natural language queries with a text input area and a submit arrow.

Right Column (70%): A dynamic visualization canvas. Show an active state displaying a generated comparative bar chart with AI text insights below it.