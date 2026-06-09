// Viewer controllers — public read endpoints. Errors delegate to the central
// errorHandler via next(err); missing resources raise AppError(404).
const viewerService = require('../services/viewerService');
const { AppError } = require('../middlewares/errorHandler');

const VALID_STATUS = new Set(['live', 'scheduled', 'completed', 'all']);

// All schema ids are UUIDs. A non-UUID path param can never match a row, and
// passing it to Postgres would raise a 22P02 (→ 500), so treat it as not found.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id) => typeof id === 'string' && UUID_RE.test(id);

const getMatches = async (req, res, next) => {
  try {
    const status = req.query.status || 'all';
    if (!VALID_STATUS.has(status)) {
      throw new AppError(`Invalid status filter: ${status}`, 400);
    }
    const matches = await viewerService.listMatches(status === 'all' ? null : status);
    res.json({ count: matches.length, matches });
  } catch (err) { next(err); }
};

const getMatchById = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const match = await viewerService.getMatch(req.params.id);
    if (!match) throw new AppError('Match not found', 404);
    res.json(match);
  } catch (err) { next(err); }
};

const getScorecard = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const scorecard = await viewerService.getScorecard(req.params.id);
    if (!scorecard) throw new AppError('Match not found', 404);
    res.json(scorecard);
  } catch (err) { next(err); }
};

const getCommentary = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const commentary = await viewerService.getCommentary(req.params.id);
    if (commentary === null) throw new AppError('Match not found', 404);
    res.json({ count: commentary.length, deliveries: commentary });
  } catch (err) { next(err); }
};

const getTeams = async (req, res, next) => {
  try {
    const teams = await viewerService.listTeams();
    res.json({ count: teams.length, teams });
  } catch (err) { next(err); }
};

const getTeamById = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Team not found', 404);
    const team = await viewerService.getTeam(req.params.id);
    if (!team) throw new AppError('Team not found', 404);
    res.json(team);
  } catch (err) { next(err); }
};

const getPlayers = async (req, res, next) => {
  try {
    const players = await viewerService.listPlayers();
    res.json({ count: players.length, players });
  } catch (err) { next(err); }
};

const getPlayerById = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Player not found', 404);
    const player = await viewerService.getPlayer(req.params.id);
    if (!player) throw new AppError('Player not found', 404);
    res.json(player);
  } catch (err) { next(err); }
};

const getDashboardKpis = async (req, res, next) => {
  try {
    const kpis = await viewerService.getDashboardKpis();
    res.json(kpis);
  } catch (err) { next(err); }
};

module.exports = {
  getMatches,
  getMatchById,
  getScorecard,
  getCommentary,
  getTeams,
  getTeamById,
  getPlayers,
  getPlayerById,
  getDashboardKpis
};
