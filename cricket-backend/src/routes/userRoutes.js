const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// --- BULLETPROOF MIDDLEWARE IMPORT ---
// Yeh logic automatically detect karega ki aapki authenticate.js file kya export kar rahi hai
const authModule = require('../middlewares/authenticate');

const authenticate = 
  authModule.authenticateToken || 
  authModule.verifyToken || 
  authModule.authenticate || 
  authModule.checkAuth || 
  authModule.requireAuth ||
  authModule; // Fallback agar bina curly brackets ke export hua ho

// --- ROUTES ---
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.put('/password', authenticate, userController.updatePassword);
router.put('/preferences', authenticate, userController.updatePreferences);
router.delete('/account', authenticate, userController.deleteAccount);

module.exports = router;