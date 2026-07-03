'use strict';

const BaseRepository = require('./baseRepository');
const { query } = require('../utils/db');
const { mapRowToCamel } = require('../utils/helpers');

class TruckOwnerRepository extends BaseRepository {
  constructor() {
    super('truck_owners');
  }

  async findByNameAndNumber(name, number, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM truck_owners
       WHERE LOWER(name) = LOWER($1)
       AND COALESCE(number, '') = COALESCE($2, '')
       LIMIT 1`,
      [name, number || null]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findOrCreateByNameAndNumber(name, number, client = null) {
    const existing = await this.findByNameAndNumber(name, number, client);
    if (existing) return existing;
    return this.create({ name, number: number || null }, client);
  }

  async search(term, limit = 20, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM truck_owners
       WHERE name ILIKE $1 OR number ILIKE $1
       ORDER BY name ASC
       LIMIT $2`,
      [`%${term}%`, limit]
    );
    return result.rows.map(mapRowToCamel);
  }
}

module.exports = TruckOwnerRepository;
