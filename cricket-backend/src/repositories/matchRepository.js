// Match data-access — maps to the live schema (matches, innings,
// batting_scorecards, bowling_figures, dismissals). Read-only (viewer paths).
// All queries are parameterized via the db.js query helper.
const { query } = require('../../db');

// Map the viewer's status filter to real match_status enum values.
const STATUS_FILTERS = {
  live: ['toss', 'live', 'innings_break'],
  scheduled: ['scheduled'],
  completed: ['completed']
};

// 🔥 UPGRADED MATCH_SELECT: Uses host_club_id & opponent_club_id, and joins the 'club' table
const MATCH_SELECT = `
  SELECT
    m.matches_id        AS id,
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
    tn.name             AS competition,
    m.host_club_id      AS team1_id,
    c1.club_name        AS team1_name,
    c1.display_name     AS team1_short_name,
    NULL                AS team1_logo_url,
    m.opponent_club_id  AS team2_id,
    c2.club_name        AS team2_name,
    c2.display_name     AS team2_short_name,
    NULL                AS team2_logo_url,
    m.toss_winner_id,
    m.toss_decision,
    m.result_type,
    m.result_margin,
    m.winning_team_id,
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

// List public matches, optionally filtered by the viewer status bucket.
const findMatches = async (status) => {
  const bucket = STATUS_FILTERS[status];
  if (bucket) {
    const result = await query(
      `${MATCH_SELECT} WHERE m.status = ANY($1::match_status[])
       ORDER BY m.scheduled_at DESC`,
      [bucket]
    );
    return result.rows;
  }
  const result = await query(
    `${MATCH_SELECT} ORDER BY m.scheduled_at DESC`
  );
  return result.rows;
};

const findMatchById = async (id) => {
  const result = await query(`${MATCH_SELECT} WHERE m.matches_id = $1`, [id]);
  return result.rows[0] || null;
};

// 🔥 UPGRADED findMatchesByTeam: Check host_club_id OR opponent_club_id
const findMatchesByTeam = async (teamId, limit = 10) => {
  const result = await query(
    `${MATCH_SELECT} WHERE (m.host_club_id = $1 OR m.opponent_club_id = $1)
     ORDER BY m.scheduled_at DESC
     LIMIT $2`,
    [teamId, limit]
  );
  return result.rows;
};

const findInningsByMatch = async (matchId) => {
  const result = await query(
    `SELECT i.innings_id AS id, i.innings_number,
            i.batting_team_id, i.fielding_team_id,
            bt.name AS batting_team_name, ft.name AS fielding_team_name,
            i.status, i.total_runs, i.total_wickets, i.total_balls,
            i.extras_wides, i.extras_no_balls, i.extras_leg_byes, i.extras_byes,
            i.extras_penalties, i.total_extras, i.target_runs
     FROM innings i
     JOIN teams bt ON bt.teams_id = i.batting_team_id
     JOIN teams ft ON ft.teams_id = i.fielding_team_id
     WHERE i.match_id = $1
     ORDER BY i.innings_number ASC`,
    [matchId]
  );
  return result.rows;
};

// Batting table for an innings. battingTeamId is used to resolve squad-level
// flags (is_captain via team_players.squad_role) and to build the dismissal
// line from the joined bowler/fielder display names.
const findBattingCards = async (inningsId, battingTeamId) => {
  const result = await query(
    `SELECT bc.player_id, p.display_name, p.full_name, p.primary_role,
            bc.batting_position, bc.runs_scored, bc.balls_faced, bc.fours,
            bc.sixes, bc.strike_rate, bc.is_dismissed, bc.dismissal_id,
            d.dismissal_type,
            bowl.display_name AS dismissal_bowler_name,
            fld.display_name  AS dismissal_fielder_name,
            (tp.squad_role = 'captain')             AS is_captain,
            (p.primary_role = 'wicket_keeper')      AS is_wicket_keeper
     FROM batting_scorecards bc
     JOIN players p ON p.players_id = bc.player_id
     LEFT JOIN dismissals d ON d.dismissals_id = bc.dismissal_id
     LEFT JOIN players bowl ON bowl.players_id = d.bowler_id
     LEFT JOIN players fld ON fld.players_id = d.primary_fielder_id
     LEFT JOIN team_players tp
            ON tp.player_id = bc.player_id
           AND tp.team_id = $2
           AND tp.left_at IS NULL
     WHERE bc.innings_id = $1
     ORDER BY bc.batting_position ASC`,
    [inningsId, battingTeamId]
  );
  return result.rows;
};

// Squad members for the batting team who have no batting_scorecards row yet.
const findYetToBat = async (inningsId, battingTeamId) => {
  const result = await query(
    `SELECT p.display_name
     FROM team_players tp
     JOIN players p ON p.players_id = tp.player_id
     WHERE tp.team_id = $2 AND tp.left_at IS NULL
       AND tp.player_id NOT IN (
         SELECT player_id FROM batting_scorecards WHERE innings_id = $1
       )
     ORDER BY tp.jersey_number NULLS LAST, p.display_name ASC`,
    [inningsId, battingTeamId]
  );
  return result.rows;
};

const findBowlingFigures = async (inningsId) => {
  const result = await query(
    `SELECT bf.player_id, p.display_name, p.full_name, bf.overs_bowled,
            bf.balls_bowled, bf.runs_conceded, bf.wickets, bf.maidens,
            bf.wides, bf.no_balls, bf.dot_balls, bf.economy_rate
     FROM bowling_figures bf
     JOIN players p ON p.players_id = bf.player_id
     WHERE bf.innings_id = $1
     ORDER BY bf.wickets DESC, bf.runs_conceded ASC`,
    [inningsId]
  );
  return result.rows;
};

const findRecentDeliveries = async (inningsId, limit = 18) => {
  const result = await query(
    `SELECT d.deliveries_id AS delivery_id,
            d.over_number,
            d.ball_in_over,
            d.delivery_sequence,
            d.bowler_id,
            d.batter_id,
            d.non_striker_id,
            d.delivery_type,
            d.runs_batter,
            d.runs_extras,
            d.runs_total,
            d.is_wicket,
            d.is_boundary_four,
            d.is_boundary_six,
            e.extra_type
       FROM deliveries d
       LEFT JOIN extras e ON e.delivery_id = d.deliveries_id
      WHERE d.innings_id = $1 AND d.deleted_at IS NULL
      ORDER BY d.delivery_sequence DESC
      LIMIT $2`,
    [inningsId, limit]
  );
  return result.rows.reverse();
};

// Fall of wickets, derived from dismissals (the dedicated fall_of_wickets
// table is not populated). runs_at_fall is exposed as score_at_fall.
const findFallOfWickets = async (inningsId) => {
  const result = await query(
    `SELECT d.wicket_number,
            d.runs_at_fall AS score_at_fall,
            d.over_at_fall,
            d.dismissed_batter_id,
            p.display_name AS dismissed_player
     FROM dismissals d
     JOIN players p ON p.players_id = d.dismissed_batter_id
     WHERE d.innings_id = $1
     ORDER BY d.wicket_number ASC`,
    [inningsId]
  );
  return result.rows;
};

// Visible AI commentary for a match. Falls back to deterministic ball text when
// the commentary module has not generated rows yet.
const findCommentary = async (matchId, inningsNumber = null) => {
  const inningsFilter = inningsNumber ? 'AND d.innings_number = $2' : '';
  const params = inningsNumber ? [matchId, inningsNumber] : [matchId];

  // 1. Fetch AI Commentary with Joins for Delivery Details (fixes 0.0 bug) & Audio Generations (gets MP3)
  const aiResult = await query(
    `SELECT ac.ai_commentary_id, ac.match_id, ac.innings_id, ac.delivery_id, ac.task, ac.style,
            ac.output, ac.source, ac.status, ac.is_visible, ac.is_manual_override, ac.version,
            ac.response_time_ms, ac.created_at,
            d.over_number, d.ball_in_over as ball_number, d.runs_total as runs, i.innings_number,
            bat.display_name AS batter_name, bow.display_name AS bowler_name,
            ag.storage_bucket, ag.storage_object
       FROM ai_commentary ac
       LEFT JOIN deliveries d ON d.deliveries_id = ac.delivery_id
       LEFT JOIN innings i ON i.innings_id = d.innings_id
       LEFT JOIN players bat ON bat.players_id = d.batter_id
       LEFT JOIN players bow ON bow.players_id = d.bowler_id
       LEFT JOIN audio_generations ag ON ag.commentary_id = ac.ai_commentary_id AND ag.status = 'ready'
      WHERE ac.match_id = $1 AND ac.is_visible = true ${inningsFilter.replace('d.innings_number', 'i.innings_number')}
      ORDER BY ac.created_at ASC`,
    params
  );

  if (aiResult.rows.length > 0) {
    // Construct the full HTTPS audio URL for the frontend player
    return aiResult.rows.map(row => {
      let audioUrl = null;
      if (row.storage_bucket && row.storage_object) {
        audioUrl = `https://storage.googleapis.com/${row.storage_bucket}/${row.storage_object}`;
      }
      return { ...row, audio_url: audioUrl };
    });
  }

  // 2. Fallback if AI hasn't generated anything yet
  const fallbackInningsFilter = inningsNumber ? 'AND i.innings_number = $2' : '';
  const fallbackParams = inningsNumber ? [matchId, inningsNumber] : [matchId];

  const fallbackResult = await query(
    `SELECT d.deliveries_id AS delivery_id, d.over_number, d.ball_in_over,
            d.delivery_sequence, d.delivery_type, d.runs_batter, d.runs_extras,
            d.runs_total, d.is_wicket, d.is_boundary_four, d.is_boundary_six,
            i.innings_number,
            bat.display_name AS batter_name,
            bow.display_name AS bowler_name
     FROM deliveries d
     JOIN innings i ON i.innings_id = d.innings_id
     JOIN players bat ON bat.players_id = d.batter_id
     JOIN players bow ON bow.players_id = d.bowler_id
     WHERE i.match_id = $1 AND d.deleted_at IS NULL ${fallbackInningsFilter}
     ORDER BY i.innings_number ASC, d.delivery_sequence ASC`,
    fallbackParams
  );
  
  return fallbackResult.rows.map((row) => ({
    ai_commentary_id: `fallback-${row.delivery_id}`,
    match_id: matchId,
    delivery_id: row.delivery_id,
    task: row.is_wicket ? 'wicket_alert' : row.is_boundary_four || row.is_boundary_six ? 'boundary_special' : 'live_ball_short',
    output: `${row.over_number}.${row.ball_in_over}: ${row.batter_name} faces ${row.bowler_name}. ${row.runs_total} run${row.runs_total === 1 ? '' : 's'}${row.is_wicket ? ', wicket' : ''}.`,
    source: 'score_fallback',
    status: 'visible',
    is_visible: true,
    is_manual_override: false,
    created_at: null,
    // Explicitly passing these so the frontend UI does not default to 0.0
    over_number: row.over_number,
    ball_number: row.ball_in_over,
    innings_number: row.innings_number,
    runs: row.runs_total,
    batter_name: row.batter_name,
    bowler_name: row.bowler_name
  }));
};
// src/repositories/matchRepository.js

// 🔥 FETCH AUDIO SETTINGS
const getAudioSettings = async (matchId) => {
  // 🔥 FIX: Renamed 'query' to 'sql' so it doesn't conflict with the imported query() function
  const sql = `
    SELECT * FROM public.audio_match_settings 
    WHERE match_id = $1
  `;
  const result = await query(sql, [matchId]); 
  return result.rows[0] || null;
};

// 🔥 UPSERT AUDIO SETTINGS (Exact SQL from Handoff Doc)
const upsertAudioSettings = async (matchId, data) => {
  // 🔥 FIX: Renamed 'query' to 'sql'
  const sql = `
    INSERT INTO public.audio_match_settings (
      match_id, audio_enabled, provider, provider_model, provider_voice, 
      language_code, character_key, tone, speaking_rate, character_prompt
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) ON CONFLICT (match_id) DO UPDATE SET 
      audio_enabled = EXCLUDED.audio_enabled,
      provider = EXCLUDED.provider,
      provider_model = EXCLUDED.provider_model,
      provider_voice = EXCLUDED.provider_voice,
      language_code = EXCLUDED.language_code,
      character_key = EXCLUDED.character_key,
      tone = EXCLUDED.tone,
      speaking_rate = EXCLUDED.speaking_rate,
      character_prompt = EXCLUDED.character_prompt,
      updated_at = NOW()
    RETURNING *;
  `;
  
  const values = [
    matchId, 
    data.audio_enabled, 
    data.provider, 
    data.provider_model, 
    data.provider_voice, 
    data.language_code, 
    data.character_key, 
    data.tone, 
    data.speaking_rate, 
    data.character_prompt || null
  ];

  const result = await query(sql, values);
  return result.rows[0];
};

module.exports = {
  getAudioSettings,
  upsertAudioSettings,
  findMatches,
  findMatchById,
  findMatchesByTeam,
  findInningsByMatch,
  findBattingCards,
  findYetToBat,
  findBowlingFigures,
  findRecentDeliveries,
  findFallOfWickets,
  findCommentary
};
