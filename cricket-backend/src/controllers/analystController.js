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
  match_result: z.string().optional(), 
  match_type: z.string().optional(),
  batter_id: z.string().optional(),
  bowler_id: z.string().optional(),
  bowler_type: z.string().optional(),
  batter_hand: z.string().optional(),
  bowler_hand: z.string().optional(),
  bowler: z.string().optional(),
  bowler_style: z.string().optional(),
  bowler_action: z.string().optional(),
  bat_field_first: z.string().optional(),
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

const getTeams = async (req, res, next) => {
  try {
    res.json(await analystService.getTeams());
  } catch (err) {
    next(err);
  }
};

const getBattingExecution = async (req, res, next) => {
  try {
    res.json(
      await analystService.battingExecution(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getBattingExecutionCharts = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.battingExecutionCharts(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};


const getRunsPerWicket = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getRunsPerWicket(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getBattingKPIs = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getBattingKPIs(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getTopCatchTakers = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getTopCatchTakers(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getCoreAnalytics = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.coreAnalytics(
        req.body || {}
      )
    );
  } catch (err) {
    next(err);
  }
};

const getOppositionTeams = async (req, res, next) => {
  try {

    res.json(
      await analystService.getOppositionTeams(
        req.query.home_team_id
      )
    );

  } catch (err) {
    next(err);
  }
};

const getVenues = async (req,res,next) => {
  try {
    res.json(
      await analystService.getVenues(
        parseFilters(req)
      )
    );
  } catch(err) {
    next(err);
  }
};


const getBatters = async (
  req,
  res,
  next
) => {
  
  try {
    console.log(
  'BATTER API PARAM:',
  req.query.home_team_id
);
    const {
  home_team_id,
  batter_style
} = req.query;

    res.json(
      await analystService.getBatters(
  home_team_id,
  batter_style
)
    );
  } catch (err) {
    next(err);
  }
};

const getBowlingExecution = async (req,res,next)=>{
    try{
        res.json(
            await analystService.bowlingExecutionAnalytics(
                parseFilters(req)
            )
        );
    }catch(err){
        next(err);
    }
};



const getBowlerTypes = async (req, res, next) => {

    try {

        res.json(
            await analystService.getBowlerTypes(
                req.query.home_team_id
            )
        );

    } catch (err) {

        next(err);

    }

};

const getBowlers = async (req, res, next) => {

    try {

        res.json(
await analystService.getBowlers(
    req.query.home_team_id,
    req.query.bowler_type,
    req.query.bowler_style
)
        );

    } catch (err) {

        next(err);

    }

};

const getBowlingExecutionCharts = async (req, res) => {
  try {
    const data = await analystService.getBowlingExecutionCharts(req.query);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getPartnershipAnalysis = async (req,res,next)=>{
    try{
        res.json(
            await analystService.getPartnershipAnalysis(
                parseFilters(req)
            )
        );
    }catch(err){
        next(err);
    }
}

const getTopBattersAnalysis = async (req,res,next)=>{
    try{
        res.json(
            await analystService.getTopBattersAnalysis(
                parseFilters(req)
            )
        );
    }catch(err){
        next(err);
    }
}

const getScoreBreakdown = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getScoreBreakdown(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};
const getShotDistribution = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getShotDistribution(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getBowlingScoreBreakdown = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getBowlingScoreBreakdown(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getBowlingShotDistribution = async (
  req,
  res,
  next
) => {
  try {
    res.json(
      await analystService.getBowlingShotDistribution(
        parseFilters(req)
      )
    );
  } catch (err) {
    next(err);
  }
};

const getTopBowlers = async (req, res, next) => {
    try {
        res.json(
            await analystService.getTopBowlers(
                parseFilters(req)
            )
        );
    } catch (err) {
        next(err);
    }
};

const getRunsStrikeRatePerWicket = async (req, res, next) => {
    try {
        res.json(
            await analystService.getRunsStrikeRatePerWicket(
                parseFilters(req)
            )
        );
    } catch (err) {
        next(err);
    }
};

const getMaxOver = async (req, res, next) => {
    try {

        const filters = parseFilters(req);

        const result = await analystService.getMaxOver(filters);

        res.json(result);

    } catch (err) {
        next(err);
    }
};
module.exports = {
  getTeamStreams,
  getTeams,
  getBatters,
  getBowlers,
  getMaxOver,
  getTopBowlers,
  getRunsStrikeRatePerWicket,
  getBowlingScoreBreakdown,
  getBowlingShotDistribution,
  getScoreBreakdown,
  getPartnershipAnalysis,
  getShotDistribution,
  getTopBattersAnalysis,
  getBowlingExecutionCharts,
  getBowlerTypes,
  getRunsPerWicket,
  getTopCatchTakers,
  getPlayerStreams,
  getTournamentStreams,
  getOppositionTeams,
  getBattingKPIs,
  getBowlingExecution,
  getVenues,
  getCoreAnalytics,
  getMatchStreams,
  getBattingExecution,
  getBattingExecutionCharts,
  getTopBowlers,
  FilterSchema
};
