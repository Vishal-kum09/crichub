// Club-admin routes — mounted at /api/club-admin in server.js.
const express = require('express');
const ctrl = require('../controllers/clubAdminController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

// Central secure guard stack for all endpoints below
router.use(authenticate, requireApproved, requireRole('Club_Admin'));

// Direct Operational Player Onboarding
router.post('/players/direct-register', ctrl.directRegisterPlayer);

// Approvals
router.get('/approvals/pending', ctrl.getPendingApprovals);
router.put('/approvals/:id', ctrl.updateApproval);

// Match & Tournament Creation
router.post('/matches', ctrl.createMatch);
router.post('/tournaments', ctrl.createTournament);

// Teams & Scorer dispatch
router.get('/teams', ctrl.getTeams);
router.post('/teams', ctrl.createTeam);
router.put('/teams/:team_id', ctrl.updateTeam);
router.delete('/teams/:team_id', ctrl.deleteTeam);
router.get('/teams/:team_id/players', ctrl.getTeamPlayers);
router.post('/teams/:team_id/players', ctrl.addTeamPlayer);
router.delete('/teams/:team_id/players/:player_id', ctrl.removeTeamPlayer);
router.post('/assign-scorer', ctrl.assignScorer);

// Roster operations
router.get('/roster/matches', ctrl.getRosterMatches);
router.get('/roster/players', ctrl.getRosterPlayers);
router.get('/roster/scorers', ctrl.getRosterScorers);
router.put('/players/:id', ctrl.updatePlayerDirect);
router.delete('/players/:id', ctrl.deletePlayerDirect);

// Cross-Club match endpoints
router.get('/matches/incoming', ctrl.getIncomingMatchRequests);
router.put('/matches/:match_id/accept', ctrl.acceptMatchRequest);
router.put('/matches/:match_id/reject', ctrl.rejectMatchRequest);

module.exports = router;
