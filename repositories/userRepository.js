'use strict';

const BaseRepository = require('./baseRepository');
const { query } = require('../utils/db');
const { mapRowToCamel } = require('../utils/helpers');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async createUser({ email, passwordHash, role, fullName }, client = null) {
    return this.create(
      {
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        full_name: fullName,
      },
      client
    );
  }

  async updateLastLogin(id, client = null) {
    return this.update(id, { updated_at: new Date() }, client);
  }
}

module.exports = UserRepository;
