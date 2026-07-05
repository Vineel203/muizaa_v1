'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

const GOODS_FINANCE_COLUMNS = `
  company_freight, advance,
  loading_hamali, unloading_hamali, balance
`;

class BookingGoodsItemRepository {
  async findByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM booking_goods_items
       WHERE booking_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [bookingId]
    );
    return mapRowsToCamel(result.rows);
  }

  async replaceForBooking(bookingId, items, client = null) {
    const executor = client || { query };
    await executor.query('DELETE FROM booking_goods_items WHERE booking_id = $1', [bookingId]);

    const created = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const result = await executor.query(
        `INSERT INTO booking_goods_items
          (booking_id, sort_order, description, packages, package_name, weight_kgs,
           unload_packages, unload_weight_kgs,
           ${GOODS_FINANCE_COLUMNS})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          bookingId,
          i,
          item.description || null,
          item.packages ?? null,
          item.packageName || null,
          item.weightKgs ?? null,
          item.unloadPackages ?? null,
          item.unloadWeightKgs ?? null,
          item.companyFreight ?? null,
          item.advance ?? null,
          item.loadingHamali ?? null,
          item.unloadingHamali ?? null,
          item.balance ?? null,
        ]
      );
      created.push(mapRowToCamel(result.rows[0]));
    }
    return created;
  }
}

module.exports = BookingGoodsItemRepository;
