// Club data-access for the public viewer surface.
const { query } = require('../../db');

const CLUB_STATS_SELECT = `
  SELECT
    c.club_id AS id,
    c.club_name AS name,
    c.display_name,
    c.country,
    c.home_ground,
    c.is_approved,
    c.created_at,
    COALESCE((
      SELECT COUNT(*)
        FROM matches m
       WHERE m.host_club_id = c.club_id
          OR m.opponent_club_id = c.club_id
    ), 0)::int AS total_matches,
    COALESCE((
      SELECT COUNT(*)
        FROM matches m
       WHERE m.winning_team_id = c.club_id
    ), 0)::int AS won,
    COALESCE((
      SELECT COUNT(*)
        FROM matches m
       WHERE m.status = 'completed'
         AND m.winning_team_id IS NOT NULL
         AND m.winning_team_id <> c.club_id
         AND (m.host_club_id = c.club_id OR m.opponent_club_id = c.club_id)
    ), 0)::int AS lost
  FROM club c
`;

const CLUB_MATCH_SELECT = `
  SELECT
    m.matches_id AS id,
    m.match_date,
    m.start_time,
    m.scheduled_at,
    m.started_at,
    m.completed_at,
    m.status,
    m.format,
    m.overs_per_match,
    m.venue,
    m.city,
    m.country,
    m.tournament_id,
    tn.name AS competition,
    m.host_club_id AS team1_id,
    c1.club_name AS team1_name,
    c1.display_name AS team1_short_name,
    NULL AS team1_logo_url,
    m.opponent_club_id AS team2_id,
    c2.club_name AS team2_name,
    c2.display_name AS team2_short_name,
    NULL AS team2_logo_url,
    m.result_summary,
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
      LIMIT 1) AS live_score
  FROM matches m
  LEFT JOIN club c1 ON c1.club_id = m.host_club_id
  LEFT JOIN club c2 ON c2.club_id = m.opponent_club_id
  LEFT JOIN tournaments tn ON tn.tournaments_id = m.tournament_id
`;

const findClubsWithStats = async () => {
  const result = await query(
    `${CLUB_STATS_SELECT}
      WHERE c.is_approved = true
      ORDER BY c.club_name ASC`
  );
  return result.rows;
};

const findClubWithStats = async (clubId) => {
  const result = await query(
    `${CLUB_STATS_SELECT}
      WHERE c.club_id = $1
      LIMIT 1`,
    [clubId]
  );
  return result.rows[0] || null;
};

const findMatchesByClub = async (clubId) => {
  const result = await query(
    `${CLUB_MATCH_SELECT}
      WHERE m.host_club_id = $1 OR m.opponent_club_id = $1
      ORDER BY m.scheduled_at DESC`,
    [clubId]
  );
  return result.rows;
};

module.exports = {
  findClubsWithStats,
  findClubWithStats,
  findMatchesByClub,
};
