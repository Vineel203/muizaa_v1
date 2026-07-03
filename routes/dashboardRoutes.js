'use strict';

const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();
const dashboardController = new DashboardController();

router.get(
  '/dashboard',
  requireAuth,
  requirePermission('VIEW_DASHBOARD'),
  dashboardController.index.bind(dashboardController)
);

module.exports = router;
