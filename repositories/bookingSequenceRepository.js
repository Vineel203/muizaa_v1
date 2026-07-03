'use strict';

const { formatBookingId } = require('../utils/helpers');

class BookingSequenceRepository {
  async getNextBookingId(client) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const upsert = await client.query(
      `INSERT INTO booking_sequences (year, month, last_serial)
       VALUES ($1, $2, 1)
       ON CONFLICT (year, month)
       DO UPDATE SET last_serial = booking_sequences.last_serial + 1
       RETURNING last_serial`,
      [year, month]
    );

    const serial = upsert.rows[0].last_serial;
    return formatBookingId(year, month, serial);
  }
}

module.exports = BookingSequenceRepository;
