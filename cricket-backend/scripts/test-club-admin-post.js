require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const BASE = process.env.API_BASE || 'http://localhost:3000';

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
  const stamp = Date.now();
  const email = `clubadmin.post.${stamp}@crickethub.test`;
  const password = 'ClubAdmin123!';
  const hash = await bcrypt.hash(password, 12);

  const club = await pool.query(
    `INSERT INTO clubs (name, country, is_approved) VALUES ($1,'England',true) RETURNING clubs_id`,
    [`Post Test Club ${stamp}`]
  );
  const clubId = club.rows[0].clubs_id;

  const userRes = await pool.query(
    `INSERT INTO users (email, first_name, last_name, display_name, password_hash, club_id, account_role, role, is_approved, is_active)
     VALUES ($1,'Club','Admin','Club Admin',$2,$3,'Club_Admin'::account_role,'admin'::platform_role,true,true)
     RETURNING user_id`,
    [email, hash, clubId]
  );
  const adminId = userRes.rows[0].user_id;

  // No team created for this club admin
  const login = await api('POST', '/api/auth/login', { email, password });
  const token = login.data.token;

  const noTeam = await api('POST', '/api/club-admin/matches', {
    match_type: 'local',
    venue: 'Test Ground',
    scheduled_at: new Date().toISOString(),
    total_overs: 20
  }, token);
  console.log('create match without teams', noTeam.status, noTeam.data);

  const team = await pool.query(
    `INSERT INTO teams (name, short_name, created_by) VALUES ('Alpha XI','AXI',$1) RETURNING teams_id`,
    [adminId]
  );
  const team1 = team.rows[0].teams_id;

  const team2Res = await pool.query(
    `INSERT INTO teams (name, short_name, created_by) VALUES ('Beta XI','BXI',$1) RETURNING teams_id`,
    [adminId]
  );
  const team2 = team2Res.rows[0].teams_id;

  const withTeams = await api('POST', '/api/club-admin/matches', {
    match_type: 'local',
    venue: 'Test Ground',
    scheduled_at: new Date().toISOString(),
    total_overs: 20,
    team1_id: team1,
    team2_id: team2
  }, token);
  console.log('create match with teams', withTeams.status, withTeams.data);

  await pool.end();
})();
