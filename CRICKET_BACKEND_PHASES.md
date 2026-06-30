# CricketHub — Backend Build Plan
## Enterprise Phase Architecture v1.0

---

## What We Know From the Frontend Code

**Tech Stack Confirmed:**
- React + Vite + Tailwind + shadcn/ui
- Custom router (no react-router-dom — uses internal `navigate()` state)
- All data is currently mocked in `src/data/mockData.ts`
- Auth is currently fake (`mockCredentials` array in SignIn.tsx)
- 6 user roles: `viewer | player | scorer | analyst | club_admin | super_admin`
- Pages fully built: SignIn, SignUp, Dashboard, Matches, MatchDetail, MatchSetup, ScorerConsole, Analytics, NVPlayAnalytics, PlayerPerformance, ClubAdmin, SuperAdmin, Teams, Players, PlayerDetail, TeamDetail, Settings

**What the Frontend Expects From the Backend:**
- JWT tokens with payload: `{ user_id, role, club_id, is_approved }`
- REST API at `/api/...` (14+ endpoints per spec)
- Ball-by-ball commentary streaming
- Scorer math engine (deterministic delivery processing)
- NVPlay analytics aggregations
- OTP verification on signup
- Club approval pipeline

---

## Gating Rules (Apply to Every Phase)

1. **Phase N cannot start until Phase N-1 passes all its verification tests**
2. **Every phase produces a deployable build** — no dead-end phases
3. **Frontend never needs modification** to plug into the backend — API contracts must match what the UI already expects
4. **No mock data survives past Phase 2** — all frontend mocks get replaced with real API calls phase by phase

---

## Phase 0 — Foundation & Infrastructure
**Goal:** Skeleton runs, connects to DB, health check passes. Nothing more.

### Tasks
- [ ] Initialize Node.js project with Express, folder structure per spec
  - `server.js`, `db.js`, `src/controllers/`, `src/services/`, `src/repositories/`, `src/middlewares/`
- [ ] Configure `pg` connection pool pointed at Google Cloud SQL (PostgreSQL)
- [ ] Set up Winston logger outputting structured JSON
- [ ] Configure environment variables (`.env`): DB credentials, JWT secret, PORT
- [ ] Write `GET /health` endpoint returning `{ status: "ok", timestamp }`
- [ ] Write base error handler middleware (catches unhandled errors, returns clean JSON)
- [ ] Set up CORS to allow frontend origin
- [ ] Write `db.js` with pool + connectivity test on startup

### Verification Gate
- `GET /health` returns 200
- Server starts without errors
- DB connection pool confirms active
- Winston logs appear in structured JSON format
- **Do not proceed to Phase 1 until this passes**

---

## Phase 1 — Database Schema
**Goal:** All tables created, relationships enforced, seed data loaded.

### Tables to Create (from spec + frontend data structures)

```sql
-- Core identity
users (id UUID PK, first_name, last_name, display_name, email UNIQUE, phone, password_hash, role ENUM, club_id FK nullable, is_approved BOOLEAN DEFAULT false, created_at)

-- Club/org layer
clubs (id UUID PK, name, home_ground, contact_number, email, country, display_initials, logo_url, owner_name, is_approved BOOLEAN DEFAULT false, created_at)

-- Match structure
matches (id UUID PK, club_id FK, team_a_id FK, team_b_id FK, venue, ground, country, match_type ENUM[T20,ODI,Test,Local], total_overs, overs_per_bowler, status ENUM[Scheduled,Live,Completed], toss_winner_id FK, toss_decision ENUM[Bat,Bowl], wagon_wheel_enabled BOOLEAN, name_display_format ENUM[full,short], scheduled_at TIMESTAMPTZ, created_at)

-- Teams & squads
teams (id UUID PK, club_id FK, name, logo_url)
squad_selections (id UUID PK, match_id FK, team_id FK, player_id FK, is_captain BOOLEAN, is_wicket_keeper BOOLEAN)

-- Live match state
innings (id UUID PK, match_id FK, batting_team_id FK, bowling_team_id FK, innings_number INT, total_runs INT DEFAULT 0, wickets INT DEFAULT 0, overs_completed INT DEFAULT 0, balls_in_over INT DEFAULT 0, extras_wides INT DEFAULT 0, extras_no_balls INT DEFAULT 0, extras_byes INT DEFAULT 0, extras_leg_byes INT DEFAULT 0, status ENUM[Active,Completed])

-- Ball-by-ball log
deliveries (id UUID PK, innings_id FK, over_number INT, ball_number INT, bowler_id FK, striker_id FK, non_striker_id FK, runs_off_bat INT, extra_type ENUM[None,NB,WD,LB,B], extra_runs INT, is_wicket BOOLEAN, dismissal_type VARCHAR, dismissed_player_id FK nullable, fielder_id FK nullable, commentary_text TEXT, events TEXT, bowling_side VARCHAR, created_at TIMESTAMPTZ)

-- Player career stats (aggregated)
player_batting_stats (id UUID PK, player_id FK UNIQUE, total_runs, balls_faced, fours, sixes, fifties, hundreds, double_hundreds, matches_played, innings_batted, times_dismissed)
player_bowling_stats (id UUID PK, player_id FK UNIQUE, overs_bowled, maidens, runs_conceded, wickets, dot_balls, three_fers, five_fers, ten_fers, matches_played)

-- Tournaments
tournaments (id UUID PK, club_id FK, name, tournament_type ENUM[Knockout,League,RoundRobin], overs_limit INT, max_teams INT, status, created_at)
tournament_teams (tournament_id FK, team_id FK, PRIMARY KEY(tournament_id, team_id))

-- OTP
otp_verifications (id UUID PK, phone, code VARCHAR(6), expires_at TIMESTAMPTZ, verified BOOLEAN DEFAULT false)
```

### Tasks
- [ ] Write migration file `001_initial_schema.sql`
- [ ] Write seed file `002_seed_data.sql` — 2 clubs, 20 players, 3 completed matches with full delivery logs (replaces frontend mock data)
- [ ] Run migrations against Cloud SQL instance
- [ ] Confirm all foreign key constraints pass
- [ ] Write `db.js` query helper with parameterized query wrapper

### Verification Gate
- All tables exist in DB
- Seed data loads without constraint errors
- FK relationships verified via query
- **Do not proceed to Phase 2 until this passes**

---

## Phase 2 — Authentication & RBAC
**Goal:** Real JWT auth replaces mock credentials. Frontend SignIn/SignUp connects to real API.

### Endpoints Built This Phase
```
POST /api/auth/register          — Individual signup
POST /api/auth/register/club     — Club registration (routes to Super Admin queue)
POST /api/auth/otp/send          — Send OTP to phone
POST /api/auth/otp/verify        — Verify OTP code
POST /api/auth/login             — Returns JWT
GET  /api/auth/me                — Returns current user from token
```

### JWT Payload (exactly as spec)
```json
{
  "user_id": "uuid",
  "role": "Scorer | Player | Analyst | Club_Admin | Super_Admin | Viewer",
  "club_id": "uuid_or_null",
  "is_approved": true
}
```

### Middleware Built This Phase
- `authenticateToken` — verifies JWT signature, attaches `req.user`
- `requireApproved` — blocks `is_approved: false`, hard-returns 403 with Viewer redirect signal
- `requireRole(...roles)` — RBAC gate, returns 403 if role not in allowed list
- `requireSameClub` — tenant isolation, ensures `req.user.club_id` matches target resource

### Zod Schemas Built This Phase
- `RegisterIndividualSchema` — matches SignUp.tsx fields exactly
- `RegisterClubSchema` — matches club form fields exactly
- `LoginSchema`

### Tasks
- [ ] Build auth controller, service, repository
- [ ] Implement bcryptjs password hashing in register service
- [ ] Implement JWT sign/verify in auth service
- [ ] Build all 6 auth endpoints
- [ ] Build 3 middleware functions
- [ ] Build Zod schemas for auth
- [ ] **Frontend wiring:** Replace `mockCredentials` in `SignIn.tsx` with real `POST /api/auth/login` call
- [ ] **Frontend wiring:** Wire `SignUp.tsx` to `POST /api/auth/register` and OTP endpoints
- [ ] Store JWT in `localStorage` on login, attach to all future requests via Axios interceptor

### Verification Tests
```javascript
// Test 1: Login returns valid JWT
POST /api/auth/login { email, password } → 200, { token }
jwt.verify(token) → { user_id, role, club_id, is_approved }

// Test 2: is_approved: false gets blocked
GET /api/scorer/matches (with unapproved token) → 403

// Test 3: Wrong role gets blocked  
GET /api/analyst/nvplay-streams (with Scorer token) → 403

// Test 4: Cross-tenant blocked
Club Admin A tries to approve member of Club B → 403 "Tenant Isolation Mismatch"
```

### Verification Gate
- All 4 tests pass
- SignIn page authenticates against real API
- SignUp flow creates real user records
- OTP flow works end-to-end
- **Do not proceed to Phase 3 until this passes**

---

## Phase 3 — Viewer & Public Match APIs
**Goal:** Dashboard, Matches, MatchDetail pages pull real data. Mock data removed from these pages.

### Endpoints Built This Phase
```
GET /api/viewer/matches?status=live|scheduled|completed|all
GET /api/viewer/matches/:id
GET /api/viewer/matches/:id/scorecard
GET /api/viewer/matches/:id/commentary
GET /api/viewer/teams
GET /api/viewer/teams/:id
GET /api/viewer/players
GET /api/viewer/players/:id
GET /api/viewer/dashboard/kpis
```

### Services Built This Phase
- `MatchQueryService` — filters by status, region, club
- `ScorecardBuilder` — assembles batting table, bowling table, extras breakdown, fall of wickets from deliveries table
- `CommentaryService` — fetches ordered delivery commentary

### Tasks
- [ ] Build viewer controller, service, repository layer
- [ ] Write SQL queries for all viewer endpoints
- [ ] **Frontend wiring:** Replace `mockMatches` in `Matches.tsx` with `GET /api/viewer/matches`
- [ ] **Frontend wiring:** Replace mock data in `MatchDetail.tsx` with `GET /api/viewer/matches/:id/scorecard`
- [ ] **Frontend wiring:** Replace mock data in `Dashboard.tsx` with `GET /api/viewer/dashboard/kpis`
- [ ] **Frontend wiring:** Replace mock data in `Players.tsx`, `PlayerDetail.tsx`, `Teams.tsx`, `TeamDetail.tsx`

### Verification Gate
- All viewer endpoints return correctly shaped data matching frontend interfaces
- Scorecard calculates extras correctly (NB, WD, LB, B sub-totals)
- Matches page shows real data from DB seed
- **Do not proceed to Phase 4 until this passes**

---

## Phase 4 — Scorer Engine (Core Cricket Logic)
**Goal:** ScorerConsole and MatchSetup wire to real backend. Deterministic math engine live.

### Endpoints Built This Phase
```
POST /api/scorer/matches/:id/initialize     — Squad, toss, openers setup
POST /api/scorer/matches/:id/ball           — Record delivery
POST /api/scorer/matches/:id/wicket-wizard  — 4-step dismissal pipeline
GET  /api/scorer/matches/assigned           — Scorer's assigned fixtures
POST /api/scorer/matches/:id/undo           — Undo last delivery
```

### Scorer Math Engine (exact rules from spec)
| Event | Team Score | Extras | Batter Balls | Bowler Ball Count |
|---|---|---|---|---|
| Standard | +bat_runs | no change | +1 | +1 |
| No Ball | +1 penalty + bat_runs | +1 penalty | +1 | NO CHANGE |
| Wide | +1 penalty + extra_runs | +1 penalty + extra_runs | NO CHANGE | NO CHANGE |
| Leg Bye | +extra_runs | +extra_runs | +1 | +1 |
| Bye | +extra_runs | +extra_runs | +1 | +1 |

### Zod Schemas Built This Phase
- `BallInputSchema` (updated to include optional `events: string`)
- `WicketWizardSchema` — `{ dismissed_player_id, dismissal_type, fielder_id, incoming_batsman_id }`
- `MatchInitializeSchema`

### Tasks
- [ ] Build scorer controller, service, repository
- [ ] Implement `ScoringEngine.recordDelivery()` with all 5 delivery type branches
- [ ] Implement over completion logic (ball 6 → increment overs, reset balls)
- [ ] Implement innings completion detection (all out OR overs exhausted)
- [ ] Implement `WicketWizardService` — 4-step pipeline updating dismissal record, rotating batsmen
- [ ] Implement undo — pops last delivery from DB, reverses all stat mutations in a transaction
- [ ] Winston log every delivery with full telemetry JSON (as per spec)
- [ ] **Frontend wiring:** Wire `MatchSetup.tsx` to `POST /api/scorer/matches/:id/initialize`
- [ ] **Frontend wiring:** Wire `ScorerConsole.tsx` `recordBall()` to `POST /api/scorer/matches/:id/ball`
- [ ] **Frontend wiring:** Wire wicket dialog to `POST /api/scorer/matches/:id/wicket-wizard`

### Verification Tests (exact from spec)
```javascript
// Test 1: No Ball math
recordBall({ runs_off_bat: 4, extra_type: "NB" })
→ team_score_added: 5, extras_added: 1, over_advanced: false

// Test 2: Wide math
recordBall({ runs_off_bat: 0, extra_type: "WD", extra_runs: 1 })
→ team_score_added: 1, batter_balls_faced_delta: 0, over_advanced: false

// Test 3: Standard delivery
recordBall({ runs_off_bat: 4, extra_type: "None" })
→ team_score_added: 4, over_advanced: true (if ball 6)

// Test 4: Undo reverses all state
recordBall(...) then undo()
→ DB state identical to pre-delivery snapshot
```

### Verification Gate
- All 4 scorer tests pass
- ScorerConsole records live balls against DB
- Wicket wizard completes and rotates batsmen correctly
- Undo works without data corruption
- **Do not proceed to Phase 5 until this passes**

---

## Phase 5 — Club Admin & Super Admin APIs
**Goal:** ClubAdmin and SuperAdmin pages connect to real data. Full approval pipeline live.

### Endpoints Built This Phase
```
GET  /api/club-admin/approvals/pending
PUT  /api/club-admin/approvals/:id           — APPROVE or REJECT
POST /api/club-admin/matches                 — Cross-club or local match
POST /api/club-admin/tournaments
GET  /api/club-admin/roster/matches
GET  /api/club-admin/roster/players
GET  /api/club-admin/roster/scorers

PUT  /api/super-admin/clubs/:id/approve
DELETE /api/super-admin/data-audit/:match_id
GET  /api/super-admin/clubs
GET  /api/super-admin/clubs/:id/members
GET  /api/super-admin/approvals/pending
```

### Zod Schemas Built This Phase
- `ApprovalInputSchema` (exact from spec)
- `TournamentInputSchema` (exact from spec)
- `ClubOnboardingSchema` (exact from spec)
- `CreateMatchSchema`

### Tenant Isolation Rule (enforced everywhere)
Every club-admin mutation binds `WHERE club_id = req.user.club_id` — no exceptions. Any attempt to mutate foreign club data returns 403.

### Tasks
- [ ] Build club-admin controller, service, repository
- [ ] Build super-admin controller, service, repository
- [ ] Implement approval pipeline — `PUT /api/club-admin/approvals/:id` flips `is_approved` in users table
- [ ] Implement cross-club match invite (creates match with `status: Pending`, notifies opponent club)
- [ ] Implement local match creation (no invite, instant `status: Scheduled`)
- [ ] Implement tournament shell creation + auto-generates fixture slots
- [ ] Implement super-admin club approval flow
- [ ] Implement data audit delete (Super Admin only, hard delete with audit log)
- [ ] **Frontend wiring:** Wire `ClubAdmin.tsx` approval queue to real API
- [ ] **Frontend wiring:** Wire create match/tournament forms to real API
- [ ] **Frontend wiring:** Wire `SuperAdmin.tsx` clubs directory and approval inbox to real API

### Verification Tests
```javascript
// Test 1: Club Admin A cannot approve Club B members
processApproval({ admin_club_id: "Club_A", target_user_club_id: "Club_B" })
→ 403 "Access Denied: Tenant Isolation Mismatch"

// Test 2: Approval flips is_approved
approveUser(user_id) → user.is_approved === true in DB

// Test 3: Super Admin approves club
approveClub(club_id) → club.is_approved === true, Club Admin can now access privileged endpoints
```

### Verification Gate
- All 3 tests pass
- Approval pipeline is end-to-end functional
- Tenant isolation verified — no cross-club data leakage
- **Do not proceed to Phase 6 until this passes**

---

## Phase 6 — Player Stats & Analyst Analytics
**Goal:** PlayerPerformance and NVPlayAnalytics pull real aggregated data.

### Endpoints Built This Phase
```
GET /api/player/my-performances           — Career stats for authenticated player
GET /api/analyst/nvplay-streams           — Multi-match aggregation for NV dashboards
GET /api/analyst/nvplay-streams/team      — Team performance aggregations
GET /api/analyst/nvplay-streams/player    — Player performance aggregations  
GET /api/analyst/nvplay-streams/tournament — Tournament performance aggregations
```

### Analytics Aggregations (NVPlay)
These are SQL aggregation queries — not ML, not external API. Pure DB aggregation matching the NVPlay filter structure in the frontend:
- Team: run rate by over, boundary breakdown, partnership maps, bowling economy by phase
- Player: strike rate, dot ball index, head-to-head matchups, dismissal patterns
- Tournament: points table, top scorers, top wicket takers, venue stats

### Tasks
- [ ] Build player stats service — queries `deliveries` table, aggregates career numbers
- [ ] Build analyst aggregation service — complex GROUP BY queries across deliveries + innings + matches
- [ ] Implement filter parameter parsing (tournament, homeTeam, oppositionTeam, dateRange, etc. — matches `useDashboardFilters.ts` hook)
- [ ] Write privacy test: player can only fetch their own stats
- [ ] Write analyst scope test: only Analyst role gets aggregation data
- [ ] **Frontend wiring:** Wire `PlayerPerformance.tsx` to `GET /api/player/my-performances`
- [ ] **Frontend wiring:** Wire `NVPlayAnalytics.tsx` filter hook to real API

### Verification Tests
```javascript
// Test 1: Player privacy
fetchPerformance({ token_user_id: "Player_X", request_target_id: "Player_Y" })
→ 403

// Test 2: Analyst scope
fetchRawStreams({ role: "Analyst" }) → 200, { hasDataArray: true }
fetchRawStreams({ role: "Scorer" }) → 403
```

### Verification Gate
- Both tests pass
- PlayerPerformance page shows real career data
- NVPlayAnalytics filters cascade correctly against real DB
- **Do not proceed to Phase 7 until this passes**

---

## Phase 7 — Hardening, Error Recovery & Production Readiness
**Goal:** System is enterprise-grade stable. Crash guards, interceptors, and telemetry fully wired.

### Tasks
- [ ] **Axios Global Interceptors (frontend):** Add request interceptor to attach JWT header; add response interceptor to catch 401 (token expired → redirect to login), 403 (role/approval issue → toast + redirect), network errors (toast warning, preserve local state)
- [ ] **Crash Guard (frontend):** If network drops mid-scoring session, local `ballHistory` state preserved in `sessionStorage`, retry queue activated when connection resumes
- [ ] **Backend rate limiting:** Add `express-rate-limit` on auth endpoints (prevent brute force on login/OTP)
- [ ] **Input sanitization audit:** Review all Zod schemas, ensure no schema is missing from any endpoint
- [ ] **Structured telemetry:** Every delivery mutation logs Winston JSON with `timestamp, level, context, match_id, action, metrics, database_transaction_status`
- [ ] **Transaction safety:** All scorer mutations wrapped in `pg` transactions — no partial state commits possible
- [ ] **Jest test suite:** Write all 4 specified automated eval tests (scorer math, club admin boundary, player ledger privacy, analyst scope)
- [ ] **Environment config audit:** Confirm `.env.production` values are clean, no secrets in codebase
- [ ] **CORS final config:** Lock to frontend domain only
- [ ] Load test scorer endpoint with concurrent delivery submissions

### Verification Gate
- All 4 Jest test suites pass
- Network dropout test: drop connection mid-match, reconnect, state preserved
- Rate limiter blocks >10 failed logins/min
- All endpoints have Zod validation — no endpoint accepts raw unvalidated input
- Zero secrets in codebase

---

## Phase Summary

| Phase | Goal | Key Output | Gate |
|---|---|---|---|
| **0** | Foundation | Server boots, DB connects | Health check passes |
| **1** | Database | All tables, seed data | Schema + constraints verified |
| **2** | Auth & RBAC | Real JWT, 6 roles, approval flow | 4 auth tests pass |
| **3** | Viewer APIs | Public match/player/team data | Frontend mock data removed |
| **4** | Scorer Engine | Live cricket math, wicket wizard | 4 scorer math tests pass |
| **5** | Admin APIs | Approval pipeline, tenant isolation | 3 admin tests pass |
| **6** | Analytics | Player stats, NVPlay aggregations | 2 analytics tests pass |
| **7** | Hardening | Crash guards, telemetry, rate limiting | Full Jest suite passes |

---

## Known Open Questions (Must Resolve Before Starting)

1. **OTP Provider** — What SMS gateway are you using? (Twilio, AWS SNS, other?) This affects Phase 2.
2. **GCP Project** — Is the Cloud SQL instance already provisioned, or do we need to set that up?
3. **NVPlay** — Is this an external API we need to call, or is it purely our own DB aggregations? The spec is ambiguous on this.
4. **Chatbot service** — The spec mentions `cricket-chatbot-service` for commentary streaming. Is this in scope for this build or a later phase?

---

*Plan version 1.0 — Ready to begin Phase 0 on confirmation.*
