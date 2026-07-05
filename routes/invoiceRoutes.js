'use strict';

const express = require('express');
const InvoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();
const invoiceController = new InvoiceController();

router.get(
  '/invoices',
  requireAuth,
  requirePermission('MANAGE_INVOICES'),
  invoiceController.list.bind(invoiceController)
);

router.get(
  '/invoices/new',
  requireAuth,
  requirePermission('MANAGE_INVOICES'),
  invoiceController.createForm.bind(invoiceController)
);

router.post(
  '/invoices',
  requireAuth,
  requirePermission('MANAGE_INVOICES'),
  invoiceController.create.bind(invoiceController)
);

router.get(
  '/invoices/data',
  requireAuth,
  requirePermission('MANAGE_INVOICES'),
  invoiceController.dataTable.bind(invoiceController)
);

router.get(
  '/invoices/:id',
  requireAuth,
  requirePermission('MANAGE_INVOICES'),
  invoiceController.show.bind(invoiceController)
);

router.post(
  '/invoices/:id',
  requireAuth,
  requirePermission('MANAGE_INVOICES'),
  invoiceController.update.bind(invoiceController)
);

module.exports = router;
