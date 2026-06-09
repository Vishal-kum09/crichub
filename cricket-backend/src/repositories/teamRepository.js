// Team data-access — maps to the live schema (teams, team_players, players).
// Read-only (viewer paths). Parameterized via the db.js query helper.
const { query } = require('../../db');

const findTeams = async () => {
  const result = await query(
    `SELECT teams_id AS id, name, short_name, logo_url, home_ground,
            country, is_active
     FROM teams
     WHERE is_active = true
     ORDER BY name ASC`
  );
  return result.rows;
};

const findTeamById = async (id) => {
  const result = await query(
    `SELECT teams_id AS id, name, short_name, logo_url, home_ground,
            country, is_active, created_at
     FROM teams
     WHERE teams_id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

// Current squad for a team (active membership: left_at IS NULL).
const findTeamPlayers = async (teamId) => {
  const result = await query(
    `SELECT tp.player_id, p.full_name, p.display_name, p.primary_role,
            p.batting_style, p.bowling_style, tp.jersey_number, tp.squad_role
     FROM team_players tp
     JOIN players p ON p.players_id = tp.player_id
     WHERE tp.team_id = $1 AND tp.left_at IS NULL
     ORDER BY tp.jersey_number NULLS LAST, p.display_name ASC`,
    [teamId]
  );
  return result.rows;
};

// Team row enriched with squad size, match count, wins/losses and the most
// recent competition (tournament) the team is registered in. Counts come back
// as bigint strings from pg; the presenter coerces them to numbers.
const TEAM_STATS_SELECT = `
  SELECT
    t.teams_id AS id,
    t.name,
    t.short_name,
    t.logo_url,
    t.home_ground,
    t.country,
    (SELECT COUNT(*) FROM team_players tp
       WHERE tp.team_id = t.teams_id AND tp.left_at IS NULL) AS player_count,
    (SELECT COUNT(*) FROM matches m
       WHERE m.team1_id = t.teams_id OR m.team2_id = t.teams_id) AS match_count,
    (SELECT COUNT(*) FROM matches m
       WHERE m.winning_team_id = t.teams_id) AS wins,
    (SELECT COUNT(*) FROM matches m
       WHERE m.status = 'completed'
         AND m.winning_team_id IS NOT NULL
         AND m.winning_team_id <> t.teams_id
         AND (m.team1_id = t.teams_id OR m.team2_id = t.teams_id)) AS losses,
    (SELECT tn.name FROM tournament_teams tt
       JOIN tournaments tn ON tn.tournaments_id = tt.tournament_id
       WHERE tt.team_id = t.teams_id
       ORDER BY tt.registered_at DESC LIMIT 1) AS competition
  FROM teams t
`;

const findTeamsWithStats = async () => {
  const result = await query(
    `${TEAM_STATS_SELECT} WHERE t.is_active = true ORDER BY t.name ASC`
  );
  return result.rows;
};

const findTeamWithStats = async (id) => {
  const result = await query(
    `${TEAM_STATS_SELECT} WHERE t.teams_id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  findTeams,
  findTeamById,
  findTeamPlayers,
  findTeamsWithStats,
  findTeamWithStats
};
