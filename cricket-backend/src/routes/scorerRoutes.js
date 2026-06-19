// Scorer routes — live match scoring. Mounted at /api/scorer in server.js.
// Every route is gated: authenticate → requireApproved → requireRole('Scorer').
const express = require('express');
const ctrl = require('../controllers/scorerController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

// Apply the scorer guard stack to every route in this router.
router.use(authenticate, requireApproved, requireRole('Scorer'));

// Fixture list for the scorer dashboard (declared before :id paths).
router.get('/matches/assigned', ctrl.assignedMatches);
router.get('/assigned-matches', ctrl.assignedMatches);
router.get('/my-completed-matches', ctrl.completedMatches);

// Match setup preview (rosters + metadata).
router.get('/matches/:id/preview', ctrl.matchPreview);

// 🟢 ADDED: Fetch the current live scorecard calculations (runs, balls, overs, wickets)
router.get('/matches/:id/live', ctrl.getLiveState); 

// Live scoring lifecycle.
router.post('/matches/:id/initialize', ctrl.initialize);
router.post('/matches/:id/start-second-innings', ctrl.startSecondInnings);
router.post('/matches/:id/ball', ctrl.recordBall);
router.post('/matches/:id/wicket-wizard', ctrl.wicketWizard);
router.post('/matches/:id/undo', ctrl.undo);

router.get('/matches/:id/audio-settings', ctrl.getAudioSettings);
router.post('/matches/:id/audio-settings', ctrl.saveAudioSettings);

module.exports = router;
