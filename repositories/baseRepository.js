'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findAll(limit = 100, offset = 0, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return mapRowsToCamel(result.rows);
  }

  async searchByName(column, term, limit = 20, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM ${this.tableName}
       WHERE ${column} ILIKE $1
       ORDER BY ${column} ASC
       LIMIT $2`,
      [`%${term}%`, limit]
    );
    return mapRowsToCamel(result.rows);
  }

  async findByName(column, name, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE LOWER(${column}) = LOWER($1) LIMIT 1`,
      [name]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async create(data, client = null) {
    const executor = client || { query };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await executor.query(
      `INSERT INTO ${this.tableName} (${columns})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );
    return mapRowToCamel(result.rows[0]);
  }

  async update(id, data, client = null) {
    const executor = client || { query };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await executor.query(
      `UPDATE ${this.tableName}
       SET ${setClause}
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async delete(id, client = null) {
    const executor = client || { query };
    await executor.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }
}

module.exports = BaseRepository;
