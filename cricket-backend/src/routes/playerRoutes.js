// Player routes — mounted at /api/player in server.js. Guard stack:
// authenticate → requireApproved → requireRole('Player').
const express = require('express');
const ctrl = require('../controllers/playerController');
const { authenticate } = require('../middlewares/authenticate');
const { requireApproved } = require('../middlewares/requireApproved');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

router.use(authenticate, requireApproved, requireRole('Player'));

router.get('/my-performances', ctrl.getMyPerformances);

module.exports = router;
