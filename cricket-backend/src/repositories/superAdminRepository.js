// Super-admin data-access — platform-wide (no tenant binding). Club ownership of
// matches is derived through matches.created_by ∈ (users of the club), since the
// live schema has no club_id on matches. The data-audit delete cascades a match
// and every child row in a single transaction (caller wraps withTransaction).
const { query } = require('../../db');

// ─── clubs directory ────────────────────────────────────────────────────────

const findAllClubs = async () => {
  const r = await query(
    `SELECT c.clubs_id AS id, c.name, c.country, c.home_ground, c.is_approved,
            c.created_at,
            (SELECT count(*) FROM users u WHERE u.club_id = c.clubs_id)::int AS members,
            (SELECT count(*) FROM matches m
               WHERE m.created_by IN (SELECT user_id FROM users u2 WHERE u2.club_id = c.clubs_id)
            )::int AS matches
       FROM clubs c
      ORDER BY c.created_at DESC`
  );
  return r.rows;
};

const getClub = async (clubId) => {
  const r = await query(
    `SELECT clubs_id, name, country, home_ground, is_approved, created_at
       FROM clubs WHERE clubs_id = $1`,
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

// Pending clubs (is_approved = false), with their Club_Admin contact.
const findPendingClubs = async () => {
  const r = await query(
    `SELECT c.clubs_id AS id, c.name, c.country, c.email, c.owner_name, c.created_at,
            au.display_name AS admin_name, au.email AS admin_email
       FROM clubs c
       LEFT JOIN LATERAL (
         SELECT display_name, email FROM users
          WHERE club_id = c.clubs_id AND account_role = 'Club_Admin'
          ORDER BY created_at ASC LIMIT 1
       ) au ON true
      WHERE c.is_approved = false
      ORDER BY c.created_at DESC`
  );
  return r.rows;
};

// Approve a club AND activate its admin(s) so they can sign in. Both updates run
// on the supplied executor (a transaction client from the service) so they
// commit together — never an approved club with still-locked admins.
const approveClub = async (clubId, exec = query) => {
  const r = await exec(
    `UPDATE clubs SET is_approved = true WHERE clubs_id = $1
     RETURNING clubs_id, name, is_approved`,
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

  // dismissal children
  await del('run_outs',
    `DELETE FROM run_outs WHERE dismissal_id IN
       (SELECT dismissals_id FROM dismissals WHERE innings_id IN ${inn})`);
  await del('field_positions',
    `DELETE FROM field_positions WHERE field_setting_id IN
       (SELECT field_settings_id FROM field_settings WHERE innings_id IN ${inn})`);

  // delivery / innings children
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

  // match children
  await del('ai_commentary_settings', `DELETE FROM ai_commentary_settings WHERE match_id = $1`);
  await del('match_comments', `DELETE FROM match_comments WHERE match_id = $1`);
  await del('match_media', `DELETE FROM match_media WHERE match_id = $1`);
  await del('match_officials', `DELETE FROM match_officials WHERE match_id = $1`);
  await del('notifications', `DELETE FROM notifications WHERE match_id = $1`);
  await del('scorer_assignments', `DELETE FROM scorer_assignments WHERE match_id = $1`);
  await del('audit_logs', `DELETE FROM audit_logs WHERE match_id = $1`);

  // fixtures keep their tournament slot but lose the match link
  await client.query(`UPDATE fixtures SET match_id = NULL WHERE match_id = $1`, [matchId]);

  // finally the innings then the match itself
  await del('innings', `DELETE FROM innings WHERE match_id = $1`);
  await del('matches', `DELETE FROM matches WHERE matches_id = $1`);

  return counts;
};

module.exports = {
  findAllClubs,
  getClub,
  findClubMembers,
  findPendingClubs,
  approveClub,
  getMatch,
  deleteMatchCascade
};
