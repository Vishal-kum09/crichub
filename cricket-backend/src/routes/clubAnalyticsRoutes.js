const express = require('express');
const ctrl = require('../controllers/clubAnalyticsController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

router.use(
  authenticate,
  requireApproved,
  requireRole('Club_Admin', 'Scorer')
);

router.get('/matches', ctrl.listMatches);
router.get('/matches/:matchId/analysis', ctrl.getMatchAnalysis);
router.get('/players', ctrl.listPlayers);
router.get('/players/:playerId/performance', ctrl.getPlayerPerformance);

module.exports = router;
