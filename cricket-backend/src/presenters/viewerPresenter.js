// Viewer presenters — map live-schema rows onto the exact shapes the frontend
// expects (see Cricket analytics web app/src/data/mockData.ts: Player, Team,
// Match). pg returns SUM()/COUNT() as bigint strings and numeric() as strings,
// so every numeric field is coerced with num() to keep the frontend's
// .toFixed()/arithmetic safe.

// Coerce a pg value (string | number | null) to a finite number, else 0.
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Round to one decimal place, returned as a number.
const round1 = (v) => Math.round(num(v) * 10) / 10;

// players.primary_role enum -> mockData Player.role union.
const ROLE_MAP = {
  batter: 'Batsman',
  bowler: 'Bowler',
  all_rounder: 'All-rounder',
  wicket_keeper: 'Wicket-keeper'
};
const mapRole = (role) => ROLE_MAP[role] || 'Batsman';

// match_status enum -> a human display status. The frontend StatusBadge styles
// 'Won' | 'Lost' | 'Scheduled' | 'In Progress'; any other string renders as a
// neutral badge (no crash), which suits a neutral public viewer.
const STATUS_MAP = {
  scheduled: 'Scheduled',
  toss: 'In Progress',
  live: 'In Progress',
  innings_break: 'In Progress',
  completed: 'Completed',
  abandoned: 'Abandoned',
  rained_off: 'Rained Off'
};
const mapStatus = (status) => STATUS_MAP[status] || 'Scheduled';

// Build a cricket dismissal line from a batting-card row.
const formatDismissal = (row) => {
  if (!row.is_dismissed) return 'not out';
  const bowler = row.dismissal_bowler_name;
  const fielder = row.dismissal_fielder_name;
  switch (row.dismissal_type) {
    case 'bowled':       return bowler ? `b ${bowler}` : 'bowled';
    case 'lbw':          return bowler ? `lbw b ${bowler}` : 'lbw';
    case 'caught':       return fielder && bowler ? `c ${fielder} b ${bowler}` : bowler ? `c & b ${bowler}` : 'caught';
    case 'stumped':      return fielder && bowler ? `st ${fielder} b ${bowler}` : 'stumped';
    case 'run_out':      return fielder ? `run out (${fielder})` : 'run out';
    case 'hit_wicket':   return bowler ? `hit wicket b ${bowler}` : 'hit wicket';
    case 'handled_ball': return 'handled the ball';
    case 'obstructing_field': return 'obstructing the field';
    case 'timed_out':    return 'timed out';
    default:             return row.dismissal_type ? String(row.dismissal_type).replace(/_/g, ' ') : 'out';
  }
};

// matches row -> Match interface.
const presentMatch = (row) => ({
  id: row.id,
  teamA: row.team1_name,
  teamB: row.team2_name,
  opponent: `${row.team1_name} vs ${row.team2_name}`,
  venue: row.venue || '',
  date: row.match_date,
  format: row.format,
  status: mapStatus(row.status),
  result: row.result_summary || undefined,
  teamAScore: row.team1_score || undefined,
  teamBScore: row.team2_score || undefined,
  liveScore: row.live_score || undefined,
  competition: row.competition || ''
});

// players row (with stats) -> Player interface. Averages are derived from raw
// sums because player_career_stats stores them as NULL until computed.
const presentPlayer = (row) => {
  const runs = num(row.runs);
  const ballsFaced = num(row.balls_faced);
  const inningsBatted = num(row.innings_batted);
  const wickets = num(row.wickets);
  const runsConceded = num(row.runs_conceded);
  const oversBowled = num(row.overs_bowled);
  return {
    id: row.id,
    name: row.display_name || row.full_name,
    team: row.team || '',
    role: mapRole(row.primary_role),
    matches: num(row.matches),
    runs,
    wickets,
    battingAvg: inningsBatted > 0 ? round1(runs / inningsBatted) : 0,
    bowlingAvg: wickets > 0 ? round1(runsConceded / wickets) : 0,
    strikeRate: ballsFaced > 0 ? round1((runs * 100) / ballsFaced) : 0,
    economy: oversBowled > 0 ? round1(runsConceded / oversBowled) : 0
  };
};

// teams row (with stats) -> Team interface.
const presentTeam = (row) => ({
  id: row.id,
  name: row.name,
  competition: row.competition || '',
  playerCount: num(row.player_count),
  matchCount: num(row.match_count),
  wins: num(row.wins),
  losses: num(row.losses)
});

// One innings of the scorecard, assembled from the per-innings tables.
const presentInnings = (inn, batting, bowling, fallOfWickets, yetToBat) => ({
  innings_id: inn.id,
  innings_number: inn.innings_number,
  batting_team_id: inn.batting_team_id,
  fielding_team_id: inn.fielding_team_id,
  batting_team_name: inn.batting_team_name,
  fielding_team_name: inn.fielding_team_name,
  status: inn.status,
  total: {
    runs: num(inn.total_runs),
    wickets: num(inn.total_wickets),
    balls: num(inn.total_balls)
  },
  extras: {
    total: num(inn.total_extras),
    no_balls: num(inn.extras_no_balls),
    wides: num(inn.extras_wides),
    byes: num(inn.extras_byes),
    leg_byes: num(inn.extras_leg_byes)
  },
  batting: batting.map((b) => ({
    player_id: b.player_id,
    name: b.display_name || b.full_name,
    dismissal: formatDismissal(b),
    runs: num(b.runs_scored),
    balls: num(b.balls_faced),
    fours: num(b.fours),
    sixes: num(b.sixes),
    strike_rate: round1(b.strike_rate),
    is_captain: b.is_captain === true,
    is_wicket_keeper: b.is_wicket_keeper === true
  })),
  bowling: bowling.map((b) => ({
    player_id: b.player_id,
    name: b.display_name || b.full_name,
    overs: num(b.overs_bowled),
    maidens: num(b.maidens),
    runs: num(b.runs_conceded),
    wickets: num(b.wickets),
    economy: round1(b.economy_rate)
  })),
  fall_of_wickets: fallOfWickets.map((f) => ({
    wicket_number: num(f.wicket_number),
    score_at_fall: num(f.score_at_fall),
    over_at_fall: num(f.over_at_fall),
    dismissed_player: f.dismissed_player
  })),
  yet_to_bat: yetToBat.map((y) => y.display_name)
});

// Full scorecard envelope: match meta + per-innings cards.
const presentScorecard = (match, innings) => ({
  match_id: match.id,
  status: mapStatus(match.status),
  venue: match.venue || '',
  date: match.match_date,
  format: match.format,
  competition: match.competition || '',
  team1_id: match.team1_id,
  team1_name: match.team1_name,
  team2_id: match.team2_id,
  team2_name: match.team2_name,
  result_summary: match.result_summary || null,
  innings
});

const presentKpis = (row) => ({
  total_matches: num(row.total_matches),
  live_matches: num(row.live_matches),
  total_players: num(row.total_players),
  total_clubs: num(row.total_clubs),
  total_teams: num(row.total_teams)
});

module.exports = {
  presentMatch,
  presentPlayer,
  presentTeam,
  presentInnings,
  presentScorecard,
  presentKpis
};
