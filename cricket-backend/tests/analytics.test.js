// Analytics tests — role gating + input validation. The analyst repository is
// mocked; the real route/controller (Zod) stack runs.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../db', () => ({
  withTransaction: (cb) => cb({ query: async () => ({ rows: [] }) }),
  query: async () => ({ rows: [] }),
  pool: { query: async () => ({ rows: [] }), on: () => {} },
  testConnection: async () => {}
}));
jest.mock('../src/repositories/analystRepository', () => ({
  teamAggregations: jest.fn(),
  playerAggregations: jest.fn(),
  tournamentAggregations: jest.fn(),
  matchAggregations: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const repo = require('../src/repositories/analystRepository');
const analystRoutes = require('../src/routes/analystRoutes');
const { errorHandler } = require('../src/middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/analyst', analystRoutes);
app.use(errorHandler);

const tokenFor = (role) => jwt.sign(
  { user_id: `u-${role}`, role, club_id: null, is_approved: true },
  process.env.JWT_SECRET
);
const TEAM = '/api/analyst/nvplay-streams/team';

// Reset call history between tests (keeps mockResolvedValue set within a test).
beforeEach(() => jest.clearAllMocks());

describe('Analytics', () => {
  test('Test 1 — Analyst role → 200 with data array', async () => {
    repo.teamAggregations.mockResolvedValue({
      run_rate_by_over: [{ over_number: 1, avg_runs: 6.5 }],
      boundary_breakdown: { fours_count: 10, sixes_count: 2, boundary_pct: 12.5 },
      partnership_maps: [],
      bowling_economy_by_phase: { powerplay: 6, middle: 7, death: 9 },
      top_scorers: [{ player_name: 'X', runs: 50, innings: 1 }],
      top_wicket_takers: []
    });
    const res = await request(app).get(TEAM).set('Authorization', `Bearer ${tokenFor('Analyst')}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.top_scorers)).toBe(true);
    expect(res.body.top_scorers.length).toBeGreaterThan(0);
  });

  test('Test 2 — Scorer role → analyst endpoint → 403', async () => {
    const res = await request(app).get(TEAM).set('Authorization', `Bearer ${tokenFor('Scorer')}`);
    expect(res.status).toBe(403);
  });

  test('Test 3 — Player role → analyst endpoint → 403', async () => {
    const res = await request(app).get(TEAM).set('Authorization', `Bearer ${tokenFor('Player')}`);
    expect(res.status).toBe(403);
  });

  test('Test 4 — SQL injection via filter param → 400 not DB error', async () => {
    // over_min is a coerced integer; a malicious string fails Zod → 400 before
    // any query runs. String filters are parameterized, so this typed field is
    // the meaningful injection surface.
    const res = await request(app)
      .get(TEAM)
      .query({ over_min: "1); DROP TABLE nv_play;--" })
      .set('Authorization', `Bearer ${tokenFor('Analyst')}`);
    expect(res.status).toBe(400);
    expect(repo.teamAggregations).not.toHaveBeenCalled();
  });
});
