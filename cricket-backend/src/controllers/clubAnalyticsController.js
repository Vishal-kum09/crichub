const service = require('../services/clubAnalyticsService');

const listMatches = async (req, res, next) => {
  try {
    const matches = await service.listRecentMatches(req.user);
    res.json({ matches });
  } catch (err) { next(err); }
};

const listPlayers = async (req, res, next) => {
  try {
    const players = await service.listClubPlayers(req.user);
    res.json({ players });
  } catch (err) { next(err); }
};

const getPlayerPerformance = async (req, res, next) => {
  try {
    const data = await service.getPlayerPerformance(req.user, req.params.playerId);
    res.json(data);
  } catch (err) { next(err); }
};

const getMatchAnalysis = async (req, res, next) => {
  try {
    const data = await service.getMatchAnalysis(req.user, req.params.matchId);
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = {
  listMatches,
  listPlayers,
  getPlayerPerformance,
  getMatchAnalysis,
};
