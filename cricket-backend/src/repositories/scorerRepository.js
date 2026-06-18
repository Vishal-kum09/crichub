// Scorer data-access — maps the scoring engine's mutations onto the real live
// schema (innings, overs, deliveries, extras, batting_scorecards,
// bowling_figures, dismissals, scorer_assignments). Every write function takes
// the active pg client as its first argument so the ScoringEngine can run the
// whole ball mutation inside a single withTransaction() call. Reads that run
// outside a transaction are passed the pool (which also exposes .query).
const { pool } = require('../../db');

// ─── Match / innings reads ──────────────────────────────────────────────────

const getMatch = async (db, matchId) => {
  const r = await db.query(
    `SELECT matches_id, status, overs_per_match, 
            host_club_id AS team1_id, opponent_club_id AS team2_id
       FROM matches WHERE matches_id = $1`,
    [matchId]
  );
  return r.rows[0] || null;
};

// Lock the innings row for the duration of the transaction so concurrent balls
// on the same innings serialize (no lost updates on the running totals).
const lockInnings = async (client, inningsId) => {
  const r = await client.query(
    `SELECT * FROM innings WHERE innings_id = $1 FOR UPDATE`,
    [inningsId]
  );
  return r.rows[0] || null;
};

const getInnings = async (db, inningsId) => {
  const r = await db.query(`SELECT * FROM innings WHERE innings_id = $1`, [inningsId]);
  return r.rows[0] || null;
};

const getCurrentInnings = async (db, matchId) => {
  const r = await db.query(
    `SELECT * FROM innings
      WHERE match_id = $1 AND status = 'in_progress'
      ORDER BY innings_number DESC
      LIMIT 1`,
    [matchId]
  );
  return r.rows[0] || null;
};

// ─── Innings mutations ──────────────────────────────────────────────────────

const createInnings = async (client, p) => {
  const r = await client.query(
    `INSERT INTO innings
       (match_id, innings_number, batting_team_id, fielding_team_id,
        status, target_runs, started_at)
     VALUES ($1,$2,$3,$4,'in_progress'::innings_status,$5, now())
     RETURNING *`,
    [p.matchId, p.inningsNumber, p.battingTeamId, p.fieldingTeamId, p.targetRuns ?? null]
  );
  return r.rows[0];
};

// Apply the aggregate deltas of a single delivery to the innings totals. All
// deltas may be negative (used by undo to reverse a delivery).
const applyInningsDelta = async (client, inningsId, d) => {
  const r = await client.query(
    `UPDATE innings SET
        total_runs       = total_runs       + $2,
        total_wickets    = total_wickets    + $3,
        total_balls      = total_balls      + $4,
        extras_wides     = extras_wides     + $5,
        extras_no_balls  = extras_no_balls  + $6,
        extras_leg_byes  = extras_leg_byes  + $7,
        extras_byes      = extras_byes      + $8,
        extras_penalties = extras_penalties + $9,
        total_extras     = total_extras     + $10
      WHERE innings_id = $1
      RETURNING *`,
    [
      inningsId,
      d.runs || 0, d.wickets || 0, d.balls || 0,
      d.wides || 0, d.no_balls || 0, d.leg_byes || 0, d.byes || 0,
      d.penalties || 0, d.total_extras || 0
    ]
  );
  return r.rows[0];
};

const setInningsStatus = async (client, inningsId, status) => {
  const r = await client.query(
    `UPDATE innings
        SET status = $2::innings_status,
            completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
      WHERE innings_id = $1
      RETURNING *`,
    [inningsId, status]
  );
  return r.rows[0];
};

const setMatchStatus = async (client, matchId, status) => {
  await client.query(
    `UPDATE matches
        SET status = $2::match_status,
            started_at = COALESCE(started_at, now()),
            updated_at = now()
      WHERE matches_id = $1`,
    [matchId, status]
  );
};

// ─── Overs ──────────────────────────────────────────────────────────────────

// Find the over row for (innings, over_number) or create it. The overs table
// has several NOT NULL columns (cumulative_*, run_rate, phase) so they are
// seeded on insert and refreshed by updateOverAggregates afterwards.
const getOrCreateOver = async (client, p) => {
  const found = await client.query(
    `SELECT * FROM overs WHERE innings_id = $1 AND over_number = $2`,
    [p.inningsId, p.overNumber]
  );
  if (found.rows[0]) return found.rows[0];
  const r = await client.query(
    `INSERT INTO overs
       (innings_id, over_number, bowler_id, cumulative_runs, cumulative_wickets,
        run_rate, phase)
     VALUES ($1,$2,$3,$4,$5,$6,$7::phase_enum)
     RETURNING *`,
    [p.inningsId, p.overNumber, p.bowlerId, p.cumulativeRuns, p.cumulativeWickets,
     p.runRate, p.phase]
  );
  return r.rows[0];
};

const updateOverAggregates = async (client, overId, d) => {
  await client.query(
    `UPDATE overs SET
        runs_scored      = runs_scored      + $2,
        wickets_taken    = wickets_taken    + $3,
        legal_balls      = legal_balls      + $4,
        dot_balls        = dot_balls        + $5,
        boundaries_four  = boundaries_four  + $6,
        boundaries_six   = boundaries_six   + $7,
        wides            = wides            + $8,
        no_balls         = no_balls         + $9,
        cumulative_runs    = $10,
        cumulative_wickets = $11,
        run_rate           = $12
      WHERE overs_id = $1`,
    [
      overId,
      d.runs || 0, d.wickets || 0, d.legal_balls || 0, d.dot_balls || 0,
      d.fours || 0, d.sixes || 0, d.wides || 0, d.no_balls || 0,
      d.cumulativeRuns, d.cumulativeWickets, d.runRate
    ]
  );
};

const deleteOverIfEmpty = async (client, overId) => {
  await client.query(
    `DELETE FROM overs o
       WHERE o.overs_id = $1
         AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.over_id = o.overs_id)`,
    [overId]
  );
};

// ─── Deliveries ─────────────────────────────────────────────────────────────

const nextDeliverySequence = async (client, inningsId) => {
  const r = await client.query(
    `SELECT COALESCE(MAX(delivery_sequence), 0) + 1 AS seq
       FROM deliveries WHERE innings_id = $1`,
    [inningsId]
  );
  return r.rows[0].seq;
};

const insertDelivery = async (client, p) => {
  let batsmanHand = p.batsmanhand;
  if (p.batsmanHand === 'right') {
    batsmanHand = 'Right_hand';
  } else if (p.batsmanHand === 'left') {
    batsmanHand = 'Left_hand';
  }
  const r = await client.query(
    `INSERT INTO deliveries
       (innings_id, over_id, over_number, ball_in_over, delivery_sequence,
        bowler_id, batter_id, non_striker_id, delivery_type,
        runs_batter, runs_extras, runs_total,
        is_dot, is_boundary_four, is_boundary_six, is_wicket, scored_by,
        wagon_x, wagon_y, field_area, shot_angle, batsman_hand)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::delivery_type,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     RETURNING *`,
    [
      p.inningsId, p.overId, p.overNumber, p.ballInOver, p.deliverySequence,
      p.bowlerId, p.batterId, p.nonStrikerId, p.deliveryType,
      p.runsBatter, p.runsExtras, p.runsTotal,
      p.isDot, p.isFour, p.isSix, p.isWicket, p.scoredBy,
      p.wagonX ?? null, p.wagonY ?? null, p.fieldArea ?? null,
      p.shotAngle ?? null, p.batsmanHand ?? null
    ]
  );
  return r.rows[0];
};

// Most recent live (non-deleted) delivery for an innings — drives both undo and
// the server-side resolution of who is on strike / bowling for the next ball.
const getLastDelivery = async (db, inningsId) => {
  const r = await db.query(
    `SELECT * FROM deliveries
      WHERE innings_id = $1 AND deleted_at IS NULL
      ORDER BY delivery_sequence DESC
      LIMIT 1`,
    [inningsId]
  );
  return r.rows[0] || null;
};

const deleteDelivery = async (client, deliveryId) => {
  await client.query(`DELETE FROM deliveries WHERE deliveries_id = $1`, [deliveryId]);
};

// ─── Extras ─────────────────────────────────────────────────────────────────

const insertExtra = async (client, p) => {
  await client.query(
    `INSERT INTO extras (innings_id, delivery_id, extra_type, runs)
     VALUES ($1,$2,$3::delivery_type,$4)`,
    [p.inningsId, p.deliveryId, p.extraType, p.runs]
  );
};

const deleteExtrasForDelivery = async (client, deliveryId) => {
  await client.query(`DELETE FROM extras WHERE delivery_id = $1`, [deliveryId]);
};

// ─── Batting scorecards ─────────────────────────────────────────────────────

const getBattingCard = async (db, inningsId, playerId) => {
  const r = await db.query(
    `SELECT * FROM batting_scorecards WHERE innings_id = $1 AND player_id = $2`,
    [inningsId, playerId]
  );
  return r.rows[0] || null;
};

const getActiveBatters = async (db, inningsId) => {
  const r = await db.query(
    `SELECT * FROM batting_scorecards
      WHERE innings_id = $1 AND is_dismissed = false
      ORDER BY batting_position ASC`,
    [inningsId]
  );
  return r.rows;
};

const nextBattingPosition = async (client, inningsId) => {
  const r = await client.query(
    `SELECT COALESCE(MAX(batting_position), 0) + 1 AS pos
       FROM batting_scorecards WHERE innings_id = $1`,
    [inningsId]
  );
  return r.rows[0].pos;
};

// Create a batting card if one does not exist for the player; returns it.
const ensureBattingCard = async (client, inningsId, playerId, opts = {}) => {
  const existing = await getBattingCard(client, inningsId, playerId);
  if (existing) return existing;
  const position = opts.position || (await nextBattingPosition(client, inningsId));
  const r = await client.query(
    `INSERT INTO batting_scorecards
       (innings_id, player_id, batting_position, came_in_at_over)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [inningsId, playerId, position, opts.cameInAtOver ?? null]
  );
  return r.rows[0];
};

// Increment a batter's running tally (negative deltas reverse a delivery).
const bumpBattingCard = async (client, inningsId, playerId, d) => {
  await client.query(
    `UPDATE batting_scorecards SET
        runs_scored     = runs_scored     + $3,
        balls_faced     = balls_faced     + $4,
        fours           = fours           + $5,
        sixes           = sixes           + $6,
        dot_balls_faced = dot_balls_faced + $7,
        strike_rate     = CASE WHEN (balls_faced + $4) > 0
                               THEN ROUND(((runs_scored + $3)::numeric * 100)
                                          / (balls_faced + $4), 2)
                               ELSE strike_rate END
      WHERE innings_id = $1 AND player_id = $2`,
    [inningsId, playerId, d.runs || 0, d.balls || 0, d.fours || 0, d.sixes || 0, d.dots || 0]
  );
};

const setBattingDismissed = async (client, inningsId, playerId, opts) => {
  await client.query(
    `UPDATE batting_scorecards SET
        is_dismissed    = $3,
        dismissal_id    = $4,
        dismissed_at_over = $5
      WHERE innings_id = $1 AND player_id = $2`,
    [inningsId, playerId, opts.isDismissed, opts.dismissalId ?? null, opts.dismissedAtOver ?? null]
  );
};

// ─── Bowling figures ────────────────────────────────────────────────────────

const ensureBowlingFigure = async (client, inningsId, playerId) => {
  const existing = await client.query(
    `SELECT * FROM bowling_figures WHERE innings_id = $1 AND player_id = $2`,
    [inningsId, playerId]
  );
  if (existing.rows[0]) return existing.rows[0];
  const r = await client.query(
    `INSERT INTO bowling_figures (innings_id, player_id) VALUES ($1,$2) RETURNING *`,
    [inningsId, playerId]
  );
  return r.rows[0];
};

// Increment a bowler's figures. balls_bowled feeds overs_bowled in the standard
// cricket O.B notation (completed overs + balls/10).

const getBowlingFigure = async (db, inningsId, playerId) => {
  const r = await db.query(
    `SELECT * FROM bowling_figures WHERE innings_id = $1 AND player_id = $2`,
    [inningsId, playerId]
  );
  return r.rows[0] || null;
};

// ─── Dismissals ─────────────────────────────────────────────────────────────

const insertDismissal = async (client, p) => {
  const r = await client.query(
    `INSERT INTO dismissals
       (delivery_id, innings_id, dismissed_batter_id, bowler_id, dismissal_type,
        primary_fielder_id, runs_at_fall, balls_at_fall, over_at_fall, wicket_number)
     VALUES ($1,$2,$3,$4,$5::dismissal_type,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      p.deliveryId, p.inningsId, p.dismissedBatterId, p.bowlerId ?? null, p.dismissalType,
      p.fielderId ?? null, p.runsAtFall, p.ballsAtFall, p.overAtFall, p.wicketNumber
    ]
  );
  return r.rows[0];
};

const getDismissalForDelivery = async (db, deliveryId) => {
  const r = await db.query(`SELECT * FROM dismissals WHERE delivery_id = $1`, [deliveryId]);
  return r.rows[0] || null;
};

const deleteDismissalForDelivery = async (client, deliveryId) => {
  await client.query(
    `DELETE FROM run_outs WHERE dismissal_id IN
       (SELECT dismissals_id FROM dismissals WHERE delivery_id = $1)`,
    [deliveryId]
  );
  await client.query(`DELETE FROM dismissals WHERE delivery_id = $1`, [deliveryId]);
};

// ─── Scorer assignments ─────────────────────────────────────────────────────

// Matches a scorer is actively assigned to (assignment accepted/not revoked is
// not required here — any live, non-revoked assignment is returned).
const findAssignedMatches = async (scorerId) => {
  const r = await pool.query(
    `SELECT m.matches_id AS id, m.match_date, m.start_time, m.scheduled_at,
            m.status, m.format, m.overs_per_match, m.venue,
            c1.club_name AS team1_name, c1.display_name AS team1_short_name,
            c2.club_name AS team2_name, c2.display_name AS team2_short_name,
            (SELECT CONCAT(i.total_runs, '/', i.total_wickets,
                    ' (', FLOOR(i.total_balls / 6), '.', i.total_balls % 6, ' Ov)')
               FROM innings i
              WHERE i.match_id = m.matches_id
              ORDER BY i.innings_number DESC
              LIMIT 1) AS live_score,
            sa.accepted_at, sa.created_at AS assigned_at
       FROM scorer_assignments sa
       JOIN matches m ON m.matches_id = sa.match_id
       LEFT JOIN club c1 ON c1.club_id = m.host_club_id
       LEFT JOIN club c2 ON c2.club_id = m.opponent_club_id
      WHERE sa.scorer_id = $1 AND sa.revoked_at IS NULL
        AND m.status NOT IN ('completed', 'abandoned', 'rained_off')
      ORDER BY m.scheduled_at DESC`,
    [scorerId]
  );
  return r.rows;
};

const findCompletedMatchesForScorer = async (scorerId) => {
  const r = await pool.query(
    `SELECT m.matches_id AS id, m.match_date, m.scheduled_at, m.status, m.format,
            m.venue, m.result_summary,
            c1.club_name AS team1_name, c1.display_name AS team1_short_name,
            c2.club_name AS team2_name, c2.display_name AS team2_short_name,
            (SELECT CONCAT(i.total_runs, '/', i.total_wickets,
                    ' (', FLOOR(i.total_balls / 6), '.', i.total_balls % 6, ' Ov)')
               FROM innings i
              WHERE i.match_id = m.matches_id AND i.innings_number = 1
              LIMIT 1) AS team1_score,
            (SELECT CONCAT(i.total_runs, '/', i.total_wickets,
                    ' (', FLOOR(i.total_balls / 6), '.', i.total_balls % 6, ' Ov)')
               FROM innings i
              WHERE i.match_id = m.matches_id AND i.innings_number = 2
              LIMIT 1) AS team2_score
       FROM scorer_assignments sa
       JOIN matches m ON m.matches_id = sa.match_id
       LEFT JOIN club c1 ON c1.club_id = m.host_club_id
       LEFT JOIN club c2 ON c2.club_id = m.opponent_club_id
      WHERE sa.scorer_id = $1 AND sa.revoked_at IS NULL
        AND m.status = 'completed'
      ORDER BY m.completed_at DESC NULLS LAST, m.scheduled_at DESC`,
    [scorerId]
  );
  return r.rows;
};
const getMatchPreviewRow = async (matchId) => {
  const r = await pool.query(
    `SELECT m.matches_id, m.match_date, m.scheduled_at, m.status, m.format,
            m.overs_per_match, m.venue, m.city, m.country,
            m.host_club_id AS team1_id, m.opponent_club_id AS team2_id,
            c1.club_name AS team1_name, c2.club_name AS team2_name
       FROM matches m
       LEFT JOIN club c1 ON c1.club_id = m.host_club_id
       LEFT JOIN club c2 ON c2.club_id = m.opponent_club_id
      WHERE m.matches_id = $1`,
    [matchId]
  );
  return r.rows[0] || null;
};
const findTeamRoster = async (teamId) => {
  const r = await pool.query(
    `SELECT players_id AS id, display_name AS name, primary_role AS role
       FROM players
      WHERE club_id = $1 AND is_active = true
      ORDER BY jersey_number NULLS LAST, display_name ASC`,
    [teamId]
  );
  return r.rows;
};

const getPlayerName = async (client, playerId) => {
  const r = await client.query('SELECT display_name FROM players WHERE players_id = $1', [playerId]);
  return r.rows[0]?.display_name || 'Unknown';
};

const scorerHasAssignment = async (scorerId, matchId) => {
  const r = await pool.query(
    `SELECT scorer_assignments_id FROM scorer_assignments
      WHERE scorer_id = $1 AND match_id = $2 AND revoked_at IS NULL`,
    [scorerId, matchId]
  );
  return !!r.rows[0];
};

const updateBattingCard = async (client, inningsId, playerId, stats) => {
  await client.query(`
    UPDATE batting_scorecards 
    SET runs_scored = runs_scored + $1, 
        balls_faced = balls_faced + $2, 
        fours = fours + $3, 
        sixes = sixes + $4,
        dot_balls_faced = dot_balls_faced + $5
    WHERE innings_id = $6 AND player_id = $7`, 
    [
      stats.runs, 
      stats.balls, 
      stats.fours, 
      stats.sixes, 
      stats.runs === 0 ? 1 : 0, // Dot ball logic
      inningsId, 
      playerId
    ]);
};

const updateBowlingFigure = async (client, inningsId, bowlerId, stats) => {
  await client.query(`
    UPDATE bowling_figures 
    SET runs_conceded = runs_conceded + $1, balls_bowled = balls_bowled + 1 
    WHERE innings_id = $2 AND player_id = $3`, 
    [stats.runs, inningsId, bowlerId]);
};


// Upgraded to calculate advanced metrics dynamically (Strike Rate, Average, Dots %)
const bumpBowlingFigure = async (client, inningsId, playerId, d) => {
  await client.query(
    `UPDATE bowling_figures SET
         balls_bowled   = balls_bowled   + $3,
         runs_conceded  = runs_conceded  + $4,
         wickets        = wickets        + $5,
         wides          = wides          + $6,
         no_balls       = no_balls       + $7,
         dot_balls      = dot_balls      + $8,
         boundaries_hit = boundaries_hit + $9,
         sixes_hit      = sixes_hit      + $10,
         overs_bowled   = FLOOR((balls_bowled + $3) / 6)
                          + ((balls_bowled + $3) % 6)::numeric / 10,
         economy_rate   = CASE WHEN (balls_bowled + $3) > 0
                               THEN ROUND((runs_conceded + $4)::numeric * 6 / (balls_bowled + $3), 2)
                               ELSE economy_rate END,
         bowling_sr     = CASE WHEN (wickets + $5) > 0 
                               THEN ROUND((balls_bowled + $3)::numeric / (wickets + $5), 2)
                               ELSE NULL END,
         bowling_avg    = CASE WHEN (wickets + $5) > 0
                               THEN ROUND((runs_conceded + $4)::numeric / (wickets + $5), 2)
                               ELSE NULL END,
         dot_ball_percent = CASE WHEN (balls_bowled + $3) > 0
                                 THEN ROUND(((dot_balls + $8)::numeric / (balls_bowled + $3)) * 100, 2)
                                 ELSE 0 END
       WHERE innings_id = $1 AND player_id = $2`,
    [
      inningsId, playerId, d.balls || 0, d.runs || 0, d.wickets || 0,
      d.wides || 0, d.no_balls || 0, d.dots || 0, d.fours || 0, d.sixes || 0
    ]
  );
};

// New: Upsert over-by-over batsman analytics rows
const bumpBatterOverStats = async (client, inningsId, batterId, overNumber, d) => {
  await client.query(`
    INSERT INTO batter_over_stats (innings_id, batter_id, over_number, runs, balls, fours, sixes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (innings_id, batter_id, over_number)
    DO UPDATE SET
      runs  = batter_over_stats.runs + EXCLUDED.runs,
      balls = batter_over_stats.balls + EXCLUDED.balls,
      fours = batter_over_stats.fours + EXCLUDED.fours,
      sixes = batter_over_stats.sixes + EXCLUDED.sixes
  `, [inningsId, batterId, overNumber, d.runs || 0, d.balls || 0, d.fours || 0, d.sixes || 0]);
};

// New: Upsert over-by-over bowler analytics rows
const bumpBowlerOverStats = async (client, inningsId, bowlerId, overNumber, d) => {
  await client.query(`
    INSERT INTO bowler_over_stats (innings_id, bowler_id, over_number, runs_conceded, wickets, fours, sixes, dot_balls, wides, no_balls, is_maiden)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
    ON CONFLICT (innings_id, bowler_id, over_number)
    DO UPDATE SET
      runs_conceded = bowler_over_stats.runs_conceded + EXCLUDED.runs_conceded,
      wickets       = bowler_over_stats.wickets + EXCLUDED.wickets,
      fours         = bowler_over_stats.fours + EXCLUDED.fours,
      sixes         = bowler_over_stats.sixes + EXCLUDED.sixes,
      dot_balls     = bowler_over_stats.dot_balls + EXCLUDED.dot_balls,
      wides         = bowler_over_stats.wides + EXCLUDED.wides,
      no_balls      = bowler_over_stats.no_balls + EXCLUDED.no_balls
  `, [
    inningsId, bowlerId, overNumber, 
    d.runs || 0, d.wickets || 0, d.fours || 0, d.sixes || 0, 
    d.dots || 0, d.wides || 0, d.no_balls || 0
  ]);
};

// New: Updates existing continuous spells (gap <= 2 overs) or establishes a fresh one
const bumpBowlingSpell = async (client, inningsId, bowlerId, overNumber, d) => {
  const existing = await client.query(`
    SELECT * FROM bowling_spells WHERE innings_id = $1 AND bowler_id = $2
    ORDER BY to_over DESC LIMIT 1
  `, [inningsId, bowlerId]);

  if (existing.rows[0] && (overNumber - existing.rows[0].to_over) <= 2) {
    const spell = existing.rows[0];
    // Fixed: Cleaned up the parameter index mismatch ($1 to $5 sequentially)
    await client.query(`
      UPDATE bowling_spells SET
        to_over = GREATEST(to_over, $2),
        runs_conceded = runs_conceded + $3,
        wickets = wickets + $4,
        overs_count = FLOOR((FLOOR(COALESCE(overs_count, 0)) * 6 + ROUND((COALESCE(overs_count, 0) % 1) * 10) + $5) / 6) + 
                      (MOD((FLOOR(COALESCE(overs_count, 0)) * 6 + ROUND((COALESCE(overs_count, 0) % 1) * 10) + $5)::integer, 6))::numeric / 10
      WHERE bowling_spells_id = $1
    `, [spell.bowling_spells_id, overNumber, d.runs || 0, d.wickets || 0, d.balls || 0]);
  } else {
    const countRes = await client.query(`
      SELECT COUNT(*) as count FROM bowling_spells WHERE innings_id = $1 AND bowler_id = $2
    `, [inningsId, bowlerId]);
    const spellNumber = parseInt(countRes.rows[0].count) + 1;

    await client.query(`
      INSERT INTO bowling_spells (innings_id, bowler_id, spell_number, from_over, to_over, overs_count, runs_conceded, wickets)
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
    `, [inningsId, bowlerId, spellNumber, overNumber, d.balls ? (d.balls / 10) : 0, d.runs || 0, d.wickets || 0]);
  }
};
// New: Maiden tracking engines to increment fields safely
const checkAndMarkMaidenOver = async (client, inningsId, bowlerId, overNumber) => {
  const res = await client.query(`
    SELECT runs_conceded, wides, no_balls FROM bowler_over_stats 
    WHERE innings_id = $1 AND bowler_id = $2 AND over_number = $3
  `, [inningsId, bowlerId, overNumber]);

  if (res.rows[0]) {
    const { runs_conceded, wides, no_balls } = res.rows[0];
    if (parseInt(runs_conceded) === 0 && parseInt(wides) === 0 && parseInt(no_balls) === 0) {
      await client.query(`UPDATE bowler_over_stats SET is_maiden = true WHERE innings_id = $1 AND bowler_id = $2 AND over_number = $3`, [inningsId, bowlerId, overNumber]);
      await client.query(`UPDATE bowling_figures SET maidens = maidens + 1 WHERE innings_id = $1 AND player_id = $2`, [inningsId, bowlerId]);
    }
  }
};

const checkAndUnmarkMaidenOver = async (client, inningsId, bowlerId, overNumber) => {
  const res = await client.query(`SELECT is_maiden FROM bowler_over_stats WHERE innings_id = $1 AND bowler_id = $2 AND over_number = $3`, [inningsId, bowlerId, overNumber]);
  if (res.rows[0] && res.rows[0].is_maiden) {
    await client.query(`UPDATE bowler_over_stats SET is_maiden = false WHERE innings_id = $1 AND bowler_id = $2 AND over_number = $3`, [inningsId, bowlerId, overNumber]);
    await client.query(`UPDATE bowling_figures SET maidens = GREATEST(0, maidens - 1) WHERE innings_id = $1 AND player_id = $2`, [inningsId, bowlerId]);
  }
};

// New: Safe transactional database cleaners to handle Undo executions
const deleteEmptyOverStatsAndSpells = async (client, inningsId, overNumber) => {
  await client.query(`DELETE FROM batter_over_stats WHERE innings_id = $1 AND over_number = $2 AND runs = 0 AND balls = 0`, [inningsId, overNumber]);
  await client.query(`DELETE FROM bowler_over_stats WHERE innings_id = $1 AND over_number = $2 AND runs_conceded = 0 AND wickets = 0 AND wides = 0 AND no_balls = 0`, [inningsId, overNumber]);
  await client.query(`DELETE FROM bowling_spells WHERE innings_id = $1 AND overs_count = 0 AND runs_conceded = 0 AND wickets = 0`, [inningsId]);
};
module.exports = {
  updateBattingCard,
  updateBowlingFigure,
  getMatch,
  lockInnings,
  getInnings,
  getCurrentInnings,
  createInnings,
  applyInningsDelta,
  setInningsStatus,
  setMatchStatus,
  getOrCreateOver,
  updateOverAggregates,
  deleteOverIfEmpty,
  nextDeliverySequence,
  insertDelivery,
  getLastDelivery,
  deleteDelivery,
  insertExtra,
  deleteExtrasForDelivery,
  getBattingCard,
  getActiveBatters,
  ensureBattingCard,
  bumpBattingCard,
  setBattingDismissed,
  ensureBowlingFigure,
  bumpBowlingFigure,
  getBowlingFigure,
  insertDismissal,
  getDismissalForDelivery,
  deleteDismissalForDelivery,
  findAssignedMatches,
  findCompletedMatchesForScorer,
  getMatchPreviewRow,
  findTeamRoster,
  scorerHasAssignment,
  getPlayerName,bumpBowlingFigure,bumpBatterOverStats
  ,bumpBowlerOverStats,bumpBowlingSpell,checkAndMarkMaidenOver,checkAndUnmarkMaidenOver,deleteEmptyOverStatsAndSpells
};
