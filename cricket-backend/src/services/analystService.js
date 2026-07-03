// Analyst service — thin pass-through to the nv_play aggregation repository.
// The repository already shapes each response; the service exists to keep the
// controller free of data-access and to host any future cross-aggregation logic.
const repo = require('../repositories/analystRepository');

const teamStreams = (filters) => repo.teamAggregations(filters);
const playerStreams = (filters) => repo.playerAggregations(filters);
const tournamentStreams = (filters) => repo.tournamentAggregations(filters);
const matchStreams = (filters) => repo.matchAggregations(filters);

const battingExecution = (filters) =>
  repo.battingExecution(filters);

const battingExecutionCharts = (filters) =>
  repo.battingExecutionCharts(filters);

const getRunsPerWicket = (filters) =>
  repo.runsPerWicket(filters);

const getTeams = () => repo.getTeams();

const coreAnalytics = (filters) =>
  repo.coreAnalytics(filters);

const getOppositionTeams = (homeTeam) =>
  repo.getOppositionTeams(homeTeam);

const getVenues = async (filters) => {
  return repo.getVenues(filters);
};

const getBatters = (
  homeTeam,
  batterStyle
) =>
  repo.getBatters(
    homeTeam,
    batterStyle
  );
  const getBowlerTypes = (homeTeam) =>
    repo.getBowlerTypes(homeTeam);


  const bowlingExecutionAnalytics = (filters) =>
    repo.bowlingExecutionAnalytics(filters);

  const getBowlers = (
    homeTeam,
    bowlerType
) =>
repo.getBowlers(
    homeTeam,
    bowlerType,
    );

const getBowlingExecutionCharts = (filters) =>
    repo.bowlingExecutionCharts(filters);

const getBattingKPIs = (filters) =>
  repo.battingKPIs(filters);

const getTopCatchTakers = (filters) =>
  repo.topCatchTakers(filters);

const getPartnershipAnalysis = (filters) =>
    repo.partnershipAnalysis(filters);

const getTopBattersAnalysis = (filters) =>
    repo.topBattersAnalysis(filters);

const getScoreBreakdown = (filters) =>
  repo.scoreBreakdown(filters);

const getShotDistribution = (filters) =>
  repo.shotDistribution(filters);

const getBowlingScoreBreakdown = (filters) =>
  repo.bowlingScoreBreakdown(filters);

const getBowlingShotDistribution = (filters) =>
  repo.bowlingShotDistribution(filters);

const getTopBowlers = (filters) =>
    repo.getTopBowlers(filters);

const getRunsStrikeRatePerWicket = filters =>
    repo.getRunsStrikeRatePerWicket(filters);

const getMaxOver = (filters) =>
    repo.getMaxOver(filters);

module.exports = {
  teamStreams,
  getBatters,
  getMaxOver,
  getTopCatchTakers,
  getRunsStrikeRatePerWicket,
  getBowlers,
  getTopBowlers,
  getBowlingScoreBreakdown,
  getBowlingShotDistribution,
  getShotDistribution,
  getPartnershipAnalysis,
  getTopBattersAnalysis,
  getScoreBreakdown,
  getRunsPerWicket,
  playerStreams,
  getBowlerTypes,
  getBattingKPIs,
  tournamentStreams,
  getBowlingExecutionCharts,
  bowlingExecutionAnalytics,
  coreAnalytics,
  getOppositionTeams,
  getVenues,
  matchStreams,
  battingExecution,
  battingExecutionCharts,
  getTeams
};
