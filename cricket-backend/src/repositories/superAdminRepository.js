// Super-admin data-access — platform-wide (no tenant binding). Uses the main
// "club" table which stores club details with embedded admin info.
// The data-audit delete cascades a match and every child row in a single
// transaction (caller wraps withTransaction).
const { query } = require('../../db');

// ─── club directory ────────────────────────────────────────────────────────

const findAllClubs = async () => {
  const r = await query(
    `SELECT c.club_id AS id, c.club_name AS name, c.country, c.home_ground, c.is_approved,
            c.created_at,
            (SELECT count(*) FROM users u WHERE u.club_id = c.club_id)::int AS members,
            (SELECT count(*) FROM matches m
               WHERE m.created_by IN (SELECT user_id FROM users u2 WHERE u2.club_id = c.club_id)
            )::int AS matches,
            (SELECT count(*) FROM players p WHERE p.club_id = c.club_id AND p.is_active = true)::int AS "activePlayers"
       FROM club c
      ORDER BY c.created_at DESC`
  );
  return r.rows;
};

const getClub = async (clubId) => {
  const r = await query(
    `SELECT club_id AS id, club_name AS name, country, home_ground, is_approved, created_at
       FROM club WHERE club_id = $1`,
    [clubId]
  );
  return r.rows[0] || null;
};

const findClubMembers = async (clubId) => {
  const r = await query(
    `SELECT user_id AS id, display_name, first_name, last_name, email,
            account_role, is_active, is_approved
       FROM users
      WHERE club_id = $1
      ORDER BY account_role ASC, display_name ASC`,
    [clubId]
  );
  return r.rows;
};

// Pending clubs (is_approved = false). Admin info embedded in club row.
const findPendingClubs = async () => {
  const r = await query(
    `SELECT c.club_id AS id, c.club_name AS name, c.country, c.admin_email AS email,
            c.admin_first_name || ' ' || c.admin_last_name AS owner_name,
            c.admin_first_name || ' ' || c.admin_last_name AS admin_name,
            c.admin_email, c.created_at
       FROM club c WHERE c.is_approved = false
       ORDER BY c.created_at DESC`
  );
  return r.rows;
};

// Approve a club AND activate its admin(s) so they can sign in. Both updates run
// inside a transaction so they commit together.
const approveClub = async (clubId, exec = query) => {
  const r = await exec(
    `UPDATE club SET is_approved = true WHERE club_id = $1
     RETURNING club_id, club_name AS name, is_approved`,
    [clubId]
  );
  if (!r.rows[0]) return null;
  await exec(
    `UPDATE users SET is_approved = true, updated_at = now()
      WHERE club_id = $1 AND account_role = 'Club_Admin'`,
    [clubId]
  );
  return r.rows[0];
};
// ─── data-audit cascade delete ──────────────────────────────────────────────

const getMatch = async (matchId) => {
  const r = await query(`SELECT matches_id FROM matches WHERE matches_id = $1`, [matchId]);
  return r.rows[0] || null;
};

// Hard delete a match and ALL descendant rows. Order follows the FK graph
// (children before parents). Runs on the transaction client supplied by the
// service so it is atomic. Returns row counts for the audit log.
const deleteMatchCascade = async (client, matchId) => {
  const inn = `(SELECT innings_id FROM innings WHERE match_id = $1)`;
  const counts = {};

  const del = async (label, sql) => {
    const r = await client.query(sql, [matchId]);
    counts[label] = r.rowCount;
  };

  await del('run_outs',
    `DELETE FROM run_outs WHERE dismissal_id IN
       (SELECT dismissals_id FROM dismissals WHERE innings_id IN ${inn})`);
  await del('field_positions',
    `DELETE FROM field_positions WHERE field_setting_id IN
       (SELECT field_settings_id FROM field_settings WHERE innings_id IN ${inn})`);
  await del('ai_commentary', `DELETE FROM ai_commentary WHERE match_id = $1`);
  await del('pitch_map_data', `DELETE FROM pitch_map_data WHERE innings_id IN ${inn}`);
  await del('field_settings', `DELETE FROM field_settings WHERE innings_id IN ${inn}`);
  await del('batting_scorecards', `DELETE FROM batting_scorecards WHERE innings_id IN ${inn}`);
  await del('extras', `DELETE FROM extras WHERE innings_id IN ${inn}`);
  await del('dismissals', `DELETE FROM dismissals WHERE innings_id IN ${inn}`);
  await del('batter_over_stats', `DELETE FROM batter_over_stats WHERE innings_id IN ${inn}`);
  await del('bowler_over_stats', `DELETE FROM bowler_over_stats WHERE innings_id IN ${inn}`);
  await del('bowling_figures', `DELETE FROM bowling_figures WHERE innings_id IN ${inn}`);
  await del('bowling_spells', `DELETE FROM bowling_spells WHERE innings_id IN ${inn}`);
  await del('partnerships', `DELETE FROM partnerships WHERE innings_id IN ${inn}`);
  await del('fall_of_wickets', `DELETE FROM fall_of_wickets WHERE innings_id IN ${inn}`);
  await del('deliveries', `DELETE FROM deliveries WHERE innings_id IN ${inn}`);
  await del('overs', `DELETE FROM overs WHERE innings_id IN ${inn}`);
  await del('ai_commentary_settings', `DELETE FROM ai_commentary_settings WHERE match_id = $1`);
  await del('match_comments', `DELETE FROM match_comments WHERE match_id = $1`);
  await del('match_media', `DELETE FROM match_media WHERE match_id = $1`);
  await del('match_officials', `DELETE FROM match_officials WHERE match_id = $1`);
  await del('notifications', `DELETE FROM notifications WHERE match_id = $1`);
  await del('scorer_assignments', `DELETE FROM scorer_assignments WHERE match_id = $1`);
  await del('audit_logs', `DELETE FROM audit_logs WHERE match_id = $1`);
  await client.query(`UPDATE fixtures SET match_id = NULL WHERE match_id = $1`, [matchId]);
  await del('innings', `DELETE FROM innings WHERE match_id = $1`);
  await del('matches', `DELETE FROM matches WHERE matches_id = $1`);
  return counts;
};

const getPlatformStats = async (exec = query) => {
  const r = await exec(`
    SELECT
      (SELECT count(*) FROM clubs WHERE is_approved = true)::int AS "totalClubs",
      (SELECT count(*) FROM matches)::int AS "totalMatches",
      (SELECT count(*) FROM users)::int AS "totalUsers",
      (SELECT count(*) FROM tournaments)::int AS "totalTournaments",
      (SELECT count(*) FROM players)::int AS "totalPlayers"
  `);
  return r.rows[0];
};

const rejectClub = async (clubId, exec = query) => {
  const r = await exec(
    `DELETE FROM club WHERE club_id = $1 AND is_approved = false RETURNING club_id, club_name AS name`,
    [clubId]
  );
  return r.rows[0] || null;
};

const deleteClub = async (clubId, exec = query) => {
  const r = await exec(
    `DELETE FROM club WHERE club_id = $1 RETURNING club_id, club_name AS name`,
    [clubId]
  );
  return r.rows[0] || null;
};

module.exports = {
  findAllClubs,
  getClub,
  findClubMembers,
  findPendingClubs,
  approveClub,
  getPlatformStats,
  rejectClub,
  deleteClub,
  getMatch,
  deleteMatchCascade
};
