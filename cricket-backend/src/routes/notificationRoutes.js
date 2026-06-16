const express = require('express');
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authenticate');

const router = express.Router();

// All notification routes require the user to be logged in
router.use(authenticate);

// GET /api/notifications -> Fetches all notifications
router.get('/', ctrl.getMyNotifications);

// PUT /api/notifications/read -> Marks all as read
router.put('/read', ctrl.markAllAsRead);

module.exports = router;