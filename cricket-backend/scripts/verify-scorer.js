// Verification harness for the scoring engine. Spins up an isolated express app
// (json + scorer routes + errorHandler — the same stack as server.js, minus the
// listener/rate-limiter), seats a throwaway match/innings/players, signs a
// Scorer JWT, and drives the real HTTP endpoints against the live DB. Every
// fixture it creates is torn down at the end.
//
//   node scripts/verify-scorer.js
require('dotenv').config();

const express = require('express');
const request = require('supertest');

const { pool } = require('../db');
const authService = require('../src/services/authService');
const { errorHandler } = require('../src/middlewares/errorHandler');
const scorerRoutes = require('../src/routes/scorerRoutes');

// ─── isolated app (mirrors server.js wiring for /api/scorer) ─────────────────
const app = express();
app.use(express.json());
app.use('/api/scorer', scorerRoutes);
app.use(errorHandler);

// ─── tiny assert helpers ─────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const ok = (label) => { passed++; console.log(`  ✓ ${label}`); };
const bad = (label, detail) => { failed++; console.log(`  ✗ ${label} -> ${detail}`); };
const eq = (label, actual, expected) => {
  if (actual === expected) ok(`${label} (= ${actual})`);
  else bad(label, `expected ${expected}, got ${actual}`);
};

// Fixtures we create and must clean up.
const fx = { userId: null, matchId: null, inningsIds: new Set(), players: [] };

const auth = (req, token) => req.set('Authorization', `Bearer ${token}`);

async function setup() {
  // Two teams + three players from existing seed data (valid FKs).
  const players = await pool.query(
    `SELECT players_id FROM players ORDER BY created_at ASC LIMIT 3`
  );
  if (players.rows.length < 3) throw new Error('Need at least 3 seeded players');
  fx.players = players.rows.map((r) => r.players_id);

  const teams = await pool.query(`SELECT teams_id FROM teams ORDER BY created_at ASC LIMIT 2`);
  if (teams.rows.length < 2) throw new Error('Need at least 2 seeded teams');
  const [t1, t2] = teams.rows.map((r) => r.teams_id);

  // Temp scorer user (scored_by FK + matches.created_by FK).
  const u = await pool.query(
    `INSERT INTO users (email, first_name, last_name, display_name, role)
     VALUES ($1,'Verify','Scorer','Verify Scorer','scorer'::platform_role)
     RETURNING user_id`,
    [`verify-scorer-${Date.now()}@example.com`]
  );
  fx.userId = u.rows[0].user_id;

  // Throwaway match (T20, 20 overs) — scheduled.
  const m = await pool.query(
    `INSERT INTO matches
       (match_date, start_time, format, ball_type, overs_per_match,
        team1_id, team2_id, scheduled_at, created_by)
     VALUES (CURRENT_DATE, '10:00', 'T20', 'leather', 20, $1, $2, now(), $3)
     RETURNING matches_id`,
    [t1, t2, fx.userId]
  );
  fx.matchId = m.rows[0].matches_id;

  const token = authService.signToken({
    user_id: fx.userId, account_role: 'Scorer', club_id: null, is_approved: true
  });
  return { token, battingTeam: t1, fieldingTeam: t2 };
}

// Open a fresh innings so each test starts from a clean slate.
async function freshInnings(token, ctx) {
  const res = await auth(
    request(app).post(`/api/scorer/matches/${fx.matchId}/initialize`), token
  ).send({
    batting_team_id: ctx.battingTeam,
    fielding_team_id: ctx.fieldingTeam,
    innings_number: 1,
    striker_id: fx.players[0],
    non_striker_id: fx.players[1],
    bowler_id: fx.players[2]
  });
  if (res.status !== 201) throw new Error(`initialize failed: ${res.status} ${JSON.stringify(res.body)}`);
  fx.inningsIds.add(res.body.innings.innings_id);
  return res.body.innings.innings_id;
}

const ballBody = (inningsId, over) => ({
  innings_id: inningsId,
  striker_id: fx.players[0],
  non_striker_id: fx.players[1],
  bowler_id: fx.players[2],
  ...over
});

async function run() {
  const ctx = await setup();
  const { token } = ctx;

  console.log('\nTest 1 — No Ball math');
  {
    const inningsId = await freshInnings(token, ctx);
    const res = await auth(request(app).post(`/api/scorer/matches/${fx.matchId}/ball`), token)
      .send(ballBody(inningsId, { runs_off_bat: 4, extra_type: 'NB', extra_runs: 0, is_wicket: false }));
    if (res.status !== 201) return bad('no-ball request', `${res.status} ${JSON.stringify(res.body)}`);
    eq('team_score_delta === 5', res.body.innings.total_runs, 5);
    eq('extras.no_balls delta === 1', res.body.innings.extras.no_balls, 1);
    eq('over did NOT advance (balls_this_over)', res.body.innings.balls_this_over, 0);
    eq('over_completed flag false', res.body.over_completed, false);
  }

  console.log('\nTest 2 — Wide math');
  {
    const inningsId = await freshInnings(token, ctx);
    const res = await auth(request(app).post(`/api/scorer/matches/${fx.matchId}/ball`), token)
      .send(ballBody(inningsId, { runs_off_bat: 0, extra_type: 'WD', extra_runs: 1, is_wicket: false }));
    if (res.status !== 201) return bad('wide request', `${res.status} ${JSON.stringify(res.body)}`);
    eq('team_score_delta === 2', res.body.innings.total_runs, 2);
    eq('batter.balls_faced unchanged (0)', res.body.striker.balls_faced, 0);
    eq('over did NOT advance (balls_this_over)', res.body.innings.balls_this_over, 0);
    eq('extras.wides === 2 (1 penalty + 1 extra)', res.body.innings.extras.wides, 2);
  }

  console.log('\nTest 3 — Legal delivery over completion');
  {
    const inningsId = await freshInnings(token, ctx);
    let last;
    for (let i = 0; i < 6; i++) {
      last = await auth(request(app).post(`/api/scorer/matches/${fx.matchId}/ball`), token)
        .send(ballBody(inningsId, { runs_off_bat: 1, extra_type: 'None', extra_runs: 0, is_wicket: false }));
      if (last.status !== 201) return bad(`ball ${i + 1}`, `${last.status} ${JSON.stringify(last.body)}`);
    }
    eq('overs_completed incremented by 1', last.body.innings.overs_completed, 1);
    eq('ball counter reset to 0', last.body.innings.balls_this_over, 0);
    eq('over_completed flag true on 6th ball', last.body.over_completed, true);
    eq('total_balls === 6', last.body.innings.total_balls, 6);
  }

  console.log('\nTest 4 — Undo integrity');
  {
    const inningsId = await freshInnings(token, ctx);
    const snapCols = `total_runs, total_wickets, total_balls, extras_wides,
                      extras_no_balls, extras_leg_byes, extras_byes,
                      extras_penalties, total_extras, status`;
    const before = (await pool.query(
      `SELECT ${snapCols} FROM innings WHERE innings_id = $1`, [inningsId]
    )).rows[0];

    const rec = await auth(request(app).post(`/api/scorer/matches/${fx.matchId}/ball`), token)
      .send(ballBody(inningsId, { runs_off_bat: 3, extra_type: 'None', extra_runs: 0, is_wicket: false }));
    if (rec.status !== 201) return bad('record before undo', `${rec.status} ${JSON.stringify(rec.body)}`);

    const undo = await auth(request(app).post(`/api/scorer/matches/${fx.matchId}/undo`), token)
      .send({ innings_id: inningsId });
    if (undo.status !== 200) return bad('undo request', `${undo.status} ${JSON.stringify(undo.body)}`);

    const after = (await pool.query(
      `SELECT ${snapCols} FROM innings WHERE innings_id = $1`, [inningsId]
    )).rows[0];
    eq('innings state byte-for-byte identical', JSON.stringify(after), JSON.stringify(before));

    const delCount = (await pool.query(
      `SELECT COUNT(*)::int AS n FROM deliveries WHERE innings_id = $1`, [inningsId]
    )).rows[0].n;
    eq('delivery row no longer exists', delCount, 0);
  }
}

async function cleanup() {
  if (!fx.matchId) return;
  const innArr = [...fx.inningsIds];
  if (innArr.length) {
    await pool.query(
      `DELETE FROM run_outs WHERE dismissal_id IN
         (SELECT dismissals_id FROM dismissals WHERE innings_id = ANY($1::uuid[]))`, [innArr]);
    await pool.query(`DELETE FROM batting_scorecards WHERE innings_id = ANY($1::uuid[])`, [innArr]);
    await pool.query(`DELETE FROM extras WHERE innings_id = ANY($1::uuid[])`, [innArr]);
    await pool.query(`DELETE FROM dismissals WHERE innings_id = ANY($1::uuid[])`, [innArr]);
    await pool.query(`DELETE FROM deliveries WHERE innings_id = ANY($1::uuid[])`, [innArr]);
    await pool.query(`DELETE FROM bowling_figures WHERE innings_id = ANY($1::uuid[])`, [innArr]);
    await pool.query(`DELETE FROM overs WHERE innings_id = ANY($1::uuid[])`, [innArr]);
  }
  await pool.query(`DELETE FROM innings WHERE match_id = $1`, [fx.matchId]);
  await pool.query(`DELETE FROM matches WHERE matches_id = $1`, [fx.matchId]);
  if (fx.userId) await pool.query(`DELETE FROM users WHERE user_id = $1`, [fx.userId]);
}

(async () => {
  try {
    await run();
  } catch (err) {
    failed++;
    console.error('\nHarness error:', err.message);
  } finally {
    try { await cleanup(); console.log('\nFixtures cleaned up.'); }
    catch (e) { console.error('Cleanup error:', e.message); }
    await pool.end();
  }
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})();
