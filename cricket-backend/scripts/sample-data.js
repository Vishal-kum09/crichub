require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    const m = await pool.query(
      'SELECT matches_id, status, team1_id, team2_id, format, overs_per_match, venue, created_by FROM matches'
    );
    console.log('MATCHES', JSON.stringify(m.rows, null, 2));

    const u = await pool.query(
      'SELECT user_id, email, account_role, is_approved, club_id, password_hash IS NOT NULL AS has_password FROM users'
    );
    console.log('USERS', JSON.stringify(u.rows, null, 2));

    const tp = await pool.query(`
      SELECT t.teams_id, t.name, count(tp.player_id)::int AS players
      FROM teams t
      LEFT JOIN team_players tp ON tp.team_id = t.teams_id
      GROUP BY t.teams_id, t.name
    `);
    console.log('TEAMS', JSON.stringify(tp.rows, null, 2));

    const samplePlayers = await pool.query(`
      SELECT p.players_id, p.display_name, t.name AS team_name
      FROM team_players tp
      JOIN players p ON p.players_id = tp.player_id
      JOIN teams t ON t.teams_id = tp.team_id
      ORDER BY t.name, p.display_name
      LIMIT 10
    `);
    console.log('SAMPLE_PLAYERS', JSON.stringify(samplePlayers.rows, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
