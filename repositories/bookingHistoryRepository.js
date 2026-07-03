'use strict';

const { query } = require('../utils/db');
const { mapRowsToCamel } = require('../utils/helpers');

class BookingHistoryRepository {
  async create(entry, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `INSERT INTO booking_history
        (booking_id, changed_by, action_description, field_name, old_value, new_value, stage_from, stage_to, remark)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        entry.bookingId,
        entry.changedBy,
        entry.actionDescription,
        entry.fieldName || null,
        entry.oldValue != null ? String(entry.oldValue) : null,
        entry.newValue != null ? String(entry.newValue) : null,
        entry.stageFrom || null,
        entry.stageTo || null,
        entry.remark || null,
      ]
    );
    return result.rows[0];
  }

  async createMany(entries, client = null) {
    const results = [];
    for (const entry of entries) {
      results.push(await this.create(entry, client));
    }
    return results;
  }

  async findByBookingId(bookingId) {
    const result = await query(
      `SELECT * FROM booking_history
       WHERE booking_id = $1
       ORDER BY timestamp DESC, id DESC`,
      [bookingId]
    );
    return mapRowsToCamel(result.rows);
  }
}

module.exports = BookingHistoryRepository;
