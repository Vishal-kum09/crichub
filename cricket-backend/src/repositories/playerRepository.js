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

// ─── My-performances (Player self view) ─────────────────────────────────────
// D-010 GAP: the live schema has NO bridge column between users.user_id and
// players.players_id — they are separate id spaces. So we resolve the player
// row from the signed-in user's identity:
//   1. primary attempt: players_id = user_id (only matches if a deployment
//      happens to alias the two id spaces);
//   2. fallback: match the user's display_name / full name against the players
//      identity columns (players has no email column to match on).
// If nothing matches, the caller returns a zeroed stats object (not a 404).

const getUserIdentity = async (userId) => {
  const r = await query(
    `SELECT user_id, display_name, first_name, last_name, email
       FROM users WHERE user_id = $1`,
    [userId]
  );
  return r.rows[0] || null;
};

const resolvePlayerId = async (userId, identity) => {
  const fullName = identity
    ? (identity.display_name || `${identity.first_name} ${identity.last_name}`)
    : null;
  const r = await query(
    `SELECT players_id FROM players
      WHERE players_id = $1
         OR ($2::text IS NOT NULL AND (display_name = $2 OR full_name = $2))
      ORDER BY (players_id = $1) DESC
      LIMIT 1`,
    [userId, fullName]
  );
  return r.rows[0] ? r.rows[0].players_id : null;
};

// Batting aggregate across all of a player's innings (batting_scorecards),
// joined to innings for the distinct match count. Derived rates are computed by
// the presenter from these raw sums.
const getBattingAggregate = async (playerId) => {
  const r = await query(
    `SELECT
        COALESCE(SUM(bc.runs_scored), 0)::int      AS total_runs,
        COALESCE(SUM(bc.balls_faced), 0)::int      AS balls_faced,
        COALESCE(SUM(bc.fours), 0)::int            AS fours,
        COALESCE(SUM(bc.sixes), 0)::int            AS sixes,
        COALESCE(SUM(bc.dot_balls_faced), 0)::int  AS dot_balls_faced,
        COUNT(*)::int                              AS innings_batted,
        COALESCE(MAX(bc.runs_scored), 0)::int      AS highest_score,
        COUNT(*) FILTER (WHERE bc.runs_scored BETWEEN 50 AND 99)::int   AS fifties,
        COUNT(*) FILTER (WHERE bc.runs_scored BETWEEN 100 AND 199)::int AS hundreds,
        COUNT(*) FILTER (WHERE bc.runs_scored >= 200)::int             AS double_hundreds,
        COUNT(*) FILTER (WHERE bc.is_dismissed)::int                   AS dismissals,
        COUNT(DISTINCT i.match_id)::int            AS matches_played
       FROM batting_scorecards bc
       JOIN innings i ON i.innings_id = bc.innings_id
      WHERE bc.player_id = $1`,
    [playerId]
  );
  return r.rows[0];
};

const getBowlingAggregate = async (playerId) => {
  const r = await query(
    `SELECT
        COALESCE(SUM(bf.balls_bowled), 0)::int   AS balls_bowled,
        COALESCE(SUM(bf.maidens), 0)::int        AS maidens,
        COALESCE(SUM(bf.runs_conceded), 0)::int  AS runs_conceded,
        COALESCE(SUM(bf.wickets), 0)::int        AS wickets,
        COALESCE(SUM(bf.dot_balls), 0)::int      AS dot_balls,
        COUNT(*) FILTER (WHERE bf.wickets BETWEEN 3 AND 4)::int AS three_fers,
        COUNT(*) FILTER (WHERE bf.wickets >= 5)::int            AS five_fers,
        COUNT(DISTINCT i.match_id)::int          AS matches_bowled
       FROM bowling_figures bf
       JOIN innings i ON i.innings_id = bf.innings_id
      WHERE bf.player_id = $1`,
    [playerId]
  );
  return r.rows[0];
};

// Best bowling in an innings: most wickets, tie-broken by fewest runs.
const getBestBowling = async (playerId) => {
  const r = await query(
    `SELECT wickets, runs_conceded
       FROM bowling_figures
      WHERE player_id = $1
      ORDER BY wickets DESC, runs_conceded ASC
      LIMIT 1`,
    [playerId]
  );
  return r.rows[0] || null;
};

module.exports = {
  findPlayers,
  findPlayerById,
  findCareerStats,
  findPlayersWithStats,
  findPlayerWithStats,
  findPlayersByTeamWithStats,
  // my-performances (D-010 fallback)
  getUserIdentity,
  resolvePlayerId,
  getBattingAggregate,
  getBowlingAggregate,
  getBestBowling
};
