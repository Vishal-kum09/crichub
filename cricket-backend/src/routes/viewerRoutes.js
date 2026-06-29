// Viewer routes — public, read-only. Mounted at /api/viewer in server.js.
const express = require('express');
const ctrl = require('../controllers/viewerController');

const router = express.Router();

// Matches
router.get('/matches', ctrl.getMatches);                  // ?status=live|scheduled|completed|all
router.get('/matches/:id', ctrl.getMatchById);
router.get('/matches/:id/scorecard', ctrl.getScorecard);
router.get('/matches/:id/commentary', ctrl.getCommentary);
router.get('/matches/:id/recent-commentary', ctrl.getRecentMatchCommentary);
router.get('/matches/:id/wagon-wheel', ctrl.getMatchWagonWheel);
router.get('/matches/:id/partnerships', ctrl.getMatchPartnerships);
router.get('/matches/:id/overs', ctrl.getMatchOvers);

// Teams
router.get('/teams', ctrl.getTeams);
router.get('/teams/:id', ctrl.getTeamById);

// Players
router.get('/players', ctrl.getPlayers);
router.get('/players/:id', ctrl.getPlayerById);

// Dashboard
router.get('/dashboard/kpis', ctrl.getDashboardKpis);

module.exports = router;
