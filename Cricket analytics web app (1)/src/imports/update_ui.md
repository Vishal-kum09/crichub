\# Cricket Scoring & Management Platform — Comprehensive Architecture & Workflow

\## PLATFORM OVERVIEW

The platform is a modern cricket scoring, club administration, and analytics ecosystem designed for professional sports workflows, live match tracking, and rigid role-based access control (RBAC). The system features a mobile-first, real-time responsive architecture engineered for speed, supporting premium dark and light theme layouts.


\## 1. USER ROLES & ACCESS CONTROL MATRIX

The platform utilizes a strict role-based dashboard system. While \*\*Viewer screens act as the global baseline\*\* (accessible by all authenticated roles), specific administrative and tracking features are unlocked strictly by role assignment.

| Role | Dashboard Access & Primary Purpose |

\| :--- | :--- |

| \*\*Viewer\*\* | Global landing page baseline. Accesses live/ongoing, scheduled, and completed matches, interactive scorecards, ball-by-ball commentary, tournament tables, and public stats. |

| \*\*Scorer\*\* | Accesses assigned scheduled matches. Operates the live scoring console, manages player validation, tosses, and real-time delivery entry. |

| \*\*Player\*\* | Accesses a dedicated personal profile hub (\*\*”My Performances”\*\*). Tracks individual historical batting/bowling statistics, career personal milestone counters, and past match spells. |

| \*\*Analyst\*\* | Dedicated access to the comprehensive analytics dashboard (including advanced data visualizations, predictive metrics, and deep-dive team/match analytics). |

| \*\*Club Admin\*\* | Manages a specific club/academy. Approves player/scorer registrations, schedules matches against other clubs, creates tournaments, and manages internal rosters. |

| \*\*Super Admin\*\* | Master administrator/owner of the application. Approves new club registrations, oversees global records, and monitors platform integrity with absolute data modification rights. |


\## 2. USER AUTHENTICATION & ONBOARDING FUNNELS

\### A. Individual Sign-Up Flow (Players, Scorers, Analysts, Umpires)

[Landing Page] ➔ [Sign-Up] ➔ Enter Core Credentials ➔ [Club Affiliation Check] ➔ [OTP Verification] ➔ [Pending Approval View]

1\. \*\*Core Credentials Required:\*\*

`   `\* First Name & Last Name

`   `\* Display Name

`   `\* Email Address

`   `\* Phone Number

`   `\* Password

2\. \*\*Club Affiliation Mapping:\*\*

`   `\* The user is explicitly prompted: \*”Are you affiliated with a club?”\*

`   `\* \*\*If Yes:\*\* They must select their respective club from a dynamic dropdown list of registered clubs, then select their targeted role (\*\*Player, Scorer, Analyst, or Umpire\*\*).

3\. \*\*Verification & Hold State:\*\*

`   `\* Requires \*\*OTP Verification\*\* to authenticate the contact point.

`   `\* Upon successful validation, the account enters a restricted pending state displaying: \*”Your registration will be looked after. Until then, enjoy the web services.”\*

`   `\* \*\*Behavior:\*\* The user is restricted to a basic Viewer role baseline until explicitly approved by that specific \*\*Club Admin\*\*.

\### B. Club / Club Admin Sign-Up Flow

For registering an entirely new club or academy organization onto the platform.

\* \*\*Fields Required:\*\* Club Name, Home Ground, Contact Number, Email, Country, Display Name, Profile Photo, Owner Name (if applicable).

\* \*\*Approval Pipeline:\*\* Once submitted, the entry route bypasses standard pipelines and routes directly to the \*\*Super Admin\*\* approval queue. The applicant can access baseline Viewer features in the interim, unlocking Club Admin tools only upon formal validation.

\## 3. GLOBAL VIEWER WORKFLOW & UI ARCHITECTURE

\### Match Navigation Screen

\* \*\*Landing Page State:\*\* Displays all active and ongoing matches by default.

\* \*\*Sub-Tabs:\*\* `All Matches`, `Live`, `Ongoing`, `Scheduled`, `Completed`.

\* Clicking any individual match card shifts the workspace context into the Match Detail View.

\### Match Detail Screen Structural Schematic

FRAME 1: MATCH OVERVIEW BANNER (Top Sticky Container) - Structure: A full-width bounding box with 12px padding. - Row 1: Split into a left and right column. Left shows "TEAM A" text and a large "Score string" (e.g., 142/3). Right shows "TEAM B" text and its respective "Score/Status string" (e.g., Yet to Bat). Place a high-contrast center text "vs". - Row 2: Left aligned text "Run Rate: X.XX" | Right aligned text "Req. Run Rate: Y.YY". Separated by a thin vertical divider line. - Row 3: A full-width sub-text banner displaying: "Toss: [Team Name] opted to Bat/Bowl". FRAME 2: ACTIVE LIVE PERFORMANCES (Split-Grid Layer) - Structure: A horizontal auto-layout frame split exactly 50/50 down the center. - Left Column [Batting Team Status]: Vertical stack displaying 2 active batsman rows. Each row contains: Player Name string on the left, and a metadata text group on the right showing format "(Runs / Balls / SR)". Add a prominent active red asterisk icon (\*) next to Batter 1 to designate the active striker. - Right Column [Bowling Team Status]: Vertical stack displaying 2 active bowler rows matching the height of the batting rows. Each row contains: Bowler Name string on the left, and a data group on the right showing standard format "(O - M - R - W)". FRAME 3: RECENT DELIVERIES TRACKER (Horizontal Ribbon) - Structure: A single continuous horizontal badge container with 8px padding spanning the full viewport width. - Content: Place a static label on the left: "Recent: ". Followed by a horizontal row of rounded pill badges containing text arrays representing a live over sequence, exactly like this: [ O ], [ . ], [ 1 ], [ 4 ], [ Wd ], [ 6 ], [ Lb1 ], [ . ]. - On the extreme right of this ribbon, place a small down-arrow chevron icon indicating a "Dropdown for all deliveries" utility. FRAME 4: SECTIONAL NAVIGATION TAB BAR (Bottom Tab Row) - Structure: A horizontal segmented control tab layout evenly distributed across the view width. - Tabs text elements: [Overview], [Scorecard], [Commentary], [Stats]. - Style the [Overview] tab with an active underline highlight state using the primary accent color to show it is the default selection. Ensure all layers are grouped perfectly with clean auto-layout spacing variables (8px, 12px) so the layout looks structurally identical to the requested schematic text box.

\#### Match Detail Component Behavior:

\* \*\*Default Active Tab:\*\* `Overview`.

\* \*\*Overview Tab Content:\*\* Displays fundamental match metadata including Toss updates, Venue, Time Started, Country, Win Probability chart, and historical head-to-head records.

\* \*\*Scorecard Tab Content:\*\* Detailed performance metrics organized cleanly:

`  `\* \*\*Batting Table Columns:\*\* `Batsman`, `Dismissal Info (e.g., c. Name b. Name)`, `R`, `B`, `4s`, `6s`, `S/R`. Includes dedicated indicators for Captain `©` and Wicketkeeper `(WK)`.

`  `\* \*\*Innings Metadata Summary:\*\* Explicit calculation of Extras broken down by type: `Extras: Total\_Runs (NB X, WD Y, LB Z, B W)`. Total Runs line item showing `Total\_Runs (Wkts, Overs)`. Followed by sections for `Yet to Bat` and `Fall of Wickets`.

`  `\* \*\*Bowling Table Columns:\*\* `Bowling`, `O`, `M`, `R`, `W`, `Econ`.


- FRAME 5: SPECIAL EVENTS LOG (Input Area)
- Structure: A full-width container below the Recent Deliveries ribbon.
- Content: A text input field with a placeholder "e.g., Catch drop, Run-out miss...". An associated "Log Event" button. This input allows the scorer to log significant non-scoring events for a specific delivery. The text is stored in the 'events' column of the deliveries table.


\## 4. SCORER DASHBOARD & CREATE MATCH WORKFLOW

\### Scorer Workspace Navigation

The Scorer dashboard utilizes an optimized navigation layout:

\* `All Matches`

\* `Scheduled Matches` (Primary workspace: displays upcoming matches explicitly assigned to them by Club Admins)

\* `Notifications` (Triggers critical operational alerts: \*\*”Assignment of Match”\*\* pushed exactly 30 minutes prior to scheduled match start times)

\* `Completed Matches` (Historical archive of matches scored by this specific user) 

\### Match Initialization Sequence

When an assigned match hits its designated start time, the scorer triggers the initialization workflow:

1\. \*\*Squad Finalization:\*\* Select the Playing XI from the pre-uploaded club rosters. Explicitly tag the \*\*Captain ©\*\* and \*\*Wicketkeeper (WK)\*\*. \*(Note: Local scratch matches bypass strict XI rules and allow fewer than 11 players).\*

2\. \*\*Toss Screen:\*\* Input toss winner and their respective decision (Bat/Bowl).

3\. \*\*Match Configuration Validation:\*\* Verify pre-filled match parameters (Wagon Wheel tracking toggle, Name Display format, Match Type, Total Overs, Maximum Overs per Bowler, Venue, Ground, Country, Pitch Number).

4\. \*\*Active Player Selection:\*\* Define the initial \*\*Striker\*\*, \*\*Non-Striker\*\*, and \*\*Opening Bowler\*\* to unlock and load the main scoring console interface. 


\## 5. SCORER CONSOLE LOGIC & EXTRA DELIVERIES

\### Scoring Engine Controls

The interface presents explicit action inputs for Runs (`1`, `2`, `3`, `4`, `5`, `6`) and Extras (`No Ball`, `Wide`, `Leg Bye`, `Bye`).

\### Extras Operational Rules Matrix

\* \*\*No Ball (NB):\*\* \* Appends $+1$ automatic penalty run to the Extras tally and Team total score.

`  `\* Does \*not\* count against the batter’s total balls faced.

`  `\* Does \*not\* count as a legal delivery in the bowler’s over.

`  `\* Any physical runs scored off a No Ball are credited to the batter if hit by the bat; otherwise, they accumulate as additional No Ball extras.

\* \*\*Wide (WD):\*\* \* Appends $+1$ automatic penalty run to the Extras tally and Team total score.

`  `\* Does \*not\* count as a legal delivery in the over.

`  `\* Any additional runs tracking past the boundary or run by the batters count entirely as Wide extras.

\* \*\*Leg Bye (LB) & Bye (B):\*\* \* Appends directly to the Extras tally and Team total score.

`  `\* Counts as a \*\*legal delivery\*\* in both the over tracking and the bowler’s statistics.

`  `\* Does \*not\* add runs to the individual batter’s record; however, it \*does\* count as a ball faced for the batter on strike.


\## 6. WICKET DISMISSAL SUBSYSTEM

When a wicket event is triggered, the engine freezes regular runs input and launches a 4-step modal wizard:

1\. \*\*Identify Dismissed Player:\*\* Toggle between Striker and Non-Striker (or select from squad for run-out scenarios).

2\. \*\*Select Dismissal Type:\*\* Choose from standard variants: `Bowled`, `Caught`, `LBW`, `Run Out`, `Stumped`, `Hit Wicket`, `Timed Out`, `Obstructing Field`.

3\. \*\*Contextual Fielder Assignment:\*\* If `Caught`, `Run Out`, or `Stumped` is selected, an automated dropdown filters the opposing team’s squad to select the assisting fielder(s).

4\. \*\*Next Batter Selection:\*\* Prompts selection of the incoming batter from the remaining squad before unlocking the main scoring console.


\## 7. ADMINISTRATIVE DASHBOARDS

\### Club Administrator Workspace

Club Admins manage day-to-day team operations via a structured sidebar panel:

\* \*\*Approval Queue:\*\* A dedicated validation list to approve or reject incoming individual registrations (Players, Scorers, Analysts) who selected this club during sign-up.

\* \*\*Create Match Panel:\*\* \* \*\*Against Another Club:\*\* Select an opponent from affiliated clubs, designate your squad, set the date, time, and venue, and dispatch a match request. Once accepted, the match populates under the “Scheduled Matches” tab for both clubs.

`  `\* \*\*Local Match:\*\* Allows instant generation of internal scratch matches or practice sessions, bypassing formal cross-club confirmation steps.

\* \*\*Create Tournament Panel:\*\* Input Tournament Name ➔ Select Tournament Type ➔ Set Overs limit ➔ Input total number of matches ➔ Set maximum participating teams. Clicking \*\*”Create Tournament”\*\* generates the event shell. Admins can then seamlessly add individual matches using the standard match creation workflow.

\* \*\*Roster Management Tabs:\*\* Separate interactive directories for `My Matches`, `My Players`, and `My Scorers`. Inside these lists, the Admin can view records, modify profile detail strings, or delete entries permanently.

\### Super Administrator Workspace

The master governance dashboard is structured with the following tabs: `Matches`, `Registered Clubs`, `NV-Play Analytics`, `Super Admin`, `Notifications`, and `Settings`.

*   **Registered Clubs Tab:**
    *   Presents a list of all approved clubs, showing the club name and the total number of affiliated members.
    *   Provides `Edit` and `Delete` options for each club.
    *   Enables the Super Admin to click on any club to access and manage its specific `ClubAdmin` dashboard.

*   **Super Admin Tab:** This is the core administrative section with two primary functions:
    *   **Club Approvals:**
        *   Displays a list of clubs that have registered and are pending approval.
        *   The Super Admin can `Approve` or `Reject` these requests. An approved club becomes active and appears in the "Registered Clubs" list.
    *   **Database Management:**
        *   Features a high-level overview of the platform's data, including:
            *   Total number of registered clubs.
            *   Total matches played.
            *   Total user count.
            *   Total tournaments created.
        *   This section provides the tools for maintaining platform-wide data integrity.

\## 8. ROLE-SPECIFIC WORKSPACES (PLAYER VS. ANALYST)

\### Player Dashboard (“My Performances” Tab)

This layout is locked exclusively to the \*\*Player\*\* role. It displays personal individual records and career performance logs.

\#### A. Batting Performance Metrics

\* \*\*Core Logs:\*\* Individual Total Runs, 4s Hits, 6s Hits, 50s Count, 100s Count, 200s Count.

\* \*\*Calculated Metrics:\*\* Individual Strike Rate (S/R), Career Batting Average, Total Balls Faced.

\* \*\*Visual Representation:\*\* 2-3 interactive charts plotting personal run-scoring trajectory over time, individual wagon wheel summaries, and score distributions of past matches played.

\#### B. Bowling Performance Metrics

\* \*\*Core Logs:\*\* Personal Total Overs Bowled, Maidens Managed, Wickets Taken, Dot Balls Delivered.

\* \*\*Calculated Metrics:\*\* Personal Economy Rate, Career Bowling Average, 3-Wicket Hauls, 5-Wicket Hauls, 10-Wicket Match Hauls.

\* \*\*Visual Representation:\*\* 2-3 charts tracking individual spell lengths, economy stability across recent appearances, and bowling metrics per innings.

\### Analyst Dashboard (Comprehensive Analytics Workspace)

This layout is locked exclusively to the \*\*Analyst\*\* role. It houses the entire standalone dashboard system migrated from your existing NVPlay tracking code.

I have Nvplayanalytics.tsx and analytics.tsx  in src folder all the dashboards of it will be shown in this tole
