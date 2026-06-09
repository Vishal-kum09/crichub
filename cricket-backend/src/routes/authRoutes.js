// Auth routes — mounted at /api/auth in server.js.
const express = require('express');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middlewares/authenticate');

const router = express.Router();

router.post('/register', ctrl.register);            // individual signup
router.post('/register/club', ctrl.registerClub);   // club registration (pending approval)
router.post('/otp/send', ctrl.sendOtp);             // generate + log 6-digit OTP
router.post('/otp/verify', ctrl.verifyOtp);         // verify OTP code
router.post('/login', ctrl.login);                  // returns signed JWT
router.get('/me', authenticate, ctrl.me);           // current user from token

module.exports = router;
