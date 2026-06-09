# CricketHub Application Flow Documentation

This document outlines all interactive elements and data flows in the CricketHub application for backend integration.

## Authentication Flow

### Sign In (`/signin`)
- **Email Input**: User enters email
- **Password Input**: User enters password
- **"Sign In" Button**: Validates credentials → Navigates to `/dashboard`
- **"Forgot password?" Link**: Navigates to `/forgot-password`
- **"Sign up" Link**: Navigates to `/signup`

### Sign Up (`/signup`)
- **Name Input**: User enters full name
- **Email Input**: User enters email
- **Password Input**: User enters password
- **Confirm Password Input**: User confirms password
- **"Create Account" Button**: Creates account → Navigates to `/dashboard`
- **"Sign in" Link**: Navigates to `/signin`

### Forgot Password (`/forgot-password`)
- **Email Input**: User enters email
- **"Send Reset Link" Button**: Sends reset email → Shows success message
- **"Back to Sign In" Link/Button**: Navigates to `/signin`

---

## Main Application Flow

### Dashboard (`/dashboard`)

#### Quick Actions
- **"Create Match" Button**: Navigates to `/admin` (Matches tab)
- **"Add Player" Button**: Navigates to `/admin` (Players tab)
- **"View Stats" Button**: Navigates to `/players`

#### Upcoming Fixtures Card
- **Click on any match card**: Navigates to `/match/:id` for that match

#### Recent Results Table/Cards
- **Click on any row/card**: Navigates to `/match/:id` for that match

#### Data to Display
- 5 KPI cards (Upcoming Matches, Win Rate, Avg Score, Avg Wickets, Recent Form)
- Run Rate chart (last 8 matches)
- 3 upcoming fixtures
- 5 recent results
- Best performer highlight

---

### Matches (`/matches`)

#### Filters
- **Format Chips**: Filter by All/T20/ODI/Test
- **Status Chips**: Filter by All/Won/Lost/Scheduled
- **Search Input**: Search by opponent or venue

#### Match List
- **Click on table row or card**: Navigates to `/match/:id`

#### Backend Endpoints Needed
- `GET /api/matches` - List all matches with filters
  - Query params: `format`, `status`, `search`

---

### Match Detail (`/match/:id`)

#### Tabs
- **Summary Tab**: Shows match summary with placeholder visualizations
- **Scorecard Tab**: Shows batting scorecard table
- **Batting Tab**: Shows batting statistics chart
- **Bowling Tab**: Shows bowling statistics table

#### Actions
- **"Back to Matches" Button**: Navigates to `/matches`

#### Backend Endpoints Needed
- `GET /api/matches/:id` - Get match details
- `GET /api/matches/:id/scorecard` - Get full scorecard
- `GET /api/matches/:id/stats` - Get match statistics

---

### Teams (`/teams`)

#### Team Cards
- **Click on any team card**: Navigates to `/team/:id`

#### Backend Endpoints Needed
- `GET /api/teams` - List all teams

---

### Team Detail (`/team/:id`)

#### Tabs
- **Squad Tab**: Shows all players in the team
- **Recent Matches Tab**: Shows last 5 matches
- **Team Stats Tab**: Shows team statistics

#### Actions
- **"Back to Teams" Button**: Navigates to `/teams`
- **Click on player**: Could navigate to `/player/:playerId` (currently not linked)

#### Backend Endpoints Needed
- `GET /api/teams/:id` - Get team details
- `GET /api/teams/:id/players` - Get team squad
- `GET /api/teams/:id/matches` - Get team matches
- `GET /api/teams/:id/stats` - Get team statistics

---

### Players (`/players`)

#### Filters
- **Role Chips**: Filter by All/Batsman/Bowler/All-rounder/Wicket-keeper
- **Team Dropdown**: Filter by team
- **Search Input**: Search by player name

#### Player List
- **Click on table row or card**: Navigates to `/player/:id`

#### Backend Endpoints Needed
- `GET /api/players` - List all players with filters
  - Query params: `role`, `team`, `search`

---

### Player Detail (`/player/:id`)

#### Sections
- Profile header with avatar, name, team, role
- Batting statistics KPI cards
- Runs per match chart
- Bowling statistics KPI cards (if wickets > 0)
- Wickets per match chart (if wickets > 0)

#### Actions
- **"Back to Players" Button**: Navigates to `/players`

#### Backend Endpoints Needed
- `GET /api/players/:id` - Get player details
- `GET /api/players/:id/stats` - Get player statistics
- `GET /api/players/:id/performance` - Get match-by-match performance

---

### Admin (`/admin`)

#### Tabs
- **Manage Teams**: CRUD operations for teams
- **Manage Players**: CRUD operations for players
- **Manage Matches**: CRUD operations for matches

#### Teams Tab Actions
- **"Add Team" Button**: Opens create drawer
- **Edit Icon**: Opens edit drawer for selected team
- **Delete Icon**: Confirms and deletes team
- **Form Submit**: Creates or updates team

#### Players Tab Actions
- **"Add Player" Button**: Opens create drawer
- **Edit Icon**: Opens edit drawer for selected player
- **Delete Icon**: Confirms and deletes player
- **Form Submit**: Creates or updates player

#### Matches Tab Actions
- **"Add Match" Button**: Opens create drawer
- **Edit Icon**: Opens edit drawer for selected match
- **Delete Icon**: Confirms and deletes match
- **Form Submit**: Creates or updates match

#### Backend Endpoints Needed
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `GET /api/players` - List players
- `POST /api/players` - Create player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/matches` - List matches
- `POST /api/matches` - Create match
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match

---

### Settings (`/settings`)

#### User Profile Section
- **Avatar Upload Button**: Opens file picker (placeholder)
- **Name Input**: Edit user name
- **Email Input**: Edit user email
- **"Save Profile" Button**: Saves profile changes

#### Preferences Section
- **Theme Chips**: Select light/dark theme
- **Default Team Dropdown**: Select default team
- **"Save Preferences" Button**: Saves preferences

#### Password Section
- **Current Password Input**: Enter current password
- **New Password Input**: Enter new password
- **Confirm Password Input**: Confirm new password
- **"Update Password" Button**: Updates password

#### Danger Zone
- **"Delete Account" Button**: Confirms and deletes account

#### Backend Endpoints Needed
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/preferences` - Update preferences
- `PUT /api/users/password` - Change password
- `DELETE /api/users/account` - Delete account

---

### Top Bar (Global)

#### Elements
- **Team Selector Dropdown**: Changes active team (updates context)
- **Search Input**: Searches across the app (placeholder)
- **Avatar Menu**:
  - Shows user name and email
  - **"Sign Out" Button**: Logs out → Navigates to `/signin`

---

### Sidebar (Global)

#### Navigation Links
- **Dashboard**: Navigates to `/dashboard`
- **Matches**: Navigates to `/matches`
- **Teams**: Navigates to `/teams`
- **Players**: Navigates to `/players`
- **Admin**: Navigates to `/admin`
- **Settings**: Navigates to `/settings`

---

## Data Models

### User
```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'player';
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark';
    defaultTeam: string;
  };
}
```

### Team
```typescript
{
  id: string;
  name: string;
  logo?: string;
  competition: string;
  playerCount: number;
  matchCount: number;
  wins: number;
  losses: number;
}
```

### Player
```typescript
{
  id: string;
  name: string;
  team: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  avatar?: string;
  matches: number;
  runs: number;
  wickets: number;
  battingAvg: number;
  bowlingAvg: number;
  strikeRate: number;
  economy: number;
}
```

### Match
```typescript
{
  id: string;
  teamA: string;
  teamB: string;
  opponent: string;
  venue: string;
  date: string; // ISO format
  format: 'T20' | 'ODI' | 'Test';
  status: 'Won' | 'Lost' | 'Scheduled' | 'In Progress';
  result?: string;
  teamAScore?: string;
  teamBScore?: string;
  competition: string;
}
```

---

## Alert/Confirmation Messages

All create/update/delete operations currently show browser alerts. Replace these with backend API calls:

1. **Create Success**: "Created [item] successfully!"
2. **Update Success**: "Updated [item] successfully!"
3. **Delete Confirmation**: "Are you sure you want to delete [item]?"
4. **Delete Success**: "Deleted [item] successfully!"
5. **Save Settings**: "Settings saved successfully!"
6. **Logout Confirmation**: "Are you sure you want to sign out?"

---

## Notes for Backend Integration

1. All alert() calls should be replaced with actual API calls and toast notifications
2. Form validations are minimal - add comprehensive validation on backend
3. Authentication state is currently client-side only - implement proper JWT/session management
4. Mock data is stored in `/src/data/mockData.ts` - use this as reference for data structures
5. Search functionality is placeholder - implement full-text search on backend
6. File upload (avatar) is placeholder - implement proper file storage
7. All IDs are strings - use consistent ID format (UUID recommended)
8. Dates are stored as ISO strings - maintain timezone consistency
9. Password fields need proper hashing and security measures
10. Implement rate limiting on all endpoints
11. Add proper error handling and user-friendly error messages
12. Consider implementing real-time updates for live match data using WebSockets

---

## Authentication Integration Points

When connecting to Supabase or custom backend:

1. Replace `/signin` form submission with authentication API call
2. Replace `/signup` form submission with user registration API call
3. Replace `/forgot-password` with password reset flow
4. Store auth tokens securely (httpOnly cookies recommended)
5. Add token refresh logic
6. Implement protected route middleware
7. Add role-based access control (admin vs regular user)

---

## Testing Checklist

- [ ] Sign in with valid credentials
- [ ] Sign up new account
- [ ] Password reset flow
- [ ] Navigation between all pages
- [ ] Dashboard quick actions
- [ ] Filter and search on Matches page
- [ ] Filter and search on Players page
- [ ] View match details with all tabs
- [ ] View team details with all tabs
- [ ] View player details
- [ ] Create/edit/delete teams in Admin
- [ ] Create/edit/delete players in Admin
- [ ] Create/edit/delete matches in Admin
- [ ] Update profile in Settings
- [ ] Change password in Settings
- [ ] Delete account flow
- [ ] Sign out functionality
- [ ] Mobile responsiveness on all screens
- [ ] Touch interactions on mobile devices
