'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

const SELECT = `
  SELECT
    bp.*,
    l.name AS location_name,
    c.name AS consignor_name
  FROM booking_pickups bp
  LEFT JOIN locations l ON bp.location_id = l.id
  LEFT JOIN consignors c ON bp.consignor_id = c.id
`;

class BookingPickupRepository {
  async findByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${SELECT} WHERE bp.booking_id = $1 ORDER BY bp.sort_order ASC, bp.id ASC`,
      [bookingId]
    );
    return mapRowsToCamel(result.rows);
  }

  async replaceForBooking(bookingId, items, client = null) {
    const executor = client || { query };
    await executor.query('DELETE FROM booking_pickups WHERE booking_id = $1', [bookingId]);

    const created = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const result = await executor.query(
        `INSERT INTO booking_pickups (booking_id, sort_order, location_id, consignor_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [bookingId, i, item.locationId || null, item.consignorId || null]
      );
      created.push(mapRowToCamel(result.rows[0]));
    }
    return created;
  }
}

module.exports = BookingPickupRepository;
