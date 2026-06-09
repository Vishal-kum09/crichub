// Analyst controllers — read the optional filter query params and forward them
// to the service. The repository builds the WHERE clause dynamically, applying
// only the filters actually present, so no defaulting is needed here.
const { z } = require('zod');
const analystService = require('../services/analystService');

// All filters optional; unknown params are ignored. Coercions keep ints as ints.
const FilterSchema = z.object({
  tournament_id: z.string().optional(),
  home_team_id: z.string().optional(),
  opposition_team_id: z.string().optional(),
  home_away: z.enum(['home', 'away', 'neutral']).optional(),
  toss_result: z.enum(['won', 'lost']).optional(),
  match_type: z.string().optional(),
  batter_id: z.string().optional(),
  bowler_id: z.string().optional(),
  bowler_type: z.string().optional(),
  batter_hand: z.string().optional(),
  bowler_hand: z.string().optional(),
  venue: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  over_min: z.coerce.number().int().optional(),
  over_max: z.coerce.number().int().optional()
}).passthrough();

const parseFilters = (req) => FilterSchema.parse(req.query);

const getTeamStreams = async (req, res, next) => {
  try {
    res.json(await analystService.teamStreams(parseFilters(req)));
  } catch (err) { next(err); }
};

const getPlayerStreams = async (req, res, next) => {
  try {
    res.json(await analystService.playerStreams(parseFilters(req)));
  } catch (err) { next(err); }
};

const getTournamentStreams = async (req, res, next) => {
  try {
    res.json(await analystService.tournamentStreams(parseFilters(req)));
  } catch (err) { next(err); }
};

const getMatchStreams = async (req, res, next) => {
  try {
    res.json(await analystService.matchStreams(parseFilters(req)));
  } catch (err) { next(err); }
};

module.exports = {
  getTeamStreams,
  getPlayerStreams,
  getTournamentStreams,
  getMatchStreams,
  FilterSchema
};
