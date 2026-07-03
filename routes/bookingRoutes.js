'use strict';

const express = require('express');
const BookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();
const bookingController = new BookingController();

router.get(
  '/bookings',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.list.bind(bookingController)
);

router.get(
  '/bookings/new',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.createForm.bind(bookingController)
);

router.post(
  '/bookings',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.create.bind(bookingController)
);

router.get(
  '/bookings/data',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.dataTable.bind(bookingController)
);

router.get(
  '/bookings/:id',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.show.bind(bookingController)
);

router.get(
  '/bookings/:id/edit',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.editForm.bind(bookingController)
);

router.post(
  '/bookings/:id',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.update.bind(bookingController)
);

router.post(
  '/bookings/:id/stage',
  requireAuth,
  requirePermission('MANAGE_BOOKINGS'),
  bookingController.transitionStage.bind(bookingController)
);

module.exports = router;
