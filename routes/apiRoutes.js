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

module.exports = router;
