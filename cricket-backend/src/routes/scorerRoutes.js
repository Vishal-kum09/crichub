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

// Live scoring lifecycle.
router.post('/matches/:id/initialize', ctrl.initialize);
router.post('/matches/:id/ball', ctrl.recordBall);
router.post('/matches/:id/wicket-wizard', ctrl.wicketWizard);
router.post('/matches/:id/undo', ctrl.undo);

module.exports = router;
