'use strict';

const { getContainer } = require('../config/container');

class ApiController {
  constructor() {
    const { masterDataService, invoiceService } = getContainer().services;
    this.masterDataService = masterDataService;
    this.invoiceService = invoiceService;
  }

  async searchMasterData(req, res, next) {
    try {
      const { type, q } = req.query;
      if (!type || !q) {
        return res.json({ success: true, data: [] });
      }

      const results = await this.masterDataService.search(type, q);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  async createTransporter(req, res, next) {
    try {
      const transporter = await this.masterDataService.createTransporter(req.body);
      res.status(201).json({ success: true, data: transporter });
    } catch (error) {
      next(error);
    }
  }

  async createTruck(req, res, next) {
    try {
      const truck = await this.masterDataService.createTruck(req.body);
      res.status(201).json({ success: true, data: truck });
    } catch (error) {
      next(error);
    }
  }

  async searchAvailableBookings(req, res, next) {
    try {
      const { q } = req.query;
      const results = await this.invoiceService.searchAvailableBookings(q || '');
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApiController;
