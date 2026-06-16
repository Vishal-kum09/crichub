require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const BASE = process.env.API_BASE || 'http://localhost:3000';
const MATCH_ID = '00000000-0000-4000-8000-000000001b5b';
const TEAM1 = '00000000-0000-4000-8000-000000000065';
const TEAM2 = '00000000-0000-4000-8000-000000000066';
const STRIKER = '00000000-0000-4000-8000-0000000003e8';
const NON_STRIKER = '00000000-0000-4000-8000-0000000003e9';
const BOWLER = '00000000-0000-4000-8000-0000000003ee';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

const api = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

(async () => {
  const email = `scorer.post.${Date.now()}@crickethub.test`;
  const password = 'ScorerPass123!';
  const hash = await bcrypt.hash(password, 12);

  const userRes = await pool.query(
    `INSERT INTO users (email, first_name, last_name, display_name, password_hash, account_role, role, is_approved, is_active)
     VALUES ($1,'Post','Scorer','Post Scorer',$2,'Scorer'::account_role,'scorer'::platform_role,true,true)
     RETURNING user_id`,
    [email, hash]
  );
  const scorerId = userRes.rows[0].user_id;

  await pool.query(
    `INSERT INTO scorer_assignments (match_id, scorer_id, assigned_by)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [MATCH_ID, scorerId, scorerId]
  );

  const login = await api('POST', '/api/auth/login', { email, password });
  console.log('login', login.status, login.data.user);
  const token = login.data.token;

  const init = await api('POST', `/api/scorer/matches/${MATCH_ID}/initialize`, {
    batting_team_id: TEAM1,
    fielding_team_id: TEAM2,
    innings_number: 1,
    striker_id: STRIKER,
    non_striker_id: NON_STRIKER,
    bowler_id: BOWLER
  }, token);
  console.log('initialize', init.status, init.data?.innings || init.data);

  if (init.status !== 201) {
    await pool.end();
    return;
  }

  const inningsId = init.data.innings.innings_id;
  const ball = await api('POST', `/api/scorer/matches/${MATCH_ID}/ball`, {
    innings_id: inningsId,
    runs_off_bat: 1,
    extra_type: 'None',
    extra_runs: 0,
    is_wicket: false
  }, token);
  console.log('ball', ball.status, ball.data?.delivery || ball.data);

  const assigned = await api('GET', '/api/scorer/matches/assigned', null, token);
  console.log('assigned', assigned.status, assigned.data);

  await pool.end();
})();
