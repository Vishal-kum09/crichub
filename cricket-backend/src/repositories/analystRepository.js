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
  match_type: 'match_type',
  batter_id: 'batter_id',
  bowler: "bowler",
  batter: 'batter',
  bowler_id: 'bowler_id',
  bowler_type: 'bowler_type',
  batter_hand: 'batting_hand',
  venue: 'venue'
};

const buildFilters = (q = {}, teamMode = "both") => {
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

  if (q.home_team_id) {

  if (teamMode === "batting") {

    add(
      (n) => `batting_team = $${n}`,
      q.home_team_id
    );

  } else if (teamMode === "bowling") {

    add(
      (n) => `bowling_team = $${n}`,
      q.home_team_id
    );

  } else {

    add(
      (n) =>
        `(batting_team = $${n} OR bowling_team = $${n})`,
      q.home_team_id
    );

  }

}

if (q.opposition_team_id) {

  if (teamMode === "batting") {

    add(
      (n) => `bowling_team = $${n}`,
      q.opposition_team_id
    );

  } else if (teamMode === "bowling") {

    add(
      (n) => `batting_team = $${n}`,
      q.opposition_team_id
    );

  } else {

    add(
      (n) =>
        `(batting_team = $${n} OR bowling_team = $${n})`,
      q.opposition_team_id
    );

  }

}
// Match Result
if (q.match_result && q.home_team_id) {
  const won =
    String(q.match_result).toLowerCase() === 'won';

  add(
    (n) =>
      `winning_team ${won ? '=' : '<>'} $${n}`,
    q.home_team_id
  );
}
if (q.bat_field_first && q.home_team_id) {
  const batFirst =
    String(q.bat_field_first).toLowerCase() === 'bat first';

  add(
    (n) =>
      batFirst
        ? `(batting_team = $${n})`
        : `(bowling_team = $${n})`,
    q.home_team_id
  );
}
  if (q.tournament_id) {
  add(
    (n) => `competition = $${n}`,
    q.tournament_id
  );
}

// Match Type (UI -> Database mapping)
if (q.match_type) {

  const selectedType = String(q.match_type).toLowerCase();

  if (selectedType === 't20') {

    conditions.push(`
      match IN (
        SELECT match
        FROM nv_play
        GROUP BY match
        HAVING MAX(over) <= 20
      )
    `);

  } else if (
    selectedType === '50 overs' ||
    selectedType === '50 over'
  ) {

    conditions.push(`
      match IN (
        SELECT match
        FROM nv_play
        WHERE match_type = '50 Over'
        GROUP BY match
      )
    `);

  } else if (selectedType === 'timed') {

    conditions.push(`
      match IN (
        SELECT match
        FROM nv_play
        WHERE match_type = 'Timed'
        GROUP BY match
      )
    `);

  }

}


// Home / Away / Neutral filtering

if (q.home_away && q.home_team_id) {

  if (
    String(q.home_away).toLowerCase() === 'home'
  ) {
    add(
      (n) => `home_team_id = $${n}`,
      q.home_team_id
    );
  }

  if (
    String(q.home_away).toLowerCase() === 'away'
  ) {
    add(
      (n) => `home_team_id <> $${n}`,
      q.home_team_id
    );
  }

  // Neutral intentionally adds no filter
}
console.log('BUILD FILTERS:', q);
console.log('CONDITIONS:', conditions);
console.log('PARAMS:', params);
console.log('BUILD FILTERS INPUT:', q);
console.log('BUILD FILTERS CONDITIONS:', conditions);
console.log('BUILD FILTERS PARAMS:', params);
console.log('MATCH RESULT:', q.match_result);
console.log('HOME TEAM:', q.home_team_id);
console.log('CONDITIONS:', conditions);
console.log('PARAMS:', params);
console.log("BUILD FILTERS INPUT");
console.log(q);

console.log("CONDITIONS");
console.log(conditions);

console.log("PARAMS");
console.log(params);
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


// Remove any generic batting_team/bowling_team conditions.
// We'll handle them ourselves for this query.
  console.log(filters);
  console.log('CONDITIONS:', conditions);
  console.log('PARAMS:', params);

  const {
  conditions: fieldingConditions,
  params: fieldingParams
} = buildFilters(filters, "bowling");

const fieldingWhere = whereOf(fieldingConditions);

const where = whereOf(conditions);

const {
  conditions: bowlingConditions,
  params: bowlingParams
} = buildFilters(filters, "bowling");

const bowlingWhere = whereOf(bowlingConditions);

const whereLegal = whereOf(conditions, [LEGAL]);




  console.log('TEAM AGG FILTERS:', filters);
  console.log('WHERE:', where);
  console.log('PARAMS:', params);
  console.log('FILTERS RECEIVED');
  console.log(filters);

  console.log('WHERE CLAUSE');
  console.log(where);

  console.log('PARAMS');
  console.log(params);

 const [
  runRate,
  boundary,
  partnerships,
  economy,
  wicketsByPhase,
  scorers,
  wickets,
  bowlingStats,
  fieldingStats
] = await Promise.all([

  // Run Rate By Over
  query(
    `SELECT over AS over_number,
            COALESCE(
              ROUND(
                SUM(${CONCEDED})::numeric /
                NULLIF(COUNT(DISTINCT match || '|' || innings), 0),
                2
              )::float8,
              0
            ) AS avg_runs
       FROM nv_play ${where}
      GROUP BY over
      ORDER BY over`,
    params
  ),

  // Boundary Breakdown
  query(
    `SELECT
         COUNT(*) FILTER (WHERE runs = 4)::int AS fours_count,
  COUNT(*) FILTER (WHERE runs = 6)::int AS sixes_count,

  COUNT(*) FILTER (
    WHERE legal_ball = true
    AND runs IN (4,6)
  )::int AS boundary_balls,

  COUNT(*) FILTER (
    WHERE legal_ball = true
    AND runs NOT IN (4,6)
  )::int AS non_boundary_balls,
        COALESCE(
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE runs IN (4,6))
            / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0),
            2
          )::float8,
          0
        ) AS boundary_pct
      FROM nv_play ${where}`,
    params
  ),

  // Partnerships
  query(
    `SELECT
        p.batsmen[1] AS batsman_a,
        COALESCE(p.batsmen[2], p.nonstriker) AS batsman_b,
        p.runs,
        p.balls
      FROM (
        SELECT
          (array_agg(DISTINCT batter))::text[] AS batsmen,
          MAX(non_striker) AS nonstriker,
          SUM(${CONCEDED})::int AS runs,
          COUNT(*) FILTER (WHERE ${LEGAL})::int AS balls
        FROM nv_play ${whereOf(
          conditions,
          ['partnership_number IS NOT NULL']
        )}
        GROUP BY match, innings, partnership_number
      ) p
      ORDER BY p.runs DESC
      LIMIT 15`,
    params
  ),

  // Bowling Economy By Phase
  query(
    `SELECT
        ${PHASE} AS phase,
        COALESCE(
          ROUND(
            SUM(${CONCEDED})::numeric * 6
            / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0),
            2
          )::float8,
          0
        ) AS economy
      FROM nv_play ${where}
      GROUP BY phase`,
    params
  ),

  // Wickets By Phase
  query(
    `SELECT
        ${PHASE} AS phase,
        COUNT(*) FILTER (WHERE ${CREDITED})::int AS wickets
      FROM nv_play ${where}
      GROUP BY phase`,
    params
  ),

  // Top Scorers
  query(
    `SELECT
        batter AS player_name,
        SUM(runs)::int AS runs,
        COUNT(DISTINCT match || '|' || innings)::int AS innings
      FROM nv_play ${where}
      GROUP BY batter
      ORDER BY runs DESC
      LIMIT 10`,
    params
  ),

  // Top Wicket Takers
  query(
    `SELECT
        bowler AS player_name,
        COUNT(*) FILTER (WHERE ${CREDITED})::int AS wickets,
        COALESCE(
          ROUND(
            SUM(${CONCEDED})::numeric * 6
            / NULLIF(COUNT(*) FILTER (WHERE ${LEGAL}), 0),
            2
          )::float8,
          0
        ) AS economy
      FROM nv_play ${where}
      GROUP BY bowler
      ORDER BY wickets DESC, economy ASC
      LIMIT 10`,
    params
  ),

  // Bowling Stats
  query(`
SELECT
  COUNT(*) FILTER (WHERE extra = 'Wide') AS wides,

  COUNT(*) FILTER (WHERE extra = 'No Ball') AS no_balls,

  COUNT(*) FILTER (WHERE extra = 'Leg Bye') AS leg_byes,

  COUNT(*) FILTER (
    WHERE runs = 0
    AND legal_ball = true
  ) AS dot_balls,

  COUNT(*) FILTER (
    WHERE legal_ball = true
  ) AS legal_balls,

  COUNT(*) FILTER (
  WHERE ${CREDITED}
) AS wickets,

COUNT(DISTINCT match || '|' || innings) AS innings,

COALESCE(
(
  SELECT ROUND(
    100.0 *
    COUNT(*) FILTER (WHERE over_runs = 0)
    /
    NULLIF(COUNT(*), 0),
    2
  )
  FROM (
    SELECT
      match,
      innings,
      over,
      SUM(runs) AS over_runs
    FROM nv_play
    ${bowlingWhere}
    GROUP BY match, innings, over
  ) maiden_calc
),
0
) AS maiden_overs_pct

FROM nv_play
${bowlingWhere}
`, 
bowlingParams
),

  // Fielding Stats
 query(
`
SELECT
    COUNT(*) FILTER (
        WHERE fielder1_events = 'Catch'
    ) AS catches_taken,

    COUNT(*) FILTER (
        WHERE wicket ILIKE '%Run Out%'
    ) AS runouts_effected,

    COUNT(*) FILTER (
        WHERE extra = 'Bye'
    ) AS byes_conceded

FROM nv_play
${fieldingWhere}
`,
fieldingParams
)
]);

const bowling = {
  ...bowlingStats.rows[0],

  wickets_per_match:
    Number(bowlingStats.rows[0].wickets || 0) /
    Number(bowlingStats.rows[0].innings || 1)
};

const fielding = fieldingStats.rows[0];

console.log('BOWLING STATS RESULT');
console.log(bowling);

console.log('FIELDING STATS RESULT');
console.log(fielding);

return {
  run_rate_by_over: runRate.rows,
  boundary_breakdown: boundary.rows[0],
  partnership_maps: partnerships.rows,

  bowling_economy_by_phase: rowsToPhaseObject(
    economy.rows,
    'economy'
  ),

  wickets_by_phase: rowsToPhaseObject(
    wicketsByPhase.rows,
    'wickets'
  ),

  bowling_stats: bowling,
  
  fielding_stats: fielding,

  top_scorers: scorers.rows,
  top_wicket_takers: wickets.rows
};
};

// ─── player aggregations ────────────────────────────────────────────────────
const playerAggregations = async (filters) => {
  console.log('PLAYER FILTERS:', filters);
  const { conditions, params } = buildFilters(filters);
  const where = whereOf(conditions);
  console.log('BOWLING FILTERS:', filters);
  console.log('BOWLING CONDITIONS:', conditions);
  console.log('BOWLING PARAMS:', params);
  

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
const tournamentFilters = {
  tournament_id: filters.tournament_id,
  match_type: filters.match_type,
  date_from: filters.date_from,
  date_to: filters.date_to
};

const { conditions, params } = buildFilters(tournamentFilters);

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

  const qualification = points.map(team => {
  const currentPoints = team.points;
  const maxPoints = team.played * 2;

  const probability =
    maxPoints > 0
      ? Math.round((currentPoints / maxPoints) * 100)
      : 0;

  return {
    team: team.team,
    qualification_probability: probability,
    remaining_probability: 100 - probability
  };
});

  return {
    points_table: points.rows,
    top_scorers: scorers.rows,
    top_wicket_takers: wickets.rows,
    venue_stats: venues.rows,
    qualification
 
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
  return {
    over_number: r.over_number,
    wickets: running
  };
});

return {
  run_rate_by_over: runRate.rows,
  wicket_timeline,
  extras_breakdown: extras.rows[0],
  boundary_breakdown: boundary.rows[0],
  innings_totals: totals.rows
};
};


const getTeams = async () => {
  
  const result = await query(`
    SELECT DISTINCT batting_team AS team_name
    FROM nv_play
    WHERE batting_team IS NOT NULL
    ORDER BY batting_team
  `);

  return result.rows;
};
const battingExecution = async (filters) => {

const { conditions, params } =
  buildFilters(filters, "batting");

  const where = whereOf(conditions);


  const result = await query(`
    WITH innings_stats AS (
      SELECT
        batter,
        match,
        innings,
        SUM(runs)::int AS innings_runs,
        MAX(cumulative_batter_balls)::int AS balls,
        MAX(
          CASE
            WHEN wicket IS NOT NULL
             AND wicket <> 'Retired - Not Out'
            THEN 1
            ELSE 0
          END
        ) AS dismissed
      FROM nv_play
      ${where}
      GROUP BY batter, match, innings
    )
    SELECT
      COUNT(DISTINCT match)::int AS matches,
      COUNT(*)::int AS innings,
      SUM(CASE WHEN dismissed = 0 THEN 1 ELSE 0 END)::int AS not_outs,
      SUM(innings_runs)::int AS runs,

      ROUND(
        SUM(innings_runs)::numeric /
        NULLIF(SUM(dismissed),0),
        2
      ) AS average,

      ROUND(
        SUM(innings_runs)::numeric * 100 /
        NULLIF(SUM(balls),0),
        2
      ) AS strike_rate,

      COUNT(*) FILTER (
        WHERE innings_runs >= 50
          AND innings_runs < 100
      )::int AS fifties,

      COUNT(*) FILTER (
        WHERE innings_runs >= 100
      )::int AS hundreds,

      MAX(innings_runs)::int AS highest_score

    FROM innings_stats
  `, params);

  return result.rows[0];
};
const battingExecutionCharts = async (filters) => {  
const { conditions, params } =
  buildFilters(filters, "batting");

const where = whereOf(conditions);
  const [dotBall, positions, dismissals, phases, paceSpin] =
await Promise.all([

      query(`
        SELECT
          ROUND(
            100.0 *
            COUNT(*) FILTER (
              WHERE runs = 0
              AND legal_ball = true
            )
            /
            NULLIF(
              COUNT(*) FILTER (
                WHERE legal_ball = true
              ),
              0
            ),
            2
          ) AS dot_ball_pct
        FROM nv_play
        ${where}
      `, params),

      query(`
SELECT
  batting_position AS position,
  SUM(runs)::int AS runs
FROM nv_play
${where}
${where ? 'AND' : 'WHERE'} batting_position IS NOT NULL
GROUP BY batting_position
ORDER BY batting_position
`, params),

      query(`
        SELECT
          wicket AS type,
          COUNT(*)::int AS count
        FROM nv_play
        ${where}
        ${where ? 'AND' : 'WHERE'} wicket IS NOT NULL
        GROUP BY wicket
        ORDER BY count DESC
      `, params),

      query(`
SELECT
  CASE
    WHEN over <= 6 THEN 'Powerplay'
    WHEN over <= 15 THEN 'Middle'
    ELSE 'Death'
  END AS phase,
  SUM(runs)::int AS runs
FROM nv_play
${where}
GROUP BY phase
`, params),

query(`
SELECT
  CASE
    WHEN bowler_type IN ('LFM','LM','RFM','RM')
      THEN 'Pace'
    WHEN bowler_type IN ('LOB','ROB','RLB')
      THEN 'Spin'
  END AS type,

  ROUND(
    SUM(runs)::numeric /
    NULLIF(
      COUNT(*) FILTER (
        WHERE extra IS NULL
        OR extra NOT IN ('Wide','No Ball')
      ),
      0
    ) * 100,
    2
  ) AS strike_rate,

  ROUND(
    SUM(runs)::numeric /
    NULLIF(
      COUNT(*) FILTER (
        WHERE wicket IS NOT NULL
        AND wicket <> 'Retired - Not Out'
      ),
      0
    ),
    2
  ) AS average

FROM nv_play
${where}
${where ? 'AND' : 'WHERE'} bowler_type IS NOT NULL

GROUP BY type
`, params)

]);
console.log('PACE SPIN DATA');
console.log(paceSpin.rows);

  return {
    dot_ball_pct:
      dotBall.rows[0]?.dot_ball_pct || 0,
    pace_spin: paceSpin.rows,

    batting_position:
      positions.rows,

    dismissal_types:
      dismissals.rows,

    phase_runs:
      phases.rows
  };
};

const bowlingExecutionAnalytics = async (filters) => {
  console.log("BOWLING EXECUTION FILTERS");
console.log(filters);

const { conditions, params } = buildFilters(filters, "bowling");
    const where = whereOf(conditions);

    console.log("WHERE =", where);
console.log("PARAMS =", params);

const result = await query(

`
WITH innings_stats AS (

    SELECT

        match,
        innings,
        bowler,

        COUNT(*) FILTER (
            WHERE legal_ball = true
        ) AS legal_balls,

        COUNT(*) FILTER (
            WHERE wicket IS NOT NULL
            AND wicket NOT ILIKE '%Run Out%'
            AND wicket NOT ILIKE '%Retired%'
        ) AS wickets,

        SUM(
            runs +
            CASE
                WHEN extra IN ('Wide','No Ball')
                THEN extra_runs
                ELSE 0
            END
        ) AS runs_conceded

    FROM nv_play

    ${where}

    GROUP BY
        match,
        innings,
        bowler

)

SELECT

ROUND(
SUM(legal_balls)::numeric / 6,
1
) AS overs_bowled,

SUM(wickets) AS wickets,

ROUND(
SUM(runs_conceded)::numeric /
NULLIF(SUM(wickets),0),
2
) AS bowling_average,

ROUND(
SUM(runs_conceded)::numeric * 6 /
NULLIF(SUM(legal_balls),0),
2
) AS economy_rate,

ROUND(
SUM(legal_balls)::numeric /
NULLIF(SUM(wickets),0),
2
) AS strike_rate,

COUNT(*) FILTER (
WHERE wickets >= 3
) AS three_fers,

COUNT(*) FILTER (
WHERE wickets >= 5
) AS five_fers,

MAX(
CONCAT(
wickets,
'/',
runs_conceded
)
) AS best_bowling

FROM innings_stats
`,
params
);
console.log(result.rows);

return result.rows[0];

};

const coreAnalytics = async (filters = {}) => {

  console.log('CORE FILTERS:', filters);
  

  const teamName = filters.home_team_id || '';
  
  const oppositionTeam = filters.opposition_team_id || null;
  const venue = filters.venue || null;

  const conditions = [];
const params = [teamName];
let idx = 2;

if (filters.bat_field_first) {
  conditions.push(`LOWER(toss_decision) = LOWER($${idx})`);
  params.push(
    filters.bat_field_first === 'Bat First'
      ? 'Bat'
      : 'Bowl'
  );
  idx++;
}

if (filters.match_type) {
  conditions.push(`match_type = $${idx}`);
  params.push(filters.match_type);
  idx++;
}

if (filters.tournament_id) {
  conditions.push(`competition = $${idx}`);
  params.push(filters.tournament_id);
  idx++;
}

const matchResult =
  filters.match_result ?? filters.matchResult;

if (matchResult) {
  const won =
    String(matchResult).toLowerCase() === 'won';

  conditions.push(
    `winning_team ${won ? '=' : '<>'} $${idx}`
  );

  params.push(teamName);
  idx++;
}

if (oppositionTeam) {
  conditions.push(
    `(batting_team = $${idx} OR bowling_team = $${idx})`
  );
  params.push(oppositionTeam);
  idx++;
}

if (venue) {
  conditions.push(`venue = $${idx}`);
  params.push(venue);
  idx++;
}

if (filters.date_from) {
  conditions.push(`date >= $${idx}`);
  params.push(filters.date_from);
  idx++;
}

if (filters.date_to) {
  conditions.push(`date <= $${idx}`);
  params.push(filters.date_to);
  idx++;
} 

if (filters.over_min != null) {
  conditions.push(`over >= $${idx}`);
  params.push(Number(filters.over_min));
  idx++;
}

if (filters.over_max != null) {
  conditions.push(`over <= $${idx}`);
  params.push(Number(filters.over_max));
  idx++;
}


const extraWhere =
  conditions.length
    ? ` AND ${conditions.join(' AND ')}`
    : '';

  console.log('TEAM NAME:', teamName);
  console.log('CORE CONDITIONS:', conditions);
  console.log('CORE PARAMS:', params);
  const result = await query(
    `
    WITH innings_totals AS (
    SELECT
        match,
        innings,
        batting_team,
        bowling_team,

        SUM(
            COALESCE(runs,0) +
            COALESCE(extra_runs,0)
        ) AS total_runs,

        COUNT(*) FILTER (
            WHERE legal_ball = true
        ) AS legal_balls

    FROM nv_play
    WHERE (
  batting_team = $1
  OR bowling_team = $1
)
${extraWhere}

    GROUP BY
        match,
        innings,
        batting_team,
        bowling_team
),

match_summary AS (
  SELECT
    match,
    MAX(winning_team) AS winning_team,
    MAX(losing_team) AS losing_team,
    MAX(result) AS result
  FROM nv_play
  WHERE (
  batting_team = $1
  OR bowling_team = $1
)
${extraWhere}
  GROUP BY match
)

SELECT

    COUNT(DISTINCT ms.match)::int AS matches_played,

   COUNT(DISTINCT ms.match) FILTER (
  WHERE ms.winning_team = $1
) AS wins,

COUNT(DISTINCT ms.match) FILTER (
  WHERE ms.losing_team = $1
) AS losses,

    COUNT(DISTINCT ms.match) FILTER (
  WHERE ms.result ILIKE '%tie%'
)::int AS tied,

COUNT(DISTINCT ms.match) FILTER (
  WHERE ms.result ILIKE '%no result%'
)::int AS no_result,

    ROUND(
        AVG(
            CASE
                WHEN it.batting_team = $1
                THEN it.total_runs
            END
        ),
        2
    ) AS avg_score,

    ROUND(
        AVG(
            CASE
                WHEN it.bowling_team = $1
                THEN it.total_runs
            END
        ),
        2
    ) AS avg_conceded

FROM match_summary ms
LEFT JOIN innings_totals it
ON ms.match = it.match
    `,
params
  );

  const stats = result.rows[0];
  console.log('CORE RESULT:', stats);
  console.log(result.rows);
  console.log(stats);
  return {
  matches_played: Number(stats.matches_played || 0),

  wins: Number(stats.wins || 0),

  losses: Number(stats.losses || 0),

  tied: Number(stats.tied || 0),

  no_result: Number(stats.no_result || 0),

  win_percentage:
    Number(stats.matches_played || 0)
      ? (
          Number(stats.wins || 0) /
          Number(stats.matches_played)
        ) * 100
      : 0,

net_run_rate:
  Number(stats.avg_score || 0) -
  Number(stats.avg_conceded || 0),
  avg_score: Number(stats.avg_score || 0),

  avg_conceded: Number(stats.avg_conceded || 0)
};
};


const getOppositionTeams = async (homeTeam) => {

  const result = await query(
    `
    SELECT DISTINCT opposition AS name
    FROM (

      SELECT bowling_team AS opposition
      FROM nv_play
      WHERE batting_team = $1

      UNION

      SELECT batting_team AS opposition
      FROM nv_play
      WHERE bowling_team = $1

    ) t

    WHERE opposition <> $1
      AND opposition IS NOT NULL

    ORDER BY opposition
    `,
    [homeTeam]
  );

  return result.rows;
};

const getVenues = async (filters = {}) => {

  const params = [];
  let where = `WHERE venue IS NOT NULL`;

  if (
    filters.home_away &&
    filters.home_team_id
  ) {

    if (
      String(filters.home_away).toLowerCase() === 'home'
    ) {

      params.push(filters.home_team_id);

      where += `
        AND home_team_id = $1
      `;
    }

    if (
      String(filters.home_away).toLowerCase() === 'away'
    ) {

      params.push(filters.home_team_id);

      where += `
        AND home_team_id <> $1
      `;
    }
  }

  const result = await query(
    `
      SELECT DISTINCT venue AS name
      FROM nv_play
      ${where}
      ORDER BY venue
    `,
    params
  );

  return result.rows;
};
const getBatters = async (
  homeTeam,
  batterStyle
) => {

  const params = [homeTeam];

  let sql = `
    SELECT DISTINCT batter
    FROM nv_play
    WHERE batting_team = $1
      AND batter IS NOT NULL
      AND batter <> ''
  `;

  if (batterStyle) {
    params.push(batterStyle);

    sql += `
      AND batting_hand = $2
    `;
  }

  sql += `
    ORDER BY batter
  `;

  const result =
    await query(sql, params);

  return result.rows;
};

const getBowlerTypes = async (homeTeam) => {

    const result = await query(
        `
        SELECT DISTINCT bowler_type
        FROM nv_play
        WHERE bowling_team = $1
          AND bowler_type IS NOT NULL
          AND bowler_type <> ''
        ORDER BY bowler_type
        `,
        [homeTeam]
    );
    console.log("BOWLER TYPES:", result.rows);


    return result.rows;
};

const getBowlers = async (
    homeTeam,
    bowlerType,
    bowlerHand

) => {

    const params = [homeTeam];

    let sql = `
        SELECT DISTINCT bowler
        FROM nv_play
        WHERE bowling_team = $1
          AND bowler IS NOT NULL
          AND bowler <> ''
    `;

    if (bowlerType) {

        params.push(bowlerType);

        sql += `
            AND bowler_type = $2
        `;

    }

    sql += `
        ORDER BY bowler
    `;

console.log("HOME TEAM:", homeTeam);
console.log("BOWLER TYPE:", bowlerType);
console.log(sql);
console.log(params);

const result = await query(sql, params);

return result.rows;
};

const bowlingExecutionCharts = async (filters) => {

const { conditions, params } = buildFilters(filters, "bowling");
  const where = whereOf(conditions);

  const [dotBall, wicketsByPhase, handedness] = await Promise.all([

    query(`
      SELECT
        ROUND(
          100.0 *
          COUNT(*) FILTER (
            WHERE legal_ball = true
            AND runs = 0
          )
          /
          NULLIF(
            COUNT(*) FILTER (
              WHERE legal_ball = true
            ),
            0
          ),
          2
        ) AS dot_ball_pct
      FROM nv_play
      ${where}
    `, params),

    query(`
      SELECT
        CASE
          WHEN over <= 6 THEN 'Powerplay'
          WHEN over <= 15 THEN 'Middle'
          ELSE 'Death'
        END AS phase,

        COUNT(*) FILTER (
          WHERE wicket IS NOT NULL
          AND wicket NOT ILIKE '%Run Out%'
          AND wicket NOT ILIKE '%Retired%'
        ) AS wickets

      FROM nv_play
      ${where}

      GROUP BY phase
    `, params),

    query(`
      SELECT

        batting_hand,

        ROUND(
          SUM(
            runs +
            CASE
              WHEN extra IN ('Wide','No Ball')
              THEN extra_runs
              ELSE 0
            END
          )::numeric
          /
          NULLIF(
            COUNT(*) FILTER (
              WHERE wicket IS NOT NULL
              AND wicket NOT ILIKE '%Run Out%'
              AND wicket NOT ILIKE '%Retired%'
            ),
            0
          ),
          2
        ) AS average,

        ROUND(
          COUNT(*) FILTER (
            WHERE legal_ball = true
          )::numeric
          /
          NULLIF(
            COUNT(*) FILTER (
              WHERE wicket IS NOT NULL
              AND wicket NOT ILIKE '%Run Out%'
              AND wicket NOT ILIKE '%Retired%'
            ),
            0
          ),
          2
        ) AS strike_rate

      FROM nv_play

      ${where}

      GROUP BY batting_hand
    `, params)

  ]);

  return {

    dot_ball_pct:
      Number(dotBall.rows[0]?.dot_ball_pct || 0),

    wickets_by_phase:
      wicketsByPhase.rows,

    handedness: {

      left:
        handedness.rows.find(
          r => r.batting_hand === 'LHB'
        ) || {},

      right:
        handedness.rows.find(
          r => r.batting_hand === 'RHB'
        ) || {}

    }

  };

};


const runsPerWicket = async (filters) => {

  const { conditions, params } = buildFilters(filters);

  const where = whereOf(
    conditions,
    [
      `batting_team = $${params.length + 1}`,
      `wicket IS NOT NULL`,
      `team_wickets > 0`
    ]
  );

  params.push(filters.home_team_id);

  const result = await query(
    `
    SELECT
      team_wickets AS wicket,
      ROUND(AVG(team_runs),2) AS runs

    FROM nv_play

    ${where}

    GROUP BY team_wickets

    ORDER BY team_wickets
    `,
    params
  );

  return result.rows;
};

const battingKPIs = async (filters) => {

  const { conditions, params } = buildFilters(filters);

  const where = whereOf(
    conditions,
    [
      `batting_team = $${params.length + 1}`
    ]
  );

  params.push(filters.home_team_id);

  const result = await query(
    `
    WITH innings_stats AS (

      SELECT
        match,
        innings,

        MAX(team_runs) AS total_runs,

        MAX(team_wickets) AS wickets_lost,

        COUNT(*) FILTER (WHERE legal_ball = true) AS legal_balls

      FROM nv_play

      ${where}

      GROUP BY match, innings

    )

    SELECT

      ROUND(
        AVG(
          total_runs * 6.0 /
          NULLIF(legal_balls,0)
        ),
        2
      ) AS run_rate,

      ROUND(
        AVG(wickets_lost),
        2
      ) AS wickets_lost

    FROM innings_stats
    `,
    params
  );

  return result.rows[0];

};

const topCatchTakers = async (filters) => {

const {
  conditions,
  params
} = buildFilters(filters, "bowling");

const where = whereOf(
    conditions,
    [
        "fielder1_events = 'Catch'",
        "fielder1 IS NOT NULL"
    ]
);


console.log("TOP CATCH TAKERS");
console.log(where);
console.log("WHERE");
console.log(where);
console.log("PARAMS");
console.log(params);
console.log("FILTERS");
console.log(filters);

const result = await query(
`
SELECT
    fielder1 AS player,
    COUNT(*) AS catches
FROM nv_play
${where}
GROUP BY fielder1
ORDER BY catches DESC, player ASC
LIMIT 10
`,
params 
);

  return result.rows;

};

const partnershipAnalysis = async (filters) => {

  const { conditions, params } = buildFilters(filters);

  const where = whereOf(
    conditions,
    [
      `batting_team = $${params.length + 1}`,
      `partnership_number IS NOT NULL`
    ]
  );

  params.push(filters.home_team_id);

  const result = await query(
    `
    SELECT
      partnership_number AS partnership,

      SUM(runs)::int AS runs,

      ROUND(
        SUM(runs)::numeric * 100 /
        NULLIF(
          COUNT(*) FILTER (WHERE legal_ball = true),
          0
        ),
        2
      ) AS strike_rate

    FROM nv_play

    ${where}

    GROUP BY partnership_number

    ORDER BY partnership_number
    `,
    params
  );

  return result.rows;
};

const topBattersAnalysis = async (filters) => {

  const { conditions, params } = buildFilters(filters);

  const where = whereOf(conditions);

  const result = await query(
    `
    SELECT
      batter,

      SUM(runs)::int AS runs,

      ROUND(
        SUM(runs)::numeric * 100 /
        NULLIF(
          COUNT(*) FILTER (
            WHERE legal_ball = true
          ),
          0
        ),
        2
      ) AS strike_rate

    FROM nv_play

    ${where}

    GROUP BY batter

    ORDER BY runs DESC

    LIMIT 11
    `,
    params
  );

  return result.rows;

};

const scoreBreakdown = async (filters) => {

  const { conditions, params } = buildFilters(filters);

  const where = whereOf(conditions);

  const result = await query(
    `
    SELECT

      COALESCE(
        SUM(
          CASE
            WHEN runs = 1 THEN runs
            ELSE 0
          END
        ),
        0
      ) AS runs_from_1s,

      COALESCE(
        SUM(
          CASE
            WHEN runs = 2 THEN runs
            ELSE 0
          END
        ),
        0
      ) AS runs_from_2s,

      COALESCE(
        SUM(
          CASE
            WHEN runs = 4 THEN runs
            ELSE 0
          END
        ),
        0
      ) AS runs_from_4s,

      COALESCE(
        SUM(
          CASE
            WHEN runs = 6 THEN runs
            ELSE 0
          END
        ),
        0
      ) AS runs_from_6s

    FROM nv_play

    ${where}
    `,
    params
  );

  return result.rows[0];

};

const shotDistribution = async (filters) => {

  const { conditions, params } = buildFilters(filters);

  const where = whereOf(conditions);

  const result = await query(
    `
    WITH shots AS (
      SELECT generate_series(0,7) AS shot
    )

    SELECT
      s.shot,
      COALESCE(c.count,0)::int AS count

    FROM shots s

    LEFT JOIN (

      SELECT
        CAST(runs AS INTEGER) AS shot,
        COUNT(*) AS count

      FROM nv_play

      ${where}

      GROUP BY CAST(runs AS INTEGER)

    ) c

    ON s.shot = c.shot

    ORDER BY s.shot
    `,
    params
  );

  return result.rows;

};

const bowlingScoreBreakdown = async (filters) => {

const { conditions, params } = buildFilters(filters, "bowling");
const where = whereOf(conditions);
  const result = await query(
    `
    SELECT

      COALESCE(
        SUM(CASE WHEN runs = 1 THEN runs ELSE 0 END),
        0
      ) AS runs_from_1s,

      COALESCE(
        SUM(CASE WHEN runs = 2 THEN runs ELSE 0 END),
        0
      ) AS runs_from_2s,

      COALESCE(
        SUM(CASE WHEN runs = 4 THEN runs ELSE 0 END),
        0
      ) AS runs_from_4s,

      COALESCE(
        SUM(CASE WHEN runs = 6 THEN runs ELSE 0 END),
        0
      ) AS runs_from_6s

    FROM nv_play

    ${where}
    `,
    params
  );

  return result.rows[0];
};

const bowlingShotDistribution = async (filters) => {

const { conditions, params } = buildFilters(filters, "bowling");
  const where = whereOf(conditions);

  console.log("BOWLING SHOT DISTRIBUTION");
  console.log(where);
console.log(params);
  const result = await query(
    `
    WITH shots AS (
      SELECT generate_series(0,7) AS shot
    )

    SELECT
      s.shot,
      COALESCE(c.count,0)::int AS count

    FROM shots s

    LEFT JOIN (

      SELECT
        CAST(runs AS INTEGER) AS shot,
        COUNT(*) AS count

      FROM nv_play

      ${where}

      GROUP BY CAST(runs AS INTEGER)

    ) c
      ON s.shot = c.shot

    ORDER BY s.shot
    `,
    params
  );

  return result.rows;
};


const getTopBowlers = async (filters) => {

    const { conditions, params } = buildFilters(filters, "bowling");

    const where = whereOf(conditions);

    const result = await query(
        `
        SELECT
            bowler,
            COUNT(*) FILTER (
                WHERE wicket IS NOT NULL
                AND wicket NOT ILIKE '%Run Out%'
                AND wicket NOT ILIKE '%Retired%'
            ) AS wickets,

            ROUND(
                SUM(
                    runs +
                    CASE
                        WHEN extra IN ('Wide','No Ball')
                        THEN extra_runs
                        ELSE 0
                    END
                )::numeric * 6
                /
                NULLIF(
                    COUNT(*) FILTER (WHERE legal_ball = true),
                    0
                ),
                2
            ) AS economy

        FROM nv_play

        ${where}

        GROUP BY bowler

        ORDER BY wickets DESC, economy ASC

        LIMIT 11
        `,
        params
    );

    return result.rows;
};

const getRunsStrikeRatePerWicket = async (filters) => {

const { conditions, params } = buildFilters(filters, "bowling");
    const where = whereOf(
    conditions,
    [
        "bowler IS NOT NULL",
        "bowler <> ''"
    ]
);

    const result = await query(
        `
        SELECT
            bowler,

                SUM(
    runs +
    CASE
        WHEN extra ILIKE '%Wide%'
          OR extra ILIKE '%No Ball%'
        THEN COALESCE(extra_runs, 0)
        ELSE 0
    END
) AS runs,

            COUNT(*) FILTER (
                WHERE legal_ball = true
            ) AS legal_balls,

            COUNT(*) FILTER (
                WHERE wicket IS NOT NULL
                  AND wicket NOT ILIKE '%Run Out%'
                  AND wicket NOT ILIKE '%Retired%'
                  AND wicket NOT ILIKE '%Obstruct%'
            ) AS wickets,

            ROUND(
                CASE
                    WHEN COUNT(*) FILTER (
                        WHERE wicket IS NOT NULL
                          AND wicket NOT ILIKE '%Run Out%'
                          AND wicket NOT ILIKE '%Retired%'
                          AND wicket NOT ILIKE '%Obstruct%'
                    ) > 0
                    THEN
                        COUNT(*) FILTER (
                            WHERE legal_ball = true
                        )::numeric
                        /
                        COUNT(*) FILTER (
                            WHERE wicket IS NOT NULL
                              AND wicket NOT ILIKE '%Run Out%'
                              AND wicket NOT ILIKE '%Retired%'
                              AND wicket NOT ILIKE '%Obstruct%'
                        )
                    ELSE 0
                END,
                2
            ) AS strike_rate

        FROM nv_play
        ${where}
        GROUP BY bowler

ORDER BY runs DESC

LIMIT 11;
        `,
        params
    );

    return result.rows;

};

const getMaxOver = async (filters) => {

    const { conditions, params } = buildFilters(filters, "bowling");

    const where = whereOf(conditions);

    const result = await query(
        `
        SELECT
            COALESCE(MAX(over::int), 1) AS max_over
        FROM nv_play
        ${where}
        `,
        params
    );

    return result.rows[0];

};


module.exports = {
  buildFilters,
  getBatters,
  getBowlers,
  getMaxOver,
  topCatchTakers,
  getBowlerTypes,
  shotDistribution,
  battingKPIs,
  getRunsStrikeRatePerWicket,
  bowlingScoreBreakdown,
  bowlingShotDistribution,
  partnershipAnalysis,
  scoreBreakdown,
  topBattersAnalysis,
  getTeams,
  getOppositionTeams,
  bowlingExecutionAnalytics,
  bowlingExecutionCharts,
  getVenues,
  runsPerWicket,
  teamAggregations,
  playerAggregations,
  tournamentAggregations,
  matchAggregations,
  battingExecution,
  battingExecutionCharts,
  coreAnalytics,
  getTopBowlers
};