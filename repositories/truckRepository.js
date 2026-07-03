'use strict';

const BaseRepository = require('./baseRepository');
const { query } = require('../utils/db');
const { mapRowToCamel } = require('../utils/helpers');

class TruckRepository extends BaseRepository {
  constructor() {
    super('trucks');
  }

  async findByNumber(number, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      'SELECT * FROM trucks WHERE LOWER(number) = LOWER($1) LIMIT 1',
      [number]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findOrCreateByNumber(number, capacity, client = null) {
    const existing = await this.findByNumber(number, client);
    if (existing) {
      if (capacity && !existing.capacity) {
        return this.update(existing.id, { capacity }, client);
      }
      return existing;
    }
    return this.create({ number, capacity: capacity || null }, client);
  }

  async search(term, limit = 20, client = null) {
    return this.searchByName('number', term, limit, client);
  }
}

module.exports = TruckRepository;
