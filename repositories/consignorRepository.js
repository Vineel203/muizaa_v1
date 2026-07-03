'use strict';

const BaseRepository = require('./baseRepository');

class ConsignorRepository extends BaseRepository {
  constructor() {
    super('consignors');
  }

  async findOrCreateByName(name, client = null) {
    const existing = await this.findByName('name', name, client);
    if (existing) return existing;
    return this.create({ name }, client);
  }

  async search(term, limit = 20, client = null) {
    return this.searchByName('name', term, limit, client);
  }
}

module.exports = ConsignorRepository;
