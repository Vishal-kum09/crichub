// Scorer engine tests — supertest against the real scorer route stack, with the
// repository mocked by an in-memory store (helpers/scorerStore). This exercises
// the real ScoringEngine math/over/undo logic without a live database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../db', () => ({
  withTransaction: (cb) => cb({ query: async () => ({ rows: [] }) }),
  query: async () => ({ rows: [] }),
  pool: { query: async () => ({ rows: [] }), on: () => {} },
  testConnection: async () => {}
}));
jest.mock('../src/repositories/scorerRepository', () => require('./helpers/scorerStore'));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const store = require('./helpers/scorerStore');
const scorerRoutes = require('../src/routes/scorerRoutes');
const { errorHandler } = require('../src/middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/scorer', scorerRoutes);
app.use(errorHandler);

const token = jwt.sign(
  { user_id: 'u-scorer', role: 'Scorer', club_id: null, is_approved: true },
  process.env.JWT_SECRET
);
const auth = (req) => req.set('Authorization', `Bearer ${token}`);
const { MATCH_ID: MATCH, INNINGS_ID: INN } = store.__ids;
const ids = {
  striker_id: '00000000-0000-4000-8000-0000000000c1',
  non_striker_id: '00000000-0000-4000-8000-0000000000c2',
  bowler_id: '00000000-0000-4000-8000-0000000000c3'
};
const ball = (body) =>
  auth(request(app).post(`/api/scorer/matches/${MATCH}/ball`)).send({ innings_id: INN, ...ids, ...body });

beforeEach(() => store.__reset());

describe('Scorer engine', () => {
  test('Test 1 — No Ball: team_score_delta=5, extras_delta=1, over_advanced=false', async () => {
    const res = await ball({ runs_off_bat: 4, extra_type: 'NB', extra_runs: 0, is_wicket: false });
    expect(res.status).toBe(201);
    expect(res.body.innings.total_runs).toBe(5);
    expect(res.body.innings.extras.no_balls).toBe(1);
    expect(res.body.innings.balls_this_over).toBe(0); // over did not advance
    expect(res.body.over_completed).toBe(false);
  });

  test('Test 2 — Wide: batter_balls_unchanged, over_advanced=false', async () => {
    const res = await ball({ runs_off_bat: 0, extra_type: 'WD', extra_runs: 1, is_wicket: false });
    expect(res.status).toBe(201);
    expect(res.body.striker.balls_faced).toBe(0); // batter did not face it
    expect(res.body.innings.balls_this_over).toBe(0); // over did not advance
    expect(res.body.innings.total_runs).toBe(2); // 1 penalty + 1 extra
  });

  test('Test 3 — Legal ball 6: overs_completed increments, ball counter resets', async () => {
    let res;
    for (let i = 0; i < 6; i++) {
      res = await ball({ runs_off_bat: 1, extra_type: 'None', extra_runs: 0, is_wicket: false });
      expect(res.status).toBe(201);
    }
    expect(res.body.innings.overs_completed).toBe(1);
    expect(res.body.innings.balls_this_over).toBe(0);
    expect(res.body.over_completed).toBe(true);
  });

  test('Test 4 — Undo: state byte-for-byte identical after undo', async () => {
    const before = JSON.stringify(store.__state().innings);

    const rec = await ball({ runs_off_bat: 3, extra_type: 'None', extra_runs: 0, is_wicket: false });
    expect(rec.status).toBe(201);
    expect(store.__state().innings.total_runs).toBe(3);

    const undo = await auth(request(app).post(`/api/scorer/matches/${MATCH}/undo`)).send({ innings_id: INN });
    expect(undo.status).toBe(200);

    // Innings totals restored exactly, and the delivery row is gone.
    expect(JSON.stringify(store.__state().innings)).toBe(before);
    expect(store.__state().deliveries.filter((d) => !d.deleted).length).toBe(0);
  });
});
