// Analyst routes — mounted at /api/analyst in server.js. Guard stack:
// authenticate → requireApproved → requireRole('Analyst'). All endpoints accept
// the shared optional filter query params (see analystController.FilterSchema).
const express = require('express');
const ctrl = require('../controllers/analystController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

router.use(authenticate, requireApproved, requireRole('Analyst'));

router.get('/nvplay-streams/team', ctrl.getTeamStreams);
router.get('/nvplay-streams/player', ctrl.getPlayerStreams);
router.get('/nvplay-streams/tournament', ctrl.getTournamentStreams);
router.get('/nvplay-streams/match', ctrl.getMatchStreams);

module.exports = router;
