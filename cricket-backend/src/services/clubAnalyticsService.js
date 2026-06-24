const repo = require('../repositories/clubAnalyticsRepository');
const playerRepo = require('../repositories/playerRepository');
const { AppError } = require('../middlewares/errorHandler');
const { getScoringRules } = require('../utils/matchNotes');

const requireClubId = (user) => {
  if (!user?.club_id) {
    throw new AppError('You are not associated with a club', 403);
  }
  return user.club_id;
};

const listRecentMatches = async (user) => {
  const clubId = requireClubId(user);
  const rows = await repo.findClubRecentMatches(clubId);
  return rows.map((m) => ({
    id: m.id,
    date: m.match_date,
    venue: m.venue || '',
    status: m.status,
    format: m.format,
    host_club: m.host_club,
    opponent_club: m.opponent_club,
    label: `${m.host_club} vs ${m.opponent_club}`,
    team1_score: m.team1_score || null,
    team2_score: m.team2_score || null,
  }));
};

const listClubPlayers = async (user) => {
  const clubId = requireClubId(user);
  return repo.findActiveClubPlayers(clubId);
};

const getPlayerPerformance = async (user, playerId) => {
  const clubId = requireClubId(user);
  const belongs = await repo.playerBelongsToClub(clubId, playerId);
  if (!belongs) {
    throw new AppError('Player analytics are only available for active club members', 403);
  }

  const [batting, bowling, best, history] = await Promise.all([
    playerRepo.getBattingAggregate(playerId),
    playerRepo.getBowlingAggregate(playerId),
    playerRepo.getBestBowling(playerId),
    repo.getPlayerMatchHistory(playerId),
  ]);

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const round2 = (v) => Math.round(num(v) * 100) / 100;
  const balls = num(batting?.balls_faced);
  const runs = num(batting?.total_runs);
  const dismissals = num(batting?.dismissals);
  const bBalls = num(bowling?.balls_bowled);
  const conceded = num(bowling?.runs_conceded);
  const wickets = num(bowling?.wickets);

  return {
    player_id: playerId,
    batting: {
      total_runs: runs,
      balls_faced: balls,
      fours: num(batting?.fours),
      sixes: num(batting?.sixes),
      fifties: num(batting?.fifties),
      hundreds: num(batting?.hundreds),
      strike_rate: balls > 0 ? round2((runs * 100) / balls) : 0,
      batting_average: dismissals > 0 ? round2(runs / dismissals) : 0,
      matches_played: num(batting?.matches_played),
      highest_score: num(batting?.highest_score),
      match_history: history.map((h, i) => ({
        match_name: h.match_name || `Match ${i + 1}`,
        runs_scored: num(h.runs_scored),
        running_average: dismissals > 0 ? round2(runs / dismissals) : runs,
      })),
    },
    bowling: {
      overs_bowled: `${Math.floor(bBalls / 6)}.${bBalls % 6}`,
      wickets,
      runs_conceded: conceded,
      economy_rate: bBalls > 0 ? round2((conceded * 6) / bBalls) : 0,
      bowling_average: wickets > 0 ? round2(conceded / wickets) : 0,
      three_fers: num(bowling?.three_fers),
      five_fers: num(bowling?.five_fers),
      best_bowling_figures: best ? `${num(best.wickets)}/${num(best.runs_conceded)}` : '0/0',
    },
  };
};

const getMatchAnalysis = async (user, matchId) => {
  const clubId = requireClubId(user);
  const allowed = await repo.matchBelongsToClub(clubId, matchId);
  if (!allowed) throw new AppError('Match not found for your club', 404);

  const summary = await repo.getMatchSummary(matchId);
  if (!summary) throw new AppError('Match not found', 404);

  const [manhattan, runRate, extras, topPerformers] = await Promise.all([
    repo.getMatchManhattan(matchId),
    repo.getMatchRunRate(matchId),
    repo.getMatchExtras(matchId),
    repo.getMatchTopPerformers(matchId),
  ]);

  const innings1Manhattan = manhattan
    .filter((r) => Number(r.innings_number) === 1)
    .map((r) => ({ over: Number(r.over_number), runs: Number(r.runs), wickets: Number(r.wickets) }));

  const innings2Manhattan = manhattan
    .filter((r) => Number(r.innings_number) === 2)
    .map((r) => ({ over: Number(r.over_number), runs: Number(r.runs), wickets: Number(r.wickets) }));

  const runRateByInnings = {
    innings1: runRate.filter((r) => Number(r.innings_number) === 1).map((r) => ({
      over: Number(r.over_number),
      run_rate: Number(r.run_rate),
    })),
    innings2: runRate.filter((r) => Number(r.innings_number) === 2).map((r) => ({
      over: Number(r.over_number),
      run_rate: Number(r.run_rate),
    })),
  };

  return {
    match_id: matchId,
    label: `${summary.host_club} vs ${summary.opponent_club}`,
    date: summary.match_date,
    venue: summary.venue,
    format: summary.format,
    status: summary.status,
    scoring_rules: getScoringRules(summary.notes),
    manhattan: {
      innings1: innings1Manhattan,
      innings2: innings2Manhattan,
    },
    run_rate: runRateByInnings,
    extras,
    top_performers: topPerformers.map((p) => ({
      player_name: p.player_name,
      runs: Number(p.runs),
      balls: Number(p.balls),
      innings: Number(p.innings_number),
    })),
  };
};

module.exports = {
  listRecentMatches,
  listClubPlayers,
  getPlayerPerformance,
  getMatchAnalysis,
};
