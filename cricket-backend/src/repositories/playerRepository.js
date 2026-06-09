// Player data-access — maps to the live schema (players, player_career_stats).
// Read-only (viewer paths). Parameterized via the db.js query helper.
const { query } = require('../../db');

const findPlayers = async () => {
  const result = await query(
    `SELECT players_id AS id, full_name, display_name, primary_role,
            batting_style, bowling_style, jersey_number, nationality,
            photo_url, is_active
     FROM players
     WHERE is_active = true
     ORDER BY display_name ASC`
  );
  return result.rows;
};

const findPlayerById = async (id) => {
  const result = await query(
    `SELECT players_id AS id, full_name, display_name, date_of_birth,
            primary_role, batting_style, bowling_style, jersey_number,
            nationality, photo_url, is_active, created_at
     FROM players
     WHERE players_id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

// Career stats, one row per format (T20/ODI/Test/...).
const findCareerStats = async (playerId) => {
  const result = await query(
    `SELECT format, matches_played, innings_batted, total_runs, balls_faced,
            highest_score, batting_average, batting_sr, total_fours,
            total_sixes, centuries, fifties, innings_bowled, overs_bowled,
            runs_conceded, wickets_taken, bowling_average, bowling_economy,
            bowling_sr, three_wicket_haul, five_wicket_hauls
     FROM player_career_stats
     WHERE player_id = $1
     ORDER BY format ASC`,
    [playerId]
  );
  return result.rows;
};

// Player row enriched with career aggregates (summed across all formats) and
// the player's current team name. Raw sums are returned; the presenter derives
// averages/strike-rate/economy and coerces the pg numeric strings to numbers.
const PLAYER_STATS_SELECT = `
  SELECT
    p.players_id AS id,
    p.full_name,
    p.display_name,
    p.primary_role,
    p.batting_style,
    p.bowling_style,
    p.is_active,
    COALESCE(s.matches, 0)        AS matches,
    COALESCE(s.runs, 0)           AS runs,
    COALESCE(s.wickets, 0)        AS wickets,
    COALESCE(s.balls_faced, 0)    AS balls_faced,
    COALESCE(s.innings_batted, 0) AS innings_batted,
    COALESCE(s.runs_conceded, 0)  AS runs_conceded,
    COALESCE(s.overs_bowled, 0)   AS overs_bowled,
    tm.name AS team
  FROM players p
  LEFT JOIN (
    SELECT player_id,
           SUM(matches_played)  AS matches,
           SUM(total_runs)      AS runs,
           SUM(wickets_taken)   AS wickets,
           SUM(balls_faced)     AS balls_faced,
           SUM(innings_batted)  AS innings_batted,
           SUM(runs_conceded)   AS runs_conceded,
           SUM(overs_bowled)    AS overs_bowled
    FROM player_career_stats
    GROUP BY player_id
  ) s ON s.player_id = p.players_id
  LEFT JOIN LATERAL (
    SELECT t.name
    FROM team_players tp
    JOIN teams t ON t.teams_id = tp.team_id
    WHERE tp.player_id = p.players_id AND tp.left_at IS NULL
    ORDER BY tp.joined_at DESC NULLS LAST
    LIMIT 1
  ) tm ON true
`;

const findPlayersWithStats = async () => {
  const result = await query(
    `${PLAYER_STATS_SELECT} WHERE p.is_active = true ORDER BY p.display_name ASC`
  );
  return result.rows;
};

const findPlayerWithStats = async (id) => {
  const result = await query(
    `${PLAYER_STATS_SELECT} WHERE p.players_id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

// Active squad of a team, each enriched with career aggregates.
const findPlayersByTeamWithStats = async (teamId) => {
  const result = await query(
    `${PLAYER_STATS_SELECT}
     WHERE p.players_id IN (
       SELECT player_id FROM team_players
       WHERE team_id = $1 AND left_at IS NULL
     )
     ORDER BY p.display_name ASC`,
    [teamId]
  );
  return result.rows;
};

module.exports = {
  findPlayers,
  findPlayerById,
  findCareerStats,
  findPlayersWithStats,
  findPlayerWithStats,
  findPlayersByTeamWithStats
};
