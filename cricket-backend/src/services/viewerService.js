// Viewer service — composes read models from the repositories and maps them to
// the shapes the frontend expects (see presenters/viewerPresenter). No mutations.
const matchRepo = require('../repositories/matchRepository');
const teamRepo = require('../repositories/teamRepository');
const playerRepo = require('../repositories/playerRepository');
const dashboardRepo = require('../repositories/dashboardRepository');
const present = require('../presenters/viewerPresenter');

// ─── Matches ──────────────────────────────────────────────────────────────────

const listMatches = async (status) => {
  const rows = await matchRepo.findMatches(status);
  return rows.map(present.presentMatch);
};

const getMatch = async (id) => {
  const match = await matchRepo.findMatchById(id);
  if (!match) return null;
  const presented = present.presentMatch(match);
  presented.innings = await matchRepo.findInningsByMatch(id);
  return presented;
};

// Assemble a full scorecard: per-innings batting table, bowling table, extras
// breakdown, fall of wickets and yet-to-bat, built from the aggregate tables.
const getScorecard = async (matchId) => {
  const match = await matchRepo.findMatchById(matchId);
  if (!match) return null;

  const innings = await matchRepo.findInningsByMatch(matchId);
  const cards = [];
  for (const inn of innings) {
    const [batting, bowling, fallOfWickets, yetToBat] = await Promise.all([
      matchRepo.findBattingCards(inn.id, inn.batting_team_id),
      matchRepo.findBowlingFigures(inn.id),
      matchRepo.findFallOfWickets(inn.id),
      matchRepo.findYetToBat(inn.id, inn.batting_team_id)
    ]);
    cards.push(present.presentInnings(inn, batting, bowling, fallOfWickets, yetToBat));
  }

  return present.presentScorecard(match, cards);
};

const getCommentary = async (matchId) => {
  const match = await matchRepo.findMatchById(matchId);
  if (!match) return null;
  return matchRepo.findCommentary(matchId);
};

// ─── Teams ────────────────────────────────────────────────────────────────────

const listTeams = async () => {
  const rows = await teamRepo.findTeamsWithStats();
  return rows.map(present.presentTeam);
};

const getTeam = async (id) => {
  const team = await teamRepo.findTeamWithStats(id);
  if (!team) return null;
  const presented = present.presentTeam(team);
  const [squad, matches] = await Promise.all([
    playerRepo.findPlayersByTeamWithStats(id),
    matchRepo.findMatchesByTeam(id)
  ]);
  presented.squad = squad.map(present.presentPlayer);
  presented.matches = matches.map(present.presentMatch);
  return presented;
};

// ─── Players ──────────────────────────────────────────────────────────────────

const listPlayers = async () => {
  const rows = await playerRepo.findPlayersWithStats();
  return rows.map(present.presentPlayer);
};

const getPlayer = async (id) => {
  const player = await playerRepo.findPlayerWithStats(id);
  if (!player) return null;
  const presented = present.presentPlayer(player);
  presented.career_stats = await playerRepo.findCareerStats(id);
  return presented;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const getDashboardKpis = async () => {
  const row = await dashboardRepo.getKpis();
  return present.presentKpis(row);
};

module.exports = {
  listMatches,
  getMatch,
  getScorecard,
  getCommentary,
  listTeams,
  getTeam,
  listPlayers,
  getPlayer,
  getDashboardKpis
};
