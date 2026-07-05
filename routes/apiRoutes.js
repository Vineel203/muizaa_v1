'use strict';

const express = require('express');
const ApiController = require('../controllers/apiController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();
const apiController = new ApiController();

router.get(
  '/api/master-data/search',
  requireAuth,
  apiController.searchMasterData.bind(apiController)
);

router.post(
  '/api/transporters',
  requireAuth,
  apiController.createTransporter.bind(apiController)
);

router.post(
  '/api/trucks',
  requireAuth,
  apiController.createTruck.bind(apiController)
);

router.get(
  '/api/bookings/available-for-invoice',
  requireAuth,
  apiController.searchAvailableBookings.bind(apiController)
);

module.exports = router;
