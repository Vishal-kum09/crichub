// Player service — assembles the "my performances" view from the real
// per-innings tables (batting_scorecards, bowling_figures). Resolves the player
// row via the D-010 identity fallback (see playerRepository). Always returns a
// fully-shaped stats object: a player with no innings yet gets zeros, not a 404.
const repo = require('../repositories/playerRepository');

// Coerce a pg value to a finite number, else 0 (mirrors viewerPresenter.num).
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v) => Math.round(num(v) * 100) / 100;

// balls_bowled -> "O.B" overs notation (6 legal balls per over).
const oversFromBalls = (balls) => `${Math.floor(num(balls) / 6)}.${num(balls) % 6}`;

const ZERO_BATTING = {
  total_runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0,
  double_hundreds: 0, strike_rate: 0, batting_average: 0, matches_played: 0,
  innings_batted: 0, highest_score: 0, dot_balls_faced: 0
};
const ZERO_BOWLING = {
  overs_bowled: '0.0', maidens: 0, runs_conceded: 0, wickets: 0, dot_balls: 0,
  economy_rate: 0, bowling_average: 0, three_fers: 0, five_fers: 0,
  matches_bowled: 0, best_bowling_figures: '0/0'
};

const presentBatting = (b) => {
  const balls = num(b.balls_faced);
  const runs = num(b.total_runs);
  const dismissals = num(b.dismissals);
  return {
    total_runs: runs,
    balls_faced: balls,
    fours: num(b.fours),
    sixes: num(b.sixes),
    fifties: num(b.fifties),
    hundreds: num(b.hundreds),
    double_hundreds: num(b.double_hundreds),
    strike_rate: balls > 0 ? round2((runs * 100) / balls) : 0,
    batting_average: dismissals > 0 ? round2(runs / dismissals) : 0,
    matches_played: num(b.matches_played),
    innings_batted: num(b.innings_batted),
    highest_score: num(b.highest_score),
    dot_balls_faced: num(b.dot_balls_faced)
  };
};

const presentBowling = (b, best) => {
  const balls = num(b.balls_bowled);
  const conceded = num(b.runs_conceded);
  const wickets = num(b.wickets);
  return {
    overs_bowled: oversFromBalls(balls),
    maidens: num(b.maidens),
    runs_conceded: conceded,
    wickets,
    dot_balls: num(b.dot_balls),
    economy_rate: balls > 0 ? round2((conceded * 6) / balls) : 0,
    bowling_average: wickets > 0 ? round2(conceded / wickets) : 0,
    three_fers: num(b.three_fers),
    five_fers: num(b.five_fers),
    matches_bowled: num(b.matches_bowled),
    best_bowling_figures: best ? `${num(best.wickets)}/${num(best.runs_conceded)}` : '0/0'
  };
};

const getMyPerformances = async (userId) => {
  const identity = await repo.getUserIdentity(userId);
  const playerId = await repo.resolvePlayerId(userId, identity);

  // No matching player row → the account exists but has no cricket innings yet.
  if (!playerId) {
    return {
      resolved: false,
      player_id: null,
      batting: { ...ZERO_BATTING },
      bowling: { ...ZERO_BOWLING }
    };
  }

  const [batting, bowling, best] = await Promise.all([
    repo.getBattingAggregate(playerId),
    repo.getBowlingAggregate(playerId),
    repo.getBestBowling(playerId)
  ]);

  return {
    resolved: true,
    player_id: playerId,
    batting: presentBatting(batting),
    bowling: presentBowling(bowling, best)
  };
};

module.exports = { getMyPerformances };
