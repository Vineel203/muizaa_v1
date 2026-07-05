'use strict';

const { getContainer } = require('../config/container');

class InvoiceController {
  constructor() {
    const { invoiceService } = getContainer().services;
    this.invoiceService = invoiceService;
  }

  async list(req, res, next) {
    try {
      res.render('invoices/list', {
        title: 'Invoices',
        filters: {
          dateFrom: req.query.dateFrom || '',
          dateTo: req.query.dateTo || '',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createForm(req, res, next) {
    try {
      res.render('invoices/form', {
        title: 'Create Invoice',
        invoice: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const bookingIds = req.body.bookingIds;
      const invoice = await this.invoiceService.create(
        { ...req.body, bookingIds },
        req.user
      );
      req.session.flash = { type: 'success', message: `Invoice ${invoice.invoiceNumber} created` };
      res.redirect(`/invoices/${invoice.id}`);
    } catch (error) {
      return res.status(error.statusCode || 500).render('invoices/form', {
        title: 'Create Invoice',
        invoice: req.body,
        error: error.isOperational ? error.message : 'Unable to create invoice. Please try again.',
      });
    }
  }

  async show(req, res, next) {
    try {
      const invoice = await this.invoiceService.getById(req.params.id);
      res.render('invoices/detail', {
        title: invoice.invoiceNumber,
        invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const invoice = await this.invoiceService.update(req.params.id, req.body, req.user);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, invoice });
      }
      req.session.flash = { type: 'success', message: 'Invoice updated successfully' };
      return res.redirect(`/invoices/${invoice.id}`);
    } catch (error) {
      next(error);
    }
  }

  async dataTable(req, res, next) {
    try {
      const { draw, start, length, search, orderColumn, orderDir, dateFrom, dateTo } = req.query;

      const result = await this.invoiceService.getDataTable({
        start: parseInt(start, 10) || 0,
        length: parseInt(length, 10) || 25,
        search: search?.value || search || '',
        orderColumn: orderColumn || 'created_at',
        orderDir: orderDir || 'desc',
        dateFrom: dateFrom || '',
        dateTo: dateTo || '',
      });

      res.json({
        draw: parseInt(draw, 10) || 1,
        recordsTotal: result.total,
        recordsFiltered: result.filtered,
        data: result.data.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          recipientDetails: inv.recipientDetails,
          bookingCount: inv.bookingCount,
          totalPackages: inv.totalPackages,
          totalWeight: inv.totalWeight,
          totalFreight: inv.totalFreight,
          createdAt: inv.createdAt,
          createdBy: inv.createdBy,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InvoiceController;
