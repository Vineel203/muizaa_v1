'use strict';

const { getContainer } = require('../config/container');

class ApiController {
  constructor() {
    const { masterDataService } = getContainer().services;
    this.masterDataService = masterDataService;
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
}

module.exports = ApiController;
