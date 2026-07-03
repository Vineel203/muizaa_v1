'use strict';

const BaseRepository = require('./baseRepository');
const { query } = require('../utils/db');
const { mapRowToCamel } = require('../utils/helpers');

class BankingDetailRepository extends BaseRepository {
  constructor() {
    super('banking_details');
  }

  async findByDetails(bankName, accountNumber, ifsc, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM banking_details
       WHERE LOWER(bank_name) = LOWER($1)
       AND COALESCE(account_number, '') = COALESCE($2, '')
       AND COALESCE(ifsc, '') = COALESCE($3, '')
       LIMIT 1`,
      [bankName, accountNumber || null, ifsc || null]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findOrCreateByDetails(bankName, accountNumber, ifsc, client = null) {
    const existing = await this.findByDetails(bankName, accountNumber, ifsc, client);
    if (existing) return existing;
    return this.create(
      {
        bank_name: bankName,
        account_number: accountNumber || null,
        ifsc: ifsc || null,
      },
      client
    );
  }

  async search(term, limit = 20, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM banking_details
       WHERE bank_name ILIKE $1 OR account_number ILIKE $1 OR ifsc ILIKE $1
       ORDER BY bank_name ASC
       LIMIT $2`,
      [`%${term}%`, limit]
    );
    return result.rows.map(mapRowToCamel);
  }
}

module.exports = BankingDetailRepository;
