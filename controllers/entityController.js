'use strict';

const { getContainer } = require('../config/container');

class EntityController {
  constructor() {
    const { entityService } = getContainer().services;
    this.entityService = entityService;
  }

  async show(req, res, next) {
    try {
      const { type, id } = req.params;
      const page = await this.entityService.getEntityPage(type, parseInt(id, 10));

      res.render('entities/show', {
        title: `${page.config.label}: ${page.entity[page.config.nameField]}`,
        ...page,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EntityController;
