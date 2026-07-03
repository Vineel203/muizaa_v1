'use strict';

const express = require('express');
const AuthController = require('../controllers/authController');
const authController = new AuthController();
const { redirectIfAuthenticated, requireAuth } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.get('/login', redirectIfAuthenticated, authController.showLogin.bind(authController));
router.post('/login', redirectIfAuthenticated, authController.login);
router.post('/logout', requireAuth, authController.logout.bind(authController));

module.exports = router;
