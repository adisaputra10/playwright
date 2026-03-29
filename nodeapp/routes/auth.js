const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated, ensureGuest } = require('../middleware/auth');

router.get('/', authController.home);
router.get('/dashboard', ensureAuthenticated, authController.dashboard);
router.get('/login', ensureGuest, authController.showLogin);
router.post('/login', ensureGuest, authController.login);
router.get('/register', ensureGuest, authController.showRegister);
router.post('/register', ensureGuest, authController.register);
router.get('/logout', ensureAuthenticated, authController.logout);

module.exports = router;
