// Club-admin routes — mounted at /api/club-admin in server.js. Guard stack:
// authenticate → requireApproved → requireRole('Club_Admin'). Tenant isolation
// for resource-id routes (approvals) is enforced in the service against the
// JWT club_id; requireSameClub is applied where a club_id travels in the route.
const express = require('express');
const ctrl = require('../controllers/clubAdminController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

router.use(authenticate, requireApproved, requireRole('Club_Admin'));

// Approvals
router.get('/approvals/pending', ctrl.getPendingApprovals);
router.put('/approvals/:id', ctrl.updateApproval);

// Creation
router.post('/matches', ctrl.createMatch);
router.post('/tournaments', ctrl.createTournament);

// Roster (all club-scoped)
router.get('/roster/matches', ctrl.getRosterMatches);
router.get('/roster/players', ctrl.getRosterPlayers);
router.get('/roster/scorers', ctrl.getRosterScorers);

module.exports = router;
