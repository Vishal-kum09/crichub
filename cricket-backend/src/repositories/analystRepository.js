// Analyst data-access — aggregations over the nv_play ball-by-ball stream
// (10k+ rows). nv_play is a DENORMALISED, TEXT-KEYED table: competition / teams
// / venue / batter_id / bowler_id are stored as text, not relational UUIDs, and
// there is no home/away or bowler-hand column. Filters therefore map to the real
// text columns; unmapped filters (home_away) are intentionally no-ops, and
// bowler_hand is derived from the first letter of bowler_type (L/R).
const { query } = require('../../db');

// ─── reusable SQL fragments ─────────────────────────────────────────────────
// Bowler-credited dismissals exclude run-outs and retirements.
const CREDITED = `(wicket IS NOT NULL AND wicket NOT ILIKE '%Run Out%' AND wicket NOT ILIKE '%Retired%')`;
// Runs charged to the bowler = off-bat runs + wide/no-ball extras (not byes).
const CONCEDED = `(runs + CASE WHEN extra ILIKE '%Wide%' OR extra ILIKE '%No Ball%' THEN COALESCE(extra_runs,0) ELSE 0 END)`;
// Phase buckets by over number (T20 convention; approximate for longer formats).
const PHASE = `CASE WHEN over <= 6 THEN 'powerplay' WHEN over >= 16 THEN 'death' ELSE 'middle' END`;
const LEGAL = `legal_ball`;

// ─── dynamic WHERE builder ──────────────────────────────────────────────────
// Only filters actually present in the request are applied. Returns the shared
// condition list + params; callers compose a WHERE with optional extra literals.
const EQ_COLUMNS = {
  tournament_id: 'competition',
  home_team_id: 'batting_team',
  opposition_team_id: 'bowling_team',
  match_type: 'match_type',
  batter_id: 'batter_id',
  bowler_id: 'bowler_id',
  bowler_type: 'bowler_type',
  batter_hand: 'batting_hand',
  venue: 'venue'
};

const buildFilters = (q = {}) => {
  const conditions = [];
  const params = [];
  const add = (makeSql, val) => { params.push(val); conditions.push(makeSql(params.length)); };

  for (const [key, col] of Object.entries(EQ_COLUMNS)) {
    if (q[key] != null && q[key] !== '') add((n) => `${col} = $${n}`, q[key]);
  }
  if (q.date_from) add((n) => `date >= $${n}`, q.date_from);
  if (q.date_to) add((n) => `date <= $${n}`, q.date_to);
  if (q.over_min != null && q.over_min !== '') add((n) => `over >= $${n}`, Number(q.over_min));
  if (q.over_max != null && q.over_max !== '') add((n) => `over <= $${n}`, Number(q.over_max));

  // bowler_hand: no column — derive from bowler_type's first letter (L/R).
  if (q.bowler_hand) {
    const hand = String(q.bowler_hand).toLowerCase().startsWith('l') ? 'L%' : 'R%';
    add((n) => `bowler_type ILIKE $${n}`, hand);
  }
  // toss_result: relative to the analysis (home) team, which must be supplied.
  if (q.toss_result && q.home_team_id) {
    const won = String(q.toss_result).toLowerCase() === 'won';
    add((n) => `toss_won_by ${won ? '=' : '<>'} $${n}`, q.home_team_id);
  }
  // home_away: nv_play has no home/away indicator — intentionally not applied.

  return { conditions, params };
};

const whereOf = (conditions, extra = []) => {
  const all = [...conditions, ...extra];
  return all.length ? `WHERE ${all.join(' AND ')}` : '';
};

const rowsToPhaseObject = (rows, key) => {
  const out = { powerplay: 0, middle: 0, death: 0 };
  for (const r of rows) out[r.phase] = Number(r[key]) || 0;
  return out;
};

// ─── team aggregations ──────────────────────────────────────────────────────
const teamAggregations = async (filters) => {
  const { conditions, params } = buildFilters(filters);
  const where = whereOf(conditions);
  const whereLegal = whereOf(conditions, [LEGAL]);

  const [runRate, boundary, partnerships, economy, scorers, wickets] = await Promise.all([
    query(
      `SELECT over AS over_number,
              COALESCE(ROUND(SUM(${CONCEDED})::numeric
                / NULLIF(COUNT(DISTINCT match || '|' || innings), 0), 2)::float8, 0) AS avg_runs
         FROM nv_play ${where}
        GROUP BY over ORDER BY over`, params
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE runs = 4)::int AS fours_count,
              COUNT(*) FILTER (WHERE runs = 6)::int AS sixes_count,
              COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE runs IN (4,6))
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS boundary_pct
         FROM nv_play ${where}`, params
    ),
    query(
      `SELECT p.batsmen[1] AS batsman_a,
              COALESCE(p.batsmen[2], p.nonstriker) AS batsman_b,
              p.runs, p.balls
         FROM (
           SELECT (array_agg(DISTINCT batter))::text[] AS batsmen,
                  MAX(non_striker) AS nonstriker,
                  SUM(${CONCEDED})::int AS runs,
                  COUNT(*) FILTER (WHERE ${LEGAL})::int AS balls
             FROM nv_play ${whereOf(conditions, ['partnership_number IS NOT NULL'])}
            GROUP BY match, innings, partnership_number
         ) p
        ORDER BY p.runs DESC
        LIMIT 15`, params
    ),
    query(
      `SELECT ${PHASE} AS phase,
              COALESCE(ROUND(SUM(${CONCEDED})::numeric * 6
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS economy
         FROM nv_play ${where}
        GROUP BY phase`, params
    ),
    query(
      `SELECT batter AS player_name, SUM(runs)::int AS runs,
              COUNT(DISTINCT match || '|' || innings)::int AS innings
         FROM nv_play ${where}
        GROUP BY batter ORDER BY runs DESC LIMIT 10`, params
    ),
    query(
      `SELECT bowler AS player_name,
              COUNT(*) FILTER (WHERE ${CREDITED})::int AS wickets,
              COALESCE(ROUND(SUM(${CONCEDED})::numeric * 6
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS economy
         FROM nv_play ${where}
        GROUP BY bowler ORDER BY wickets DESC, economy ASC LIMIT 10`, params
    )
  ]);

  return {
    run_rate_by_over: runRate.rows,
    boundary_breakdown: boundary.rows[0],
    partnership_maps: partnerships.rows,
    bowling_economy_by_phase: rowsToPhaseObject(economy.rows, 'economy'),
    top_scorers: scorers.rows,
    top_wicket_takers: wickets.rows
  };
};

// ─── player aggregations ────────────────────────────────────────────────────
const playerAggregations = async (filters) => {
  const { conditions, params } = buildFilters(filters);
  const where = whereOf(conditions);

  const [sr, dot, dismissals, h2h, form] = await Promise.all([
    query(
      `SELECT ${PHASE} AS phase,
              COALESCE(ROUND(SUM(runs)::numeric * 100
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS strike_rate
         FROM nv_play ${where}
        GROUP BY phase`, params
    ),
    query(
      `SELECT over AS over_number,
              COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE ${LEGAL} AND runs = 0 AND extra IS NULL)
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS dot_ball_pct
         FROM nv_play ${where}
        GROUP BY over ORDER BY over`, params
    ),
    query(
      `SELECT wicket AS dismissal_type, COUNT(*)::int AS count,
              COALESCE(ROUND(100.0 * COUNT(*)
                / NULLIF(SUM(COUNT(*)) OVER (), 0), 2)::float8, 0) AS pct
         FROM nv_play ${whereOf(conditions, ['wicket IS NOT NULL'])}
        GROUP BY wicket ORDER BY count DESC`, params
    ),
    query(
      `SELECT bowler AS bowler_name,
              COUNT(*) FILTER (WHERE ${LEGAL})::int AS balls,
              SUM(runs)::int AS runs,
              COUNT(*) FILTER (WHERE ${CREDITED} AND dismissed_batter = batter)::int AS dismissals
         FROM nv_play ${where}
        GROUP BY bowler ORDER BY balls DESC LIMIT 10`, params
    ),
    query(
      `SELECT match, innings, MAX(date) AS date, SUM(runs)::int AS score
         FROM nv_play ${where}
        GROUP BY match, innings ORDER BY MAX(date) DESC LIMIT 5`, params
    )
  ]);

  return {
    strike_rate_by_phase: rowsToPhaseObject(sr.rows, 'strike_rate'),
    dot_ball_index: dot.rows,
    dismissal_patterns: dismissals.rows,
    head_to_head: h2h.rows,
    recent_form: form.rows
  };
};

// ─── tournament aggregations ────────────────────────────────────────────────
const tournamentAggregations = async (filters) => {
  const { conditions, params } = buildFilters(filters);
  const where = whereOf(conditions);

  const [points, scorers, wickets, venues] = await Promise.all([
    // Points + NRR derived from the stream. The WHERE clause appears twice in the
    // UNION; reused $n placeholders bind the same params (valid in Postgres).
    query(
      `WITH rows AS (
         SELECT match, batting_team AS team, winning_team, losing_team,
                ${CONCEDED} AS r, (${LEGAL})::int AS b, true AS is_batting
           FROM nv_play ${where}
         UNION ALL
         SELECT match, bowling_team AS team, winning_team, losing_team,
                ${CONCEDED} AS r, (${LEGAL})::int AS b, false AS is_batting
           FROM nv_play ${where}
       )
       SELECT team,
              COUNT(DISTINCT match)::int AS played,
              COUNT(DISTINCT match) FILTER (WHERE winning_team = team)::int AS won,
              COUNT(DISTINCT match) FILTER (WHERE losing_team = team)::int AS lost,
              (COUNT(DISTINCT match) FILTER (WHERE winning_team = team) * 2)::int AS points,
              COALESCE(ROUND(
                SUM(r) FILTER (WHERE is_batting)::numeric
                  / NULLIF(SUM(b) FILTER (WHERE is_batting), 0) * 6
                - SUM(r) FILTER (WHERE NOT is_batting)::numeric
                  / NULLIF(SUM(b) FILTER (WHERE NOT is_batting), 0) * 6
              , 3)::float8, 0) AS nrr
         FROM rows
        WHERE team IS NOT NULL
        GROUP BY team ORDER BY points DESC, nrr DESC`, params
    ),
    query(
      `SELECT batter AS player_name, SUM(runs)::int AS runs,
              COUNT(DISTINCT match || '|' || innings)::int AS innings,
              COALESCE(ROUND(SUM(runs)::numeric
                / NULLIF(COUNT(*) FILTER (WHERE ${CREDITED} AND dismissed_batter = batter), 0), 2)::float8, 0) AS average
         FROM nv_play ${where}
        GROUP BY batter ORDER BY runs DESC LIMIT 10`, params
    ),
    query(
      `SELECT bowler AS player_name,
              COUNT(*) FILTER (WHERE ${CREDITED})::int AS wickets,
              COUNT(DISTINCT match)::int AS matches,
              COALESCE(ROUND(SUM(${CONCEDED})::numeric * 6
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS economy
         FROM nv_play ${where}
        GROUP BY bowler ORDER BY wickets DESC LIMIT 10`, params
    ),
    query(
      `SELECT venue, COUNT(DISTINCT match)::int AS matches_played,
              COALESCE(ROUND(AVG(innings_total), 0)::int, 0) AS avg_innings_total
         FROM (
           SELECT venue, match, innings, SUM(${CONCEDED})::int AS innings_total
             FROM nv_play ${where}
            GROUP BY venue, match, innings
         ) x
        GROUP BY venue ORDER BY matches_played DESC`, params
    )
  ]);

  return {
    points_table: points.rows,
    top_scorers: scorers.rows,
    top_wicket_takers: wickets.rows,
    venue_stats: venues.rows
  };
};

// ─── match aggregations ─────────────────────────────────────────────────────
// The filter set has no match selector, so this returns ball-by-ball breakdowns
// over the filtered set (narrow via home/opposition/venue to isolate a match).
const matchAggregations = async (filters) => {
  const { conditions, params } = buildFilters(filters);
  const where = whereOf(conditions);

  const [runRate, wicketsByOver, extras, boundary, totals] = await Promise.all([
    query(
      `SELECT over AS over_number,
              COALESCE(ROUND(SUM(${CONCEDED})::numeric
                / NULLIF(COUNT(DISTINCT match || '|' || innings), 0), 2)::float8, 0) AS avg_runs
         FROM nv_play ${where}
        GROUP BY over ORDER BY over`, params
    ),
    query(
      `SELECT over AS over_number, COUNT(*) FILTER (WHERE wicket IS NOT NULL)::int AS wickets
         FROM nv_play ${where}
        GROUP BY over ORDER BY over`, params
    ),
    query(
      `SELECT
          COALESCE(SUM(extra_runs) FILTER (WHERE extra ILIKE '%Wide%'), 0)::int    AS wides,
          COALESCE(SUM(extra_runs) FILTER (WHERE extra ILIKE '%No Ball%'), 0)::int AS no_balls,
          COALESCE(SUM(extra_runs) FILTER (WHERE extra ILIKE '%Leg Bye%'), 0)::int AS leg_byes,
          COALESCE(SUM(extra_runs) FILTER (WHERE extra ILIKE '%Bye%' AND extra NOT ILIKE '%Leg Bye%'), 0)::int AS byes
         FROM nv_play ${where}`, params
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE runs = 4)::int AS fours_count,
              COUNT(*) FILTER (WHERE runs = 6)::int AS sixes_count,
              COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE runs IN (4,6))
                / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0), 2)::float8, 0) AS boundary_pct
         FROM nv_play ${where}`, params
    ),
    query(
      `SELECT match, innings, MAX(batting_team) AS batting_team,
              SUM(${CONCEDED})::int AS total_runs,
              COUNT(*) FILTER (WHERE wicket IS NOT NULL)::int AS wickets
         FROM nv_play ${where}
        GROUP BY match, innings ORDER BY match, innings`, params
    )
  ]);

  // Cumulative wickets per over for the timeline.
  let running = 0;
  const wicket_timeline = wicketsByOver.rows.map((r) => {
    running += Number(r.wickets) || 0;
    return { over_number: r.over_number, wickets: running };
  });

  return {
    run_rate_by_over: runRate.rows,
    wicket_timeline,
    extras_breakdown: extras.rows[0],
    boundary_breakdown: boundary.rows[0],
    innings_totals: totals.rows
  };
};

module.exports = {
  buildFilters,
  teamAggregations,
  playerAggregations,
  tournamentAggregations,
  matchAggregations
};
