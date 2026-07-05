'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const bookingRoutes = require('./bookingRoutes');
const entityRoutes = require('./entityRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const apiRoutes = require('./apiRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session?.user) return res.redirect('/dashboard');
  return res.redirect('/login');
});
router.get('/index.html', (req, res) => res.redirect('/'));

router.use(authRoutes);
router.use(dashboardRoutes);
router.use(bookingRoutes);
router.use(invoiceRoutes);
router.use(entityRoutes);
router.use(apiRoutes);

module.exports = router;
