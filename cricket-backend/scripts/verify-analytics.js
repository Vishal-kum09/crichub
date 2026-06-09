// Verification harness for the player stats + analyst analytics layer. Builds an
// isolated express app (json + player/analyst routers + errorHandler), signs
// role JWTs, and drives the real endpoints against the live DB. Player fixtures
// are torn down; analyst endpoints are read-only over nv_play.
//
//   node scripts/verify-analytics.js
require('dotenv').config();

const express = require('express');
const request = require('supertest');

const { pool } = require('../db');
const authService = require('../src/services/authService');
const { errorHandler } = require('../src/middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/player', require('../src/routes/playerRoutes'));
app.use('/api/analyst', require('../src/routes/analystRoutes'));
app.use(errorHandler);

let passed = 0, failed = 0;
const ok = (l) => { passed++; console.log(`  ✓ ${l}`); };
const bad = (l, d) => { failed++; console.log(`  ✗ ${l} -> ${d}`); };
const eq = (l, a, e) => { a === e ? ok(`${l} (= ${JSON.stringify(a)})`) : bad(l, `expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); };
const truthy = (l, v) => { v ? ok(l) : bad(l, `got ${JSON.stringify(v)}`); };
const auth = (req, token) => req.set('Authorization', `Bearer ${token}`);

const fx = { users: [] };
const mkUser = async (display, role) => {
  const r = await pool.query(
    `INSERT INTO users (email, first_name, last_name, display_name, role, account_role, is_approved, is_active)
     VALUES ($1,'T','U',$2,'viewer'::platform_role,$3::account_role,true,true) RETURNING user_id`,
    [`an-${Date.now()}-${Math.floor(passed + failed + Math.abs(display.length))}@e.com`, display, role]
  );
  fx.users.push(r.rows[0].user_id);
  return r.rows[0].user_id;
};
const tok = (uid, role) => authService.signToken({ user_id: uid, account_role: role, club_id: null, is_approved: true });

async function run() {
  // ── Player: real (identity match) ──
  console.log('\nPlayer — real player via D-010 identity match');
  {
    const uid = await mkUser('Hiro Tanaka', 'Player'); // matches a seeded player with batting + bowling
    const res = await auth(request(app).get('/api/player/my-performances'), tok(uid, 'Player'));
    eq('status 200', res.status, 200);
    eq('resolved=true (identity matched)', res.body.resolved, true);
    truthy('batting.total_runs > 0', res.body.batting.total_runs > 0);
    truthy('batting.innings_batted >= 1', res.body.batting.innings_batted >= 1);
    truthy('batting has all required keys', ['total_runs','balls_faced','fours','sixes','fifties','hundreds','double_hundreds','strike_rate','batting_average','matches_played','innings_batted','highest_score','dot_balls_faced'].every(k => k in res.body.batting));
    truthy('bowling.wickets > 0', res.body.bowling.wickets > 0);
    truthy('best_bowling_figures looks like W/R', /^\d+\/\d+$/.test(res.body.bowling.best_bowling_figures));
    truthy('bowling has all required keys', ['overs_bowled','maidens','runs_conceded','wickets','dot_balls','economy_rate','bowling_average','three_fers','five_fers','matches_bowled','best_bowling_figures'].every(k => k in res.body.bowling));
  }

  // ── Player: no match → zeros, not 404 ──
  console.log('\nPlayer — no matching player returns zeros (not 404)');
  {
    const uid = await mkUser('Zzz Nonexistent Player 99', 'Player');
    const res = await auth(request(app).get('/api/player/my-performances'), tok(uid, 'Player'));
    eq('status 200 (not 404)', res.status, 200);
    eq('resolved=false', res.body.resolved, false);
    eq('batting.total_runs === 0', res.body.batting.total_runs, 0);
    eq('bowling.wickets === 0', res.body.bowling.wickets, 0);
    eq('best_bowling_figures = 0/0', res.body.bowling.best_bowling_figures, '0/0');
  }

  // Real filter values from nv_play.
  const sample = (await pool.query(
    `SELECT batter_id, venue, competition FROM nv_play
      WHERE batter_id IS NOT NULL AND venue IS NOT NULL LIMIT 1`
  )).rows[0];
  const analystTok = tok(await mkUser('Analyst User', 'Analyst'), 'Analyst');

  // ── Analyst: team ──
  console.log('\nAnalyst — team aggregations');
  {
    const res = await auth(request(app).get('/api/analyst/nvplay-streams/team'), analystTok);
    eq('status 200', res.status, 200);
    truthy('has all 6 sections', ['run_rate_by_over','boundary_breakdown','partnership_maps','bowling_economy_by_phase','top_scorers','top_wicket_takers'].every(k => k in res.body));
    truthy('run_rate_by_over non-empty', res.body.run_rate_by_over.length > 0);
    truthy('top_scorers non-empty', res.body.top_scorers.length > 0);
    truthy('economy_by_phase has powerplay/middle/death', ['powerplay','middle','death'].every(k => k in res.body.bowling_economy_by_phase));
  }

  // ── Analyst: player (with batter_id filter) ──
  console.log('\nAnalyst — player aggregations (batter_id filter)');
  {
    const res = await auth(request(app).get('/api/analyst/nvplay-streams/player').query({ batter_id: sample.batter_id }), analystTok);
    eq('status 200', res.status, 200);
    truthy('has all 5 sections', ['strike_rate_by_phase','dot_ball_index','dismissal_patterns','head_to_head','recent_form'].every(k => k in res.body));
    truthy('recent_form <= 5 innings', res.body.recent_form.length <= 5);
    truthy('strike_rate_by_phase shaped', ['powerplay','middle','death'].every(k => k in res.body.strike_rate_by_phase));
  }

  // ── Analyst: tournament ──
  console.log('\nAnalyst — tournament aggregations');
  {
    const res = await auth(request(app).get('/api/analyst/nvplay-streams/tournament'), analystTok);
    eq('status 200', res.status, 200);
    truthy('has all 4 sections', ['points_table','top_scorers','top_wicket_takers','venue_stats'].every(k => k in res.body));
    truthy('points_table non-empty', res.body.points_table.length > 0);
    truthy('points_table rows have team/played/won/points/nrr', res.body.points_table.every(r => 'team' in r && 'played' in r && 'won' in r && 'points' in r && 'nrr' in r));
    truthy('venue_stats non-empty', res.body.venue_stats.length > 0);
  }

  // ── Analyst: match ──
  console.log('\nAnalyst — match aggregations');
  {
    const res = await auth(request(app).get('/api/analyst/nvplay-streams/match'), analystTok);
    eq('status 200', res.status, 200);
    truthy('has expected sections', ['run_rate_by_over','wicket_timeline','extras_breakdown','boundary_breakdown','innings_totals'].every(k => k in res.body));
    // wicket_timeline must be non-decreasing (cumulative).
    const wt = res.body.wicket_timeline.map(r => r.wickets);
    truthy('wicket_timeline is cumulative (non-decreasing)', wt.every((v, i) => i === 0 || v >= wt[i - 1]));
  }

  // ── Analyst: dynamic WHERE actually filters ──
  console.log('\nAnalyst — dynamic WHERE builder');
  {
    const unfiltered = await auth(request(app).get('/api/analyst/nvplay-streams/team'), analystTok);
    const impossible = await auth(request(app).get('/api/analyst/nvplay-streams/team').query({ venue: '__NO_SUCH_VENUE__' }), analystTok);
    truthy('unfiltered has scorers', unfiltered.body.top_scorers.length > 0);
    eq('impossible venue → empty top_scorers', impossible.body.top_scorers.length, 0);
    eq('impossible venue → zero boundaries', impossible.body.boundary_breakdown.fours_count, 0);

    const venueFiltered = await auth(request(app).get('/api/analyst/nvplay-streams/tournament').query({ venue: sample.venue }), analystTok);
    truthy('venue filter returns only that venue', venueFiltered.body.venue_stats.every(v => v.venue === sample.venue));
  }
}

async function cleanup() {
  if (fx.users.length) await pool.query(`DELETE FROM users WHERE user_id = ANY($1::uuid[])`, [fx.users]);
}

(async () => {
  try { await run(); }
  catch (err) { failed++; console.error('\nHarness error:', err.message, err.stack); }
  finally { await cleanup(); console.log('\nFixtures cleaned up.'); await pool.end(); }
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})();
