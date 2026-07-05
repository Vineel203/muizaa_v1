'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

const SELECT = `
  SELECT
    bd.*,
    l.name AS location_name,
    c.name AS consignee_name
  FROM booking_deliveries bd
  LEFT JOIN locations l ON bd.location_id = l.id
  LEFT JOIN consignees c ON bd.consignee_id = c.id
`;

class BookingDeliveryRepository {
  async findByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${SELECT} WHERE bd.booking_id = $1 ORDER BY bd.sort_order ASC, bd.id ASC`,
      [bookingId]
    );
    return mapRowsToCamel(result.rows);
  }

  async replaceForBooking(bookingId, items, client = null) {
    const executor = client || { query };
    await executor.query('DELETE FROM booking_deliveries WHERE booking_id = $1', [bookingId]);

    const created = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const result = await executor.query(
        `INSERT INTO booking_deliveries (booking_id, sort_order, location_id, consignee_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [bookingId, i, item.locationId || null, item.consigneeId || null]
      );
      created.push(mapRowToCamel(result.rows[0]));
    }
    return created;
  }
}

module.exports = BookingDeliveryRepository;
