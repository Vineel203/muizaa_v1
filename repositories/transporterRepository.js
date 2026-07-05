'use strict';

const BaseRepository = require('./baseRepository');
const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

const SELECT = `
  SELECT
    t.*,
    bd.bank_name,
    bd.account_number,
    bd.ifsc
  FROM transporters t
  LEFT JOIN banking_details bd ON t.banking_detail_id = bd.id
`;

class TransporterRepository extends BaseRepository {
  constructor() {
    super('transporters');
  }

  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(`${SELECT} WHERE t.id = $1`, [id]);
    return mapRowToCamel(result.rows[0]);
  }

  async findOrCreateByName(name, client = null) {
    const existing = await this.findByName('name', name, client);
    if (existing) return existing;
    return this.create({ name }, client);
  }

  async createWithDetails(data, client = null) {
    const executor = client || { query };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await executor.query(
      `INSERT INTO transporters (${columns}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    return this.findById(result.rows[0].id, client);
  }

  async search(term, limit = 20, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${SELECT}
       WHERE t.name ILIKE $1
          OR t.phone_number ILIKE $1
          OR t.operating_routes ILIKE $1
       ORDER BY t.name ASC
       LIMIT $2`,
      [`%${term}%`, limit]
    );
    return mapRowsToCamel(result.rows);
  }
}

module.exports = TransporterRepository;
