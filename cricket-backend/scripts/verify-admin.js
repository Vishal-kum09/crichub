// Verification harness for the admin pipeline. Builds an isolated express app
// (json + admin/scorer routers + errorHandler), seats two clubs + users + a
// throwaway match, signs role JWTs, and drives the real HTTP endpoints against
// the live DB. All fixtures are torn down at the end.
//
//   node scripts/verify-admin.js
require('dotenv').config();

const express = require('express');
const request = require('supertest');

const { pool } = require('../db');
const authService = require('../src/services/authService');
const logger = require('../config/logger');
const { errorHandler } = require('../src/middlewares/errorHandler');
const clubAdminRoutes = require('../src/routes/clubAdminRoutes');
const superAdminRoutes = require('../src/routes/superAdminRoutes');
const scorerRoutes = require('../src/routes/scorerRoutes');

const app = express();
app.use(express.json());
app.use('/api/club-admin', clubAdminRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/scorer', scorerRoutes);
app.use(errorHandler);

// ─── capture Winston warn calls (for Test 4) ─────────────────────────────────
const warnLog = [];
const origWarn = logger.warn.bind(logger);
logger.warn = (msg, meta) => { warnLog.push({ msg, meta }); return origWarn(msg, meta); };

// ─── assert helpers ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const ok = (l) => { passed++; console.log(`  ✓ ${l}`); };
const bad = (l, d) => { failed++; console.log(`  ✗ ${l} -> ${d}`); };
const eq = (l, a, e) => { a === e ? ok(`${l} (= ${JSON.stringify(a)})`) : bad(l, `expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); };

const auth = (req, token) => req.set('Authorization', `Bearer ${token}`);
const fx = { clubA: null, clubB: null, users: [], matchId: null, inningsId: null };

const mkUser = async (o) => {
  const r = await pool.query(
    `INSERT INTO users (email, first_name, last_name, display_name, role, account_role,
                        club_id, is_approved, is_active)
     VALUES ($1,$2,$3,$4,$5::platform_role,$6::account_role,$7,$8,$9)
     RETURNING user_id`,
    [o.email, o.first || 'T', o.last || 'U', o.display || 'Test User',
     o.platformRole || 'viewer', o.accountRole, o.clubId || null,
     o.approved ?? false, o.active ?? true]
  );
  fx.users.push(r.rows[0].user_id);
  return r.rows[0].user_id;
};

async function setup() {
  const ts = Date.now();
  fx.clubA = (await pool.query(
    `INSERT INTO clubs (name, country, is_approved) VALUES ($1,'England',true) RETURNING clubs_id`,
    [`Verify Club A ${ts}`]
  )).rows[0].clubs_id;
  fx.clubB = (await pool.query(
    `INSERT INTO clubs (name, country, is_approved) VALUES ($1,'England',false) RETURNING clubs_id`,
    [`Verify Club B ${ts}`]
  )).rows[0].clubs_id;

  fx.adminA = await mkUser({ email: `admin-a-${ts}@e.com`, accountRole: 'Club_Admin',
    platformRole: 'admin', clubId: fx.clubA, approved: true, display: 'Admin A' });
  fx.superAdmin = await mkUser({ email: `super-${ts}@e.com`, accountRole: 'Super_Admin',
    platformRole: 'admin', approved: true, display: 'Super Admin' });
  fx.pendingA = await mkUser({ email: `pend-a-${ts}@e.com`, accountRole: 'Viewer',
    platformRole: 'viewer', clubId: fx.clubA, approved: false, display: 'Pending A' });
  fx.pendingB = await mkUser({ email: `pend-b-${ts}@e.com`, accountRole: 'Viewer',
    platformRole: 'viewer', clubId: fx.clubB, approved: false, display: 'Pending B' });

  const tok = (uid, role, clubId, approved = true) =>
    authService.signToken({ user_id: uid, account_role: role, club_id: clubId || null, is_approved: approved });

  return {
    adminAToken: tok(fx.adminA, 'Club_Admin', fx.clubA),
    superToken: tok(fx.superAdmin, 'Super_Admin', null),
  };
}

async function seatMatchForDelete() {
  const teams = (await pool.query(`SELECT teams_id FROM teams ORDER BY created_at LIMIT 2`)).rows.map(r => r.teams_id);
  const players = (await pool.query(`SELECT players_id FROM players ORDER BY created_at LIMIT 3`)).rows.map(r => r.players_id);
  fx.matchId = (await pool.query(
    `INSERT INTO matches (match_date, start_time, format, ball_type, overs_per_match,
                          team1_id, team2_id, scheduled_at, created_by)
     VALUES (CURRENT_DATE, '10:00', 'T20', 'leather', 20, $1, $2, now(), $3)
     RETURNING matches_id`,
    [teams[0], teams[1], fx.adminA]
  )).rows[0].matches_id;
  fx.inningsId = (await pool.query(
    `INSERT INTO innings (match_id, innings_number, batting_team_id, fielding_team_id, status)
     VALUES ($1, 1, $2, $3, 'in_progress'::innings_status) RETURNING innings_id`,
    [fx.matchId, teams[0], teams[1]]
  )).rows[0].innings_id;
  const overId = (await pool.query(
    `INSERT INTO overs (innings_id, over_number, bowler_id, cumulative_runs, cumulative_wickets, run_rate, phase)
     VALUES ($1, 1, $2, 0, 0, 0, 'powerplay'::phase_enum) RETURNING overs_id`,
    [fx.inningsId, players[2]]
  )).rows[0].overs_id;
  await pool.query(
    `INSERT INTO deliveries (innings_id, over_id, over_number, ball_in_over, delivery_sequence,
                             bowler_id, batter_id, non_striker_id, delivery_type, scored_by)
     VALUES ($1,$2,1,1,1,$3,$4,$5,'legal'::delivery_type,$6)`,
    [fx.inningsId, overId, players[2], players[0], players[1], fx.adminA]
  );
}

async function run() {
  const { adminAToken, superToken } = await setup();

  console.log('\nTest 1 — Tenant isolation hard block');
  {
    // Club A admin tries to approve a user that belongs to Club B.
    const res = await auth(
      request(app).put(`/api/club-admin/approvals/${fx.pendingB}`), adminAToken
    ).send({ action: 'APPROVE', assigned_role: 'Scorer' });
    eq('status 403', res.status, 403);
    eq('exact message', res.body.error, 'Access Denied: Tenant Isolation Mismatch');
  }

  console.log('\nTest 2 — Approval pipeline');
  {
    const pend = await auth(request(app).get('/api/club-admin/approvals/pending'), adminAToken);
    const target = (pend.body.approvals || []).find((a) => a.id === fx.pendingA);
    if (!target) return bad('pending list contains Club A user', JSON.stringify(pend.body));
    ok('GET pending returns the Club A pending user');

    const put = await auth(
      request(app).put(`/api/club-admin/approvals/${fx.pendingA}`), adminAToken
    ).send({ action: 'APPROVE', assigned_role: 'Scorer' });
    eq('approve status 200', put.status, 200);

    const dbRow = (await pool.query(
      `SELECT is_approved, account_role FROM users WHERE user_id = $1`, [fx.pendingA]
    )).rows[0];
    eq('is_approved flipped to true', dbRow.is_approved, true);
    eq('account_role assigned = Scorer', dbRow.account_role, 'Scorer');

    // The approved user can now reach a Scorer-only endpoint.
    const userToken = authService.signToken({
      user_id: fx.pendingA, account_role: 'Scorer', club_id: fx.clubA, is_approved: true
    });
    const protectedRes = await auth(request(app).get('/api/scorer/matches/assigned'), userToken);
    eq('approved user reaches role-protected endpoint', protectedRes.status, 200);
  }

  console.log('\nTest 3 — Super Admin club approval');
  {
    const res = await auth(request(app).put(`/api/super-admin/clubs/${fx.clubB}/approve`), superToken);
    eq('approve status 200', res.status, 200);
    const dbRow = (await pool.query(`SELECT is_approved FROM clubs WHERE clubs_id = $1`, [fx.clubB])).rows[0];
    eq('club is_approved flipped to true', dbRow.is_approved, true);
  }

  console.log('\nTest 4 — Super Admin data audit delete');
  {
    await seatMatchForDelete();
    warnLog.length = 0;
    const res = await auth(request(app).delete(`/api/super-admin/data-audit/${fx.matchId}`), superToken);
    eq('delete status 200', res.status, 200);

    const m = (await pool.query(`SELECT count(*)::int n FROM matches WHERE matches_id = $1`, [fx.matchId])).rows[0].n;
    const inn = (await pool.query(`SELECT count(*)::int n FROM innings WHERE match_id = $1`, [fx.matchId])).rows[0].n;
    const dlv = (await pool.query(`SELECT count(*)::int n FROM deliveries WHERE innings_id = $1`, [fx.inningsId])).rows[0].n;
    eq('match row gone', m, 0);
    eq('child innings gone', inn, 0);
    eq('child deliveries gone', dlv, 0);

    const logged = warnLog.find((w) => w.meta && w.meta.action === 'MATCH_HARD_DELETE');
    eq('Winston logged the deletion', !!logged, true);
    eq('logged admin user_id', logged && logged.meta.admin_user_id, fx.superAdmin);
    eq('logged match_id', logged && logged.meta.match_id, fx.matchId);
    fx.matchId = null; // already deleted
  }
}

async function cleanup() {
  try {
    if (fx.matchId) {
      // Only if Test 4 did not run / failed before delete.
      await pool.query(`DELETE FROM deliveries WHERE innings_id IN (SELECT innings_id FROM innings WHERE match_id=$1)`, [fx.matchId]);
      await pool.query(`DELETE FROM overs WHERE innings_id IN (SELECT innings_id FROM innings WHERE match_id=$1)`, [fx.matchId]);
      await pool.query(`DELETE FROM innings WHERE match_id=$1`, [fx.matchId]);
      await pool.query(`DELETE FROM matches WHERE matches_id=$1`, [fx.matchId]);
    }
    if (fx.users.length) await pool.query(`DELETE FROM users WHERE user_id = ANY($1::uuid[])`, [fx.users]);
    if (fx.clubA) await pool.query(`DELETE FROM clubs WHERE clubs_id = ANY($1::uuid[])`, [[fx.clubA, fx.clubB]]);
  } catch (e) { console.error('Cleanup error:', e.message); }
}

(async () => {
  try { await run(); }
  catch (err) { failed++; console.error('\nHarness error:', err.message, err.stack); }
  finally {
    await cleanup();
    console.log('\nFixtures cleaned up.');
    logger.warn = origWarn;
    await pool.end();
  }
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})();
