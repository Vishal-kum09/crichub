const { query } = require('../../db');

const findClubRecentMatches = async (clubId, limit = 20) => {
  const r = await query(
    `SELECT m.matches_id AS id,
            m.match_date,
            m.scheduled_at,
            m.venue,
            m.status,
            m.format,
            hc.club_name AS host_club,
            oc.club_name AS opponent_club,
            (SELECT CONCAT(i.total_runs, '/', i.total_wickets)
               FROM innings i
              WHERE i.match_id = m.matches_id AND i.innings_number = 1
              LIMIT 1) AS team1_score,
            (SELECT CONCAT(i.total_runs, '/', i.total_wickets)
               FROM innings i
              WHERE i.match_id = m.matches_id AND i.innings_number = 2
              LIMIT 1) AS team2_score
       FROM matches m
       LEFT JOIN club hc ON hc.club_id = m.host_club_id
       LEFT JOIN club oc ON oc.club_id = m.opponent_club_id
      WHERE (m.host_club_id = $1 OR m.opponent_club_id = $1)
        AND m.status IN ('completed', 'live')
      ORDER BY COALESCE(m.completed_at, m.started_at, m.scheduled_at) DESC
      LIMIT $2`,
    [clubId, limit]
  );
  return r.rows;
};

const findActiveClubPlayers = async (clubId) => {
  const r = await query(
    `SELECT players_id AS id,
            COALESCE(display_name, full_name) AS name,
            primary_role AS role
       FROM players
      WHERE club_id = $1 AND is_active = true
      ORDER BY name ASC`,
    [clubId]
  );
  return r.rows;
};

const playerBelongsToClub = async (clubId, playerId) => {
  const r = await query(
    `SELECT players_id FROM players
      WHERE players_id = $2 AND club_id = $1 AND is_active = true`,
    [clubId, playerId]
  );
  return !!r.rows[0];
};

const matchBelongsToClub = async (clubId, matchId) => {
  const r = await query(
    `SELECT matches_id FROM matches
      WHERE matches_id = $2
        AND (host_club_id = $1 OR opponent_club_id = $1)`,
    [clubId, matchId]
  );
  return !!r.rows[0];
};

const getMatchSummary = async (matchId) => {
  const r = await query(
    `SELECT m.matches_id, m.match_date, m.venue, m.format, m.status, m.notes,
            hc.club_name AS host_club, oc.club_name AS opponent_club
       FROM matches m
       LEFT JOIN club hc ON hc.club_id = m.host_club_id
       LEFT JOIN club oc ON oc.club_id = m.opponent_club_id
      WHERE m.matches_id = $1`,
    [matchId]
  );
  return r.rows[0] || null;
};

const getMatchManhattan = async (matchId) => {
  const r = await query(
    `SELECT i.innings_number,
            d.over_number,
            SUM(d.runs_total)::int AS runs,
            COUNT(*) FILTER (WHERE d.is_wicket)::int AS wickets
       FROM deliveries d
       JOIN innings i ON i.innings_id = d.innings_id
      WHERE i.match_id = $1
      GROUP BY i.innings_number, d.over_number
      ORDER BY i.innings_number, d.over_number`,
    [matchId]
  );
  return r.rows;
};

const getMatchRunRate = async (matchId) => {
  const r = await query(
    `SELECT i.innings_number,
            d.over_number,
            ROUND(
              SUM(SUM(d.runs_total)) OVER (
                PARTITION BY i.innings_number ORDER BY d.over_number
              )::numeric / NULLIF(d.over_number, 0), 2
            )::float8 AS run_rate
       FROM deliveries d
       JOIN innings i ON i.innings_id = d.innings_id
      WHERE i.match_id = $1
      GROUP BY i.innings_number, d.over_number
      ORDER BY i.innings_number, d.over_number`,
    [matchId]
  );
  return r.rows;
};

const getMatchExtras = async (matchId) => {
  const r = await query(
    `SELECT COALESCE(SUM(i.extras_wides), 0)::int AS wides,
            COALESCE(SUM(i.extras_no_balls), 0)::int AS no_balls,
            COALESCE(SUM(i.extras_byes), 0)::int AS byes,
            COALESCE(SUM(i.extras_leg_byes), 0)::int AS leg_byes,
            COALESCE(SUM(i.total_extras), 0)::int AS total
       FROM innings i
      WHERE i.match_id = $1`,
    [matchId]
  );
  return r.rows[0] || { wides: 0, no_balls: 0, byes: 0, leg_byes: 0, total: 0 };
};

const getMatchTopPerformers = async (matchId) => {
  const r = await query(
    `SELECT p.display_name AS player_name,
            bc.runs_scored AS runs,
            bc.balls_faced AS balls,
            i.innings_number
       FROM batting_scorecards bc
       JOIN innings i ON i.innings_id = bc.innings_id
       JOIN players p ON p.players_id = bc.player_id
      WHERE i.match_id = $1
      ORDER BY bc.runs_scored DESC
      LIMIT 5`,
    [matchId]
  );
  return r.rows;
};

const getPlayerMatchHistory = async (playerId, limit = 10) => {
  const r = await query(
    `SELECT m.match_date,
            CONCAT(hc.club_name, ' vs ', oc.club_name) AS match_name,
            bc.runs_scored,
            bc.balls_faced,
            bc.is_dismissed
       FROM batting_scorecards bc
       JOIN innings i ON i.innings_id = bc.innings_id
       JOIN matches m ON m.matches_id = i.match_id
       LEFT JOIN club hc ON hc.club_id = m.host_club_id
       LEFT JOIN club oc ON oc.club_id = m.opponent_club_id
      WHERE bc.player_id = $1
      ORDER BY m.match_date DESC NULLS LAST
      LIMIT $2`,
    [playerId, limit]
  );
  return r.rows;
};

module.exports = {
  findClubRecentMatches,
  findActiveClubPlayers,
  playerBelongsToClub,
  matchBelongsToClub,
  getMatchSummary,
  getMatchManhattan,
  getMatchRunRate,
  getMatchExtras,
  getMatchTopPerformers,
  getPlayerMatchHistory,
};
