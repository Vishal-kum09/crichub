# Cricket Scoring & Management Platform — Complete Frontend Specifications
**Architecture Version:** 2.1.0  
**Framework Stack:** React.js (Vite) + Tailwind CSS  
**Target Viewport Philosophy:** Mobile-First Responsive Core with Light/Dark Layouts  

---

## 1. Executive Summary & Core Engineering Principles
[cite_start]This documentation serves as the master specification engine for the platform's presentation layer, core workflows, and dynamic UI elements[cite: 2]. [cite_start]The frontend layer is engineered as a high-performance, stateless client stack optimized for quick data entry and low operational latency across both light and dark theme configurations[cite: 4, 5].

### 🛑 Strict Production Rules for Gen-AI Integrations
* **No Direct Client Calls:** The frontend application shall never establish direct data handshakes or initiate API calls with Gen-AI layers or external LLM interfaces (such as Vertex AI or Gemini API).
* **Server-Side Proxy Architecture:** Conversational chatbot queries and automated ball-by-ball commentary lines must be streamed downstream through serverless gateway nodes (`cricket-backend` and `cricket-chatbot-service`).
* **View-Only Constraints:** Standard authenticated users in public views are completely restricted to consuming pre-calculated text streams and logs parsed safely by the backend server.

---

## 2. User Roles & Access Control Matrix (RBAC Dashboard Shell)
[cite_start]The application utilizes a strict role-based dashboard hierarchy implemented via `react-router-dom`[cite: 1, 7]. [cite_start]While global public views serve as a common baseline accessible to any authenticated profile, advanced management utilities, data mutation widgets, and scorer actions are isolated behind explicit role filters[cite: 7].

| User Role | Dashboard Access & Primary Purpose |
| :--- | :--- |
| **Viewer** | Global workspace entry point baseline. [cite_start]Can monitor active/live matches, view interactive scorecards, track ball-by-ball commentary lines, check tournament tables, and review public match stats[cite: 8]. |
| **Scorer** | Accesses assigned scheduled fixtures. [cite_start]Operates the live scorer console workspace, handles squad validation entries, registers toss variables, and records delivery metrics in real time[cite: 8]. |
| **Player** | Accesses a highly specialized personal profile view named "My Performances". [cite_start]Tracks personal career milestones, cumulative runs/wickets over time, and individual historic match spells[cite: 8]. |
| **Analyst** | Houses the complete standalone Advanced Analytics Dashboard System migrated directly from custom NVPlay data streams. [cite_start]Restricted to team-wide aggregations, strategic data plots, and match-trend visualizations[cite: 8]. |
| **Club Admin** | Manages a registered club or cricket academy asset. [cite_start]Authorizes player/scorer membership registrations, creates cross-club match challenges, structures custom tournaments, and configures squad rosters[cite: 8]. |
| **Super Admin** | Master software platform owner. [cite_start]Approves new organization or club requests, tracks platform-wide traffic integrity, and retains absolute data override, edit, or deletion capability across the database[cite: 8]. |

### 🛡️ The Global Viewer Baseline Redirection Rule
Authentication components evaluate browser `localStorage` parameters dynamically upon application mounting. 
$$\text{UI Navigation Route} = \begin{cases} 
\text{Privileged Dashboards (Scorer/Admin Shells)} & \text{if } \text{JWT.is\_approved} = \text{true} \\ 
\text{Session Freeze } \rightarrow \text{Hard Redirect to Public Viewer UI} & \text{if } \text{JWT.is\_approved} = \text{false} 
\end{cases}$$
[cite_start]If a newly onboarded player, scorer, or analyst carries a pending validation status flag (`is_approved: false`), the routing shell intercepts the session, unmounts write-access panels, and locks the user to the basic holding screen[cite: 19, 20].

---

## 3. User Authentication & Onboarding Funnels Layouts

### 3.1 Individual Onboarding Flow (Players, Scorers, Analysts, Umpires)
* [cite_start]**Core Registration Panel Fields:** First Name, Last Name, Display Name, Active Email, Phone Number, and Secure Password[cite: 15].
* [cite_start]**Conditional Club Selection Layout:** Displays an explicit structural query component: *"Are you affiliated with a club?"* [cite: 16]
  * [cite_start]*If Checked Yes:* A dynamic database dropdown mounts, allowing the user to select from registered platform clubs and map their respective technical track assignment (Player, Scorer, Analyst, or Umpire)[cite: 17, 18].
* [cite_start]**OTP Challenge Guard:** Renders verification inputs to authenticate the contact layer before routing the profile into the onboarding hold state queue[cite: 19].

### 3.2 Club Organizational Registration Flow
* [cite_start]**Data Input Struct:** Form configuration panel capturing: Club Name, Primary Home Ground, Office Contact Number, Verification Email, Country, Unique Display Initials, Logo Profile Graphic, and Designated Owner Name[cite: 23].
* [cite_start]**Routing Filter:** Submissions bypass standard client flows and route directly to the master Super Admin validation inbox to secure the ecosystem from unverified entities[cite: 24, 25].

---

## 4. Global Viewer Workflow & UI Component Architecture

### 4.1 Match Navigation Workspace
* [cite_start]**Default Page State:** Displays all active and ongoing live match layout cards matched to the user's region[cite: 30].
* [cite_start]**Segmented Sorting Controls:** Horizontal navigation sub-tabs layout displaying `All Matches`, `Live`, `Ongoing`, `Scheduled`, and `Completed` arrays[cite: 31].

### 4.2 Match Detail Immersive Screen Layout Configuration

#### Component Frame 1: Match Overview Header Banner
* Full-width bounding box sticky layout container with 12px padding.
* Left Column displays Team A name and large core score text tokens (e.g., `142/3`). Right Column displays Team B context parameters and live status strings. High-contrast center text element displays `"VS"`.
* Sub-row components render Current Run Rate (`X.XX`) and Required Run Rate (`Y.YY`) split via thin vertical divider vectors.
* Bottom layout banner displays text element summarizing Toss outcomes: *"Toss: [Team Winner] opted to Bat/Bowl"*.

#### Component Frame 2: Active Performances Split-Grid Panel
Horizontal Auto-Layout configuration splitting the interface viewport exactly 50/50 down the center:
* **Left Flex Box [Batting State Workspace]:** Vertical card stack tracking two active batsmen. Parameters layout mapping: `Player Name String` | `Runs` | `Balls Faced` | `Strike Rate (S/R)`. A high-contrast active red asterisk icon (`*`) designates the active striking batsman.
* **Right Flex Box [Bowling State Workspace]:** Vertical card stack tracking current bowler actions matching batting row bounds height: `Bowler Name String` | `Overs (O)` | `Maidens (M)` | `Runs Conceded (R)` | `Wickets Taken (W)`.

#### Component Frame 3: Recent Deliveries Horizontal Progress Ribbon
* Full viewport horizontal continuous badge ribbon container with 8px padding.
* Static layout text label on left: `"Recent: "`. Followed by a row of circular rounded pill badges containing rolling ball metrics arrays (e.g., `[ O ]`, `[ . ]`, `[ 1 ]`, `[ 4 ]`, `[ Wd ]`, `[ 6 ]`, `[ Lb1 ]`).
* Extreme right boundary anchors a drop-down chevron icon indicating a *"Dropdown for all deliveries"* tracking utility.

#### Component Frame 4: Performance Segment Navigation Bar
Horizontal segmented control tab row layout evenly distributed across the bottom view layout width:
* **`Overview` Tab Content (Default View):** Renders fundamental match metadata including Toss statements, Ground Venue, Time Match Started, Country Location, Live Win Probability chart models, and historical head-to-head records.
* **`Scorecard` Tab Content:** Highly granular tracking sections:
  * *Batting Table Matrix:* `Batsman Column`, `Dismissal Line (e.g., c. PlayerA b. PlayerB)`, `R (Runs)`, `B (Balls)`, `4s`, `6s`, and `S/R (Strike Rate)`. Renders specialized graphical flags for Captain `©` and Wicketkeeper `(WK)` designations.
  * *Innings Metadata Summary Block:* Formulates and outputs explicit calculation of extras by sub-type: `Extras: Total_Runs (NB X, WD Y, LB Z, B W)`. Renders explicit row lines for `Total Runs (Wickets, Overs)`, `Yet to Bat` rosters, and a chronological `Fall of Wickets` timeline table.
  * *Bowling Table Matrix:* `Bowling Line Name`, `O (Overs)`, `M (Maidens)`, `R (Runs Conceded)`, `W (Wickets Taken)`, and `Econ (Economy Rate)`.

---

## 5. Scorer Console Dashboard Logic & Workspace Components

### 5.1 Match Initialization Sequence Wizard
Upon clicking an active scheduled fixture, the interface launches an automated step-by-step configuration wizard:
1. **Squad Selection:** Checklist interface checking off the final Playing XI from the pre-populated club roster database, explicitly tagging the Captain `©` and Wicketkeeper `(WK)` selectors (allows short-sided bypass for informal local fixtures).
2. **Toss Input UI:** Click elements setting the team that won the toss along with their strategic action choice (Bat or Bowl).
3. **Configuration Audit Parameters:** Configuration checklist locking down match variables: Wagon Wheel collection tracking, Name Display string formats, Match classification rules, Max Over count, Max Overs per Individual Bowler, Venue, Ground layout, Country location, and Pitch Track number.
4. **Active Opener Launch:** Inputs prompting immediate designation of the starting Striker, Non-Striker, and opening Bowler, instantaneously loading the core scoring layout matrix.

### 5.2 Core Scoring Interface Big-Button Desk Layout
The operational console interface exposes prominent touchpoints for core run actions (`1`, `2`, `3`, `4`, `5`, `6`) and extra types (`No Ball`, `Wide`, `Leg Bye`, `Bye`).

#### Extras State Mutation Evaluation Logic Matrix
* **No Ball (NB):** Appends $+1$ automatic penalty run directly to the Extras tally and Team total score. It does not count against the batter's total balls faced, and blocks decrementing the legal ball tracker in the current bowler's over. Physical runs from bat contact award runs to the batter's total; run-by extras accumulate inside the No Ball extras column.
* **Wide (WD):** Appends $+1$ automatic penalty run directly to the Extras bin and Team total. It bypasses legal over delivery metrics and individual batsman balls faced logs. Supplementary run-bys tracking past the wicketkeeper or boundary accrue directly inside the Wide extras category.
* **Leg Bye (LB) & Bye (B):** Appends runs directly to the Extras column and Team score. Processed as a legal delivery, incrementing both the over counter and the bowler's individual analysis. These do not grant runs to the active batter, but the delivery increments the ball-faced data register for the batsman on strike.

---

## 6. Wicket Dismissal Subsystem 4-Step Modal Wizard
Activating a Wicket event instantly freezes the scoring console interface layout and launches a contextual data validation workflow modal wizard:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        WICKET DISMISSAL WIZARD                         │
├────────────────────────────────────────────────────────────────────────┤
│  [STEP 1: IDENTIFY DISMISSED] ──> Toggle: Striker / Non-Striker        │
│                                           │                            │
│                                           ▼                            │
│  [STEP 2: SELECT DISMISSAL MODE] ──> Bowled, Caught, LBW, Run Out...  │
│                                           │                            │
│                                           ▼                            │
│  [STEP 3: CONTEXTUAL FIELDER MAPPING] ──> Filters Opposing Fielding    │
│                                           │  Roster for Assisting Tags │
│                                           ▼                            │
│  [STEP 4: INCOMING BATTER SELECTION] ──> Map Replacement from Bench     │
│                                           │                            │
│                                           ▼                            │
│               [RELEASE CONSOLE INTERFACE LOCKOUT COMPONENT]            │
└────────────────────────────────────────────────────────────────────────┘

---

## 7. Administrative Controlling Dashboards Viewports

### 7.1 Club Administrator Workspace Panel Layout
[cite_start]The Club Admin workspace is structured as a dedicated sidebar navigation tree controlling specialized management contexts[cite: 99].

* [cite_start]**Approval Validation Queue Grid:** A central dashboard panel displaying pending registration rows from individual profiles (Players, Scorers, Analysts) attempting to affiliate with the specific organization block [cite: 100] for quick `is_approved: true` state toggles.
* **Create Match Panel Component:**
  * [cite_start]*Cross-Club Mode:* Select an opponent from affiliated certified clubs, designate the match squad, set time/venue parameters, and dispatch an invite [cite: 104] [cite_start]which automatically updates the "Scheduled Matches" queues upon acceptance[cite: 105].
  * [cite_start]*Local Mode:* Generates rapid internal practice sessions or un-affiliated scratch matches [cite: 106] [cite_start]bypassing cross-club confirmations[cite: 106].
* [cite_start]**Create Tournament Shell Module:** Form configuration grids tracking: Tournament Name $\rightarrow$ Choose Tournament Format Structure $\rightarrow$ Overs Constraint Total Number of Fixtures $\rightarrow$ Max Participating Teams[cite: 107]. [cite_start]Clicking tournament generation updates the app state shell to drop individual match assets into the schedule bounds[cite: 108].
* [cite_start]**Roster Hub Directories:** Separate sub-panel interactive interfaces tracking `My Matches`, `My Players`, and `My Scorers` roster record data grids [cite: 109] [cite_start]with options to update or delete tracking logs[cite: 109].

### 7.2 Super Administrator Governance Dashboard Panel
[cite_start]The master administrative cockpit provides overarching ecosystem control parameters across all registered tenants[cite: 110].
The Super Admin dashboard is organized into the following tabs: `Matches`, `Registered Clubs`, `NV-Play Analytics`, `Super Admin`, `Notifications`, and `Settings`.

*   **Registered Clubs Tab:**
    *   Displays a row-formatted list of all approved clubs.
    *   Each row includes the Club Name, Number of Affiliated Members, and action buttons.
    *   **Actions:**
        *   `Edit`: Allows modification of club details.
        *   `Delete`: Permanently removes the club and its associated data.
        *   Clicking a club name navigates to that club's `ClubAdmin` dashboard, giving the Super Admin full control over that club's operations.

*   **Super Admin Tab:** This section is the central hub for platform-wide administration.
    *   **Club Approvals:**
        *   A queue of newly registered clubs awaiting validation.
        *   Each entry shows the club name and registration details.
        *   **Actions:** `Approve` or `Reject`. Approved clubs move to the "Registered Clubs" list.
    *   **Database Management:**
        *   A dashboard of key platform metrics:
            *   Total Number of Clubs
            *   Total Number of Matches
            *   Total Number of Users
            *   Total Number of Tournaments
        *   Provides tools for global data integrity checks and management.

---

## 8. Role-Specific Statistical Analytics Workspaces
[cite_start]To ensure structural clarity, user analytics features are divided cleanly between personal performance statistics (Player role) and aggregated match dashboards (Analyst role)[cite: 116, 117].

### 8.1 Player "My Performances" Hub Workspace Layout
[cite_start]Accessible strictly to users with the active Player credential[cite: 119].

#### A. Batting Performance Metrics Hub
* [cite_start]**Core Historical Counters:** Individual Total Runs, 4s Hits, 6s Hits, and milestone tallies for 50s, 100s, and 200s[cite: 121].
* [cite_start]**Computed Statistical Strings:** Lifetime Strike Rate ($S/R$), Career Batting Average, and Total Balls Faced[cite: 122].
* [cite_start]**Visual Presentation Widgets:** Integrated interactive charts plotting personal run-scoring trajectory over time, individual wagon wheel summaries, and score distributions of past matches played[cite: 123].

#### B. Bowling Performance Metrics Hub
* [cite_start]**Core Historical Counters:** Personal Total Overs Bowled, Maidens Managed, Wickets Taken, and Total Dot Balls Delivered[cite: 124].
* [cite_start]**Computed Statistical Strings:** Lifetime Economy Rate ($Econ$), Career Bowling Average, and milestone counters tracking 3-Wicket, 5-Wicket, and 10-Wicket match hauls[cite: 126].
* [cite_start]**Visual Presentation Widgets:** Charts tracking individual spell lengths, economy stability across recent appearances, and bowling metrics per innings[cite: 127].

### 8.2 Analyst Dashboard Workspace (Comprehensive Analytics Suite)
[cite_start]Accessible strictly by users authorized under the Analyst role, isolating match visualization frameworks migrated from NVPlay tracking logic[cite: 129].
* [cite_start]**Analytics System Scope:** Aggregates multi-match trend metrics, historical team-wide analysis, multi-player comparative indices, and strategic performance correlations[cite: 130].
* [cite_start]**Integrated Visualization Modules:** Renders analytical scatterplots, advanced player performance comparison grids, pitch condition maps, partnership progression charts, and cumulative team-wide run rate trajectory paths[cite: 131].

---

## 9. Frontend Testing & Crash Recovery Interceptors Specifications

### 9.1 Isolated Component Simulation Rules (QA Guardrails)
* Presentation elements undergo automated integration and unit testing blocks via `Jest` and `React Testing Library` before deployment builds execute.
* Test scripts mock user interaction workflows across scoring grids, asserting that input payload mutations do not violate acceptable application parameters (e.g., rejecting mock metrics where `runs_off_bat > 6`).

### 9.2 Local Network Exception Interceptors (Crash Guards)
* **Axios Global Client Interceptors:** HTTP network communication structures utilize global catch response handlers to track communication failures.
* **Network Interruption Fallbacks:** If a network dropout hits mid-match (e.g., stadium connectivity dropouts), the interceptor prevents browser workspace crashing. It isolates and anchors current local application state variables intact to prevent data loss while triggering non-disruptive, friendly warning toast notifications on the UI layout view.