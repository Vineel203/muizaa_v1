'use strict';

const express = require('express');
const EntityController = require('../controllers/entityController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();
const entityController = new EntityController();

router.get(
  '/entities/:type/:id',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  entityController.show.bind(entityController)
);

module.exports = router;
