// Club-admin data-access. TENANT ISOLATION is non-negotiable: every query is
// bound to the admin's JWT club_id ($1), never a client-supplied value. 
// Fully refactored to align with the new independent 'club' entity table framework.
const { query } = require('../../db');

// ─── approvals (users.is_approved is the approval flag) ─────────────────────

const findPendingApprovals = async (clubId) => {
  const r = await query(
    `SELECT user_id, display_name, first_name, last_name, email, phone,
            account_role, created_at
       FROM users
      WHERE club_id = $1 AND is_approved = false AND is_active = true
      ORDER BY created_at ASC`,
    [clubId]
  );
  return r.rows;
};

// Minimal row used to enforce tenant ownership before any mutation.
const getUserTenant = async (userId) => {
  const r = await query(
    `SELECT user_id, club_id, account_role, is_approved FROM users WHERE user_id = $1`,
    [userId]
  );
  return r.rows[0] || null;
};

// Approve: flip is_approved and assign the role. club_id is re-bound in the
// WHERE clause as a second line of tenant defence.
const approveUser = async (userId, clubId, accountRole, platformRole) => {
  const r = await query(
    `UPDATE users
        SET is_approved = true,
            is_active = true,
            account_role = $3::account_role,
            role = $4::platform_role,
            updated_at = now()
      WHERE user_id = $1 AND club_id = $2
      RETURNING user_id, display_name, email, account_role, is_approved`,
    [userId, clubId, accountRole, platformRole]
  );
  return r.rows[0] || null;
};

// Reject: keep the row but deactivate so it leaves the pending queue.
const rejectUser = async (userId, clubId) => {
  const r = await query(
    `UPDATE users
        SET is_approved = false, is_active = false, updated_at = now()
      WHERE user_id = $1 AND club_id = $2
      RETURNING user_id, display_name, email, account_role, is_approved`,
    [userId, clubId]
  );
  return r.rows[0] || null;
};

// ─── teams owned by the club (resolved via creator's club) ──────────────────

const findClubTeam = async (clubId, excludeTeamId = null) => {
  const r = await query(
    `SELECT teams_id, name, short_name FROM teams
      WHERE created_by IN (SELECT user_id FROM users WHERE club_id = $1)
        AND is_active = true
        AND ($2::uuid IS NULL OR teams_id <> $2)
      ORDER BY created_at ASC
      LIMIT 1`,
    [clubId, excludeTeamId]
  );
  return r.rows[0] || null;
};

const teamExists = async (teamId) => {
  const r = await query(`SELECT teams_id FROM teams WHERE teams_id = $1`, [teamId]);
  return r.rows[0] || null;
};

// ─── 🔥 MATCH CREATION (SNAPSHOT COLUMN SYNCHRONIZATION) ─────────────────────

const insertMatch = async (m) => {
  const r = await query(
    `INSERT INTO matches
       (match_date, start_time, format, ball_type, overs_per_match,
        host_club_id, opponent_club_id, venue, scheduled_at, status, is_public, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3::match_format, $4, $5, $6, $7, $8, $9, $10::match_status, $11, $12, $13, NOW(), NOW())
     RETURNING matches_id, status, scheduled_at, venue, overs_per_match,
               team1_id, team2_id, notes, created_by`,
    [
      m.match_date, m.start_time, m.format, m.ball_type, m.overs_per_match,
      m.host_club_id, m.opponent_club_id, m.venue, m.scheduled_at, m.status, m.is_public,
      m.notes, m.created_by
    ]
  );
  return r.rows[0];
};

// ─── tournament creation ────────────────────────────────────────────────────

const insertTournament = async (t, exec = query) => {
  const r = await exec(
    `INSERT INTO tournaments
       (name, format, match_format, no_of_overs_match, start_date, end_date,
        host_team, created_by)
     VALUES ($1,$2::tournament_format,$3::match_format,$4,$5,$6,$7,$8)
     RETURNING tournaments_id, name, format, match_format, no_of_overs_match,
               start_date, end_date, status, created_by, created_at`,
    [
      t.name, t.format, t.match_format, t.no_of_overs_match, t.start_date,
      t.end_date, t.host_team, t.created_by
    ]
  );
  return r.rows[0];
};

const insertTournamentTeam = async (tournamentId, teamId, exec = query) => {
  const r = await exec(
    `INSERT INTO tournament_teams (tournament_id, team_id, seed)
     VALUES ($1,$2,1)
     RETURNING tournament_teams_id, tournament_id, team_id`,
    [tournamentId, teamId]
  );
  return r.rows[0];
};

// ─── 🔥 ROSTER MATCHES FETCH (MAPPED DIRECTLY TO FRESH INDEPENDENT CLUB JOINS) ───

// ─── 🔥 ROSTER MATCHES FETCH (MAPPED DIRECTLY TO DB COLUMNS) ───
const findClubMatches = async (clubId) => {
  const r = await query(
    `SELECT 
        m.matches_id AS id, 
        m.match_date, 
        m.scheduled_at, 
        m.venue, 
        m.status,
        m.overs_per_match, 
        m.notes,
        (SELECT CONCAT(i.total_runs, '/', i.total_wickets,
                ' (', FLOOR(i.total_balls / 6), '.', i.total_balls % 6, ' Ov)')
           FROM innings i
          WHERE i.match_id = m.matches_id AND i.innings_number = 1
          LIMIT 1) AS team1_score,
        (SELECT CONCAT(i.total_runs, '/', i.total_wickets,
                ' (', FLOOR(i.total_balls / 6), '.', i.total_balls % 6, ' Ov)')
           FROM innings i
          WHERE i.match_id = m.matches_id AND i.innings_number = 2
          LIMIT 1) AS team2_score,
        (SELECT CONCAT(i.total_runs, '/', i.total_wickets,
                ' (', FLOOR(i.total_balls / 6), '.', i.total_balls % 6, ' Ov)')
           FROM innings i
          WHERE i.match_id = m.matches_id
          ORDER BY i.innings_number DESC
          LIMIT 1) AS live_score,
        CASE 
          WHEN m.host_club_id = $1 THEN COALESCE(oc.club_name, 'Internal Local Match')
          ELSE hc.club_name
        END AS opponent
       FROM matches m
       LEFT JOIN club hc ON hc.club_id = m.host_club_id
       LEFT JOIN club oc ON oc.club_id = m.opponent_club_id
      WHERE m.host_club_id = $1 OR m.opponent_club_id = $1
      ORDER BY m.scheduled_at DESC`,
    [clubId]
  );
  return r.rows;
};

// Roster members of a given account_role (Player / Scorer / …) for the club.
const findClubMembersByRole = async (clubId, accountRole) => {
  const r = await query(
    `SELECT user_id AS id, display_name, first_name, last_name, email,
            account_role, is_active, is_approved
       FROM users
      WHERE club_id = $1 AND account_role = $2::account_role
      ORDER BY display_name ASC`,
    [clubId, accountRole]
  );
  return r.rows;
};

const getClubName = async (clubId) => {
  const r = await query(`SELECT club_name AS name FROM club WHERE club_id = $1`, [clubId]);
  return r.rows[0] ? r.rows[0].name : null;
};

const findClubTeams = async (clubId) => {
  const r = await query(
    `SELECT t.teams_id AS id, t.name, t.short_name, t.home_ground,
            (SELECT COUNT(*)::int FROM team_players tp
               WHERE tp.team_id = t.teams_id AND tp.left_at IS NULL) AS player_count
       FROM teams t
      WHERE t.created_by IN (SELECT user_id FROM users WHERE club_id = $1)
        AND t.is_active = true
      ORDER BY t.created_at ASC`,
    [clubId]
  );
  return r.rows;
};

const insertTeam = async (t) => {
  const r = await query(
    `INSERT INTO teams (name, short_name, home_ground, country, created_by)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING teams_id AS id, name, short_name, home_ground, country`,
    [t.name, t.short_name, t.home_ground || null, t.country || null, t.created_by]
  );
  return r.rows[0];
};

const insertScorerAssignment = async (p) => {
  const r = await query(
    `INSERT INTO scorer_assignments (match_id, scorer_id, assigned_by)
     VALUES ($1,$2,$3)
     RETURNING scorer_assignments_id, match_id, scorer_id, created_at`,
    [p.match_id, p.scorer_id, p.assigned_by]
  );
  return r.rows[0];
};

const matchBelongsToClub = async (matchId, clubId) => {
  const r = await query(
    `SELECT m.matches_id
       FROM matches m
      WHERE m.matches_id = $1
        AND (m.host_club_id = $2 OR m.opponent_club_id = $2)`,
    [matchId, clubId]
  );
  return !!r.rows[0];
};

const scorerBelongsToClub = async (scorerId, clubId) => {
  const r = await query(
    `SELECT user_id FROM users
      WHERE user_id = $1 AND club_id = $2 AND account_role = 'Scorer'::account_role`,
    [scorerId, clubId]
  );
  return !!r.rows[0];
};

module.exports = {
  findPendingApprovals,
  getUserTenant,
  approveUser,
  rejectUser,
  findClubTeam,
  teamExists,
  insertMatch,
  insertTournament,
  insertTournamentTeam,
  findClubMatches,
  findClubMembersByRole,
  getClubName,
  findClubTeams,
  insertTeam,
  insertScorerAssignment,
  matchBelongsToClub,
  scorerBelongsToClub
};
