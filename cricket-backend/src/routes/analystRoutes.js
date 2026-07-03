// Analyst routes — mounted at /api/analyst in server.js. Guard stack:
// authenticate → requireApproved → requireRole('Analyst'). All endpoints accept
// the shared optional filter query params (see analystController.FilterSchema).
const express = require('express');
const ctrl = require('../controllers/analystController');

const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();


// TEMPORARY: Disable auth while testing nv_play dashboard
//router.use(authenticate, requireApproved, requireRole('Analyst'));

router.get('/nvplay-streams/team', ctrl.getTeamStreams);
router.get('/nvplay-streams/player', ctrl.getPlayerStreams);
router.get('/nvplay-streams/tournament', ctrl.getTournamentStreams);
router.get('/nvplay-streams/match', ctrl.getMatchStreams);
router.get('/teams', ctrl.getTeams);
router.post(
  '/core',
  ctrl.getCoreAnalytics
); 

router.get(
  '/batting-execution',
  ctrl.getBattingExecution
);

router.get(
  '/batting-execution/charts',
  ctrl.getBattingExecutionCharts
);

router.get(
  '/batting-execution/runs-per-wicket',
  ctrl.getRunsPerWicket
);

router.get(
  '/opposition-teams',
  ctrl.getOppositionTeams
);

router.get(
  '/venues',
  ctrl.getVenues
);

router.get('/batters', ctrl.getBatters);

router.get(
    "/bowling-execution",
    ctrl.getBowlingExecution
);

router.get(
    "/bowler-types",
    ctrl.getBowlerTypes
);
router.get(
    "/bowlers",
    ctrl.getBowlers
);

router.get(
  "/bowling-execution/charts",
  ctrl.getBowlingExecutionCharts
);

router.get(
  '/batting-execution/kpis',
  ctrl.getBattingKPIs
);

router.get(
  '/fielding/top-catch-takers',
  ctrl.getTopCatchTakers
);

router.get(
    "/batting-execution/partnership-analysis",
    ctrl.getPartnershipAnalysis
);
router.get(
    "/batting-execution/top-batters",
    ctrl.getTopBattersAnalysis
);
router.get(
  "/batting-execution/score-breakdown",
  ctrl.getScoreBreakdown
);

router.get(
  "/batting-execution/shot-distribution",
  ctrl.getShotDistribution
);

router.get(
  "/bowling-execution/score-breakdown",
  ctrl.getBowlingScoreBreakdown
);

router.get(
  "/bowling-execution/shot-distribution",
  ctrl.getBowlingShotDistribution
);

router.get(
    '/top-bowlers',
    ctrl.getTopBowlers
);

router.get(
"/bowling-execution/runs-strikerate-per-wicket",
ctrl.getRunsStrikeRatePerWicket
);

router.get(
    "/max-over",
    ctrl.getMaxOver
);

module.exports = router;
