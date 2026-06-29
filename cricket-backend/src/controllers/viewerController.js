// Viewer controllers — public read endpoints. Errors delegate to the central
// errorHandler via next(err); missing resources raise AppError(404).
const viewerService = require('../services/viewerService');
const { AppError } = require('../middlewares/errorHandler');
const { query } = require('../../db');

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

const getRecentMatchCommentary = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const commentary = await viewerService.getRecentCommentary(req.params.id);
    if (commentary === null) throw new AppError('Match not found', 404);
    // The frontend expects the data inside a 'commentary' key
    res.json({ commentary });
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

// Backend Route: GET /api/viewer/matches/:matchId/wagon-wheel
// Backend Route: GET /api/viewer/matches/:id/wagon-wheel
const getMatchWagonWheel = async (req, res, next) => {
  const matchId = req.params.id; // 🟢 FIX: Extracting 'id' instead of 'matchId'
  try {
    if (!isUuid(matchId)) throw new AppError('Match not found', 404);
    const sql = `
      SELECT 
        d.runs_batter, 
        d.is_boundary_four, 
        d.is_boundary_six, 
        d.wagon_x, 
        d.wagon_y, 
        d.field_area,
        p.batting_style
      FROM deliveries d
      JOIN innings i ON d.innings_id = i.innings_id
      LEFT JOIN players p ON p.players_id = d.batter_id
      WHERE i.match_id = $1 AND d.wagon_x IS NOT NULL;
    `;
    const result = await query(sql, [matchId]);
    res.json({ success: true, shots: result.rows });
  } catch (error) {
    next(error);
  }
};

const getMatchPartnerships = async (req, res, next) => {
  const matchId = req.params.id; // 🟢 FIX: Extracting 'id' instead of 'matchId'
  try {
    if (!isUuid(matchId)) throw new AppError('Match not found', 404);
    
    const sql = `
      SELECT p.partnerships_id,
             i.innings_number,
             p.wicket_number,
             COALESCE(concat(p1.display_name, ' & ', p2.display_name), 'Partnership') AS batsmen,
             p.runs,
             p.balls,
             p.batter1_runs,
             p.batter1_balls,
             p.batter2_runs,
             p.batter2_balls
        FROM partnerships p
        JOIN innings i ON p.innings_id = i.innings_id
   LEFT JOIN players p1 ON p1.players_id = p.batter1_id
   LEFT JOIN players p2 ON p2.players_id = p.batter2_id
       WHERE i.match_id = $1 
       ORDER BY i.innings_number, p.wicket_number
    `; 
    
    const result = await query(sql, [matchId]);
    res.json({ count: result.rows.length, partnerships: result.rows });
  } catch (error) {
    next(error);
  }
};

const getMatchOvers = async (req, res, next) => {
  const matchId = req.params.id; // 🟢 FIX: Extracting 'id' instead of 'matchId'
  try {
    if (!isUuid(matchId)) throw new AppError('Match not found', 404);
    const sql = `
      SELECT o.overs_id,
             i.innings_number,
             o.over_number,
             o.runs_scored,
             o.wickets_taken,
             o.legal_balls,
             o.dot_balls,
             o.boundaries_four,
             o.boundaries_six,
             o.wides,
             o.no_balls,
             o.is_maiden,
             o.cumulative_runs,
             o.cumulative_wickets,
             o.run_rate,
             o.phase
        FROM overs o
        JOIN innings i ON o.innings_id = i.innings_id
       WHERE i.match_id = $1  
       ORDER BY i.innings_number, o.over_number
    `;
    const result = await query(sql, [matchId]);
    res.json({ count: result.rows.length, overs: result.rows });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getMatchWagonWheel,
  getMatchPartnerships,
  getMatchOvers,
  getMatches,
  getMatchById,
  getScorecard,
  getCommentary,
  getRecentMatchCommentary,
  getTeams,
  getTeamById,
  getPlayers,
  getPlayerById,
  getDashboardKpis
};
