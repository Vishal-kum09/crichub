// Super-admin routes — mounted at /api/super-admin in server.js. Guard stack:
// authenticate → requireApproved → requireRole('Super_Admin'). Super admins are
// platform-wide and bypass tenant isolation by design.
const express = require('express');
const ctrl = require('../controllers/superAdminController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

router.use(authenticate, requireApproved, requireRole('Super_Admin'));

// Clubs directory + drill-down
router.get('/clubs', ctrl.getClubs);
router.get('/clubs/:id/members', ctrl.getClubMembers);

// Pending club approvals inbox
router.get('/approvals/pending', ctrl.getPendingApprovals);

// Approve a club
router.put('/clubs/:id/approve', ctrl.approveClub);

// Irreversible data-audit hard delete of a match + all child records
router.delete('/data-audit/:match_id', ctrl.deleteDataAudit);

module.exports = router;
