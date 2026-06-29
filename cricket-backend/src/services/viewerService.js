// Viewer service — composes read models from the repositories and maps them to
// the shapes the frontend expects (see presenters/viewerPresenter). No mutations.
const { query } = require('../../db');
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
    const [batting, bowling, fallOfWickets, yetToBat, recentDeliveries] = await Promise.all([
      matchRepo.findBattingCards(inn.id, inn.batting_team_id),
      matchRepo.findBowlingFigures(inn.id),
      matchRepo.findFallOfWickets(inn.id),
      matchRepo.findYetToBat(inn.id, inn.batting_team_id),
      matchRepo.findRecentDeliveries(inn.id)
    ]);
    cards.push(present.presentInnings(inn, batting, bowling, fallOfWickets, yetToBat, recentDeliveries));
  }

  return present.presentScorecard(match, cards);
};

const getCommentary = async (matchId) => {
  const match = await matchRepo.findMatchById(matchId);
  if (!match) return null;
  return matchRepo.findCommentary(matchId);
};

const getRecentCommentary = async (matchId) => {
  const match = await matchRepo.findMatchById(matchId);
  if (!match) return null;
  return matchRepo.findRecentCommentary(matchId);
};

// ─── Teams ────────────────────────────────────────────────────────────────────

const listTeams = async () => {
  const result = await query(
    `
    SELECT
      c.club_id AS id,
      c.club_name AS name,
      c.display_name,
      c.country,
      c.home_ground,
      (SELECT COUNT(*) FROM matches m WHERE m.host_club_id = c.club_id OR m.opponent_club_id = c.club_id) AS total_matches,
      (SELECT COUNT(*) FROM matches m WHERE m.winning_team_id = c.club_id) AS won,
      (SELECT COUNT(*) FROM matches m WHERE m.winning_team_id IS NOT NULL AND m.winning_team_id != c.club_id AND (m.host_club_id = c.club_id OR m.opponent_club_id = c.club_id)) AS lost
    FROM club c
    WHERE c.is_approved = true
    ORDER BY c.club_name ASC;
    `
  );
  const rows = result.rows;
  return rows.map(present.presentTeam);
};

const getTeam = async (id) => {
  // The original teamRepo.findTeamWithStats(id) was using incorrect column names.
  // This updated query uses the correct `host_club_id` and `opponent_club_id`.
  const teamResult = await query(
    `
    SELECT
      c.club_id AS id,
      c.club_name AS name,
      c.display_name,
      c.country,
      c.home_ground,
      (SELECT COUNT(*) FROM matches m WHERE m.host_club_id = c.club_id OR m.opponent_club_id = c.club_id) AS total_matches,
      (SELECT COUNT(*) FROM matches m WHERE m.winning_team_id = c.club_id) AS won,
      (SELECT COUNT(*) FROM matches m WHERE m.winning_team_id IS NOT NULL AND m.winning_team_id != c.club_id AND (m.host_club_id = c.club_id OR m.opponent_club_id = c.club_id)) AS lost
    FROM club c
    WHERE c.club_id = $1
    `,
    [id]
  );

  const team = teamResult.rows[0];

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
  getRecentCommentary,
  listTeams,
  getTeam,
  listPlayers,
  getPlayer,
  getDashboardKpis
};
