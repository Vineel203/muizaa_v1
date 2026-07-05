'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel, attachGoodsFinanceTotals } = require('../utils/helpers');

const GOODS_TOTALS_SELECT = `
    (
      SELECT COALESCE(SUM(bgi.company_freight), 0)::float
      FROM booking_goods_items bgi WHERE bgi.booking_id = b.id
    ) AS total_company_freight,
    (
      SELECT COALESCE(SUM(bgi.advance), 0)::float
      FROM booking_goods_items bgi WHERE bgi.booking_id = b.id
    ) AS total_advance,
    (
      SELECT COALESCE(SUM(bgi.loading_hamali), 0)::float
      FROM booking_goods_items bgi WHERE bgi.booking_id = b.id
    ) AS total_loading_hamali,
    (
      SELECT COALESCE(SUM(bgi.unloading_hamali), 0)::float
      FROM booking_goods_items bgi WHERE bgi.booking_id = b.id
    ) AS total_unloading_hamali,
    (
      SELECT COALESCE(SUM(bgi.balance), 0)::float
      FROM booking_goods_items bgi WHERE bgi.booking_id = b.id
    ) AS total_balance
`;

const BOOKING_SELECT = `
  SELECT
    b.*,
    tr.name AS transporter_name,
    tr.phone_number AS transporter_phone_number,
    dr.name AS driver_name,
    dr.number AS driver_number,
    tk.number AS truck_number,
    tk.capacity AS truck_capacity,
    tow.name AS truck_owner_name,
    tow.number AS truck_owner_number,
    bd.bank_name,
    bd.account_number,
    bd.ifsc,
    inv.invoice_number,
    (
      SELECT STRING_AGG(l.name, ', ' ORDER BY bp.sort_order, bp.id)
      FROM booking_pickups bp
      LEFT JOIN locations l ON bp.location_id = l.id
      WHERE bp.booking_id = b.id AND l.name IS NOT NULL
    ) AS from_location_name,
    (
      SELECT STRING_AGG(l.name, ', ' ORDER BY bd2.sort_order, bd2.id)
      FROM booking_deliveries bd2
      LEFT JOIN locations l ON bd2.location_id = l.id
      WHERE bd2.booking_id = b.id AND l.name IS NOT NULL
    ) AS to_location_name,
    (
      SELECT STRING_AGG(c.name, ', ' ORDER BY bp.sort_order, bp.id)
      FROM booking_pickups bp
      LEFT JOIN consignors c ON bp.consignor_id = c.id
      WHERE bp.booking_id = b.id AND c.name IS NOT NULL
    ) AS consignor_name,
    (
      SELECT STRING_AGG(c.name, ', ' ORDER BY bd2.sort_order, bd2.id)
      FROM booking_deliveries bd2
      LEFT JOIN consignees c ON bd2.consignee_id = c.id
      WHERE bd2.booking_id = b.id AND c.name IS NOT NULL
    ) AS consignee_name,
    ${GOODS_TOTALS_SELECT}
  FROM bookings b
  LEFT JOIN transporters tr ON b.transporter_id = tr.id
  LEFT JOIN drivers dr ON b.driver_id = dr.id
  LEFT JOIN trucks tk ON b.truck_id = tk.id
  LEFT JOIN truck_owners tow ON b.truck_owner_id = tow.id
  LEFT JOIN banking_details bd ON b.banking_detail_id = bd.id
  LEFT JOIN invoices inv ON b.invoice_id = inv.id
`;

class BookingRepository {
  constructor({ bookingPickupRepository, bookingDeliveryRepository, bookingGoodsItemRepository } = {}) {
    this.bookingPickupRepository = bookingPickupRepository;
    this.bookingDeliveryRepository = bookingDeliveryRepository;
    this.bookingGoodsItemRepository = bookingGoodsItemRepository;
  }

  async attachChildren(booking, client = null) {
    if (!booking) return null;
    const [pickups, deliveries, goodsItems] = await Promise.all([
      this.bookingPickupRepository.findByBookingId(booking.id, client),
      this.bookingDeliveryRepository.findByBookingId(booking.id, client),
      this.bookingGoodsItemRepository.findByBookingId(booking.id, client),
    ]);
    return attachGoodsFinanceTotals({
      ...booking,
      pickups,
      deliveries,
      goodsItems,
    });
  }

  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [id]
    );
    const booking = mapRowToCamel(result.rows[0]);
    return this.attachChildren(booking, client);
  }

  async findByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${BOOKING_SELECT} WHERE b.booking_id = $1`,
      [bookingId]
    );
    const booking = mapRowToCamel(result.rows[0]);
    return this.attachChildren(booking, client);
  }

  async create(data, client = null) {
    const executor = client || { query };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await executor.query(
      `INSERT INTO bookings (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return mapRowToCamel(result.rows[0]);
  }

  async update(id, data, client = null) {
    const executor = client || { query };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    await executor.query(
      `UPDATE bookings SET ${setClause} WHERE id = $1`,
      [id, ...values]
    );
    return this.findById(id, client);
  }

  async countByStage(stage) {
    const result = await query(
      'SELECT COUNT(*)::int AS count FROM bookings WHERE stage = $1',
      [stage]
    );
    return result.rows[0].count;
  }

  async getDashboardStats() {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE stage = 'PARKING_LOT')::int AS parking_lot,
        COUNT(*) FILTER (WHERE stage = 'ON_ROAD')::int AS on_road,
        COUNT(*) FILTER (WHERE stage = 'UNLOAD')::int AS unload,
        COUNT(*) FILTER (WHERE stage = 'DONE')::int AS done,
        COUNT(*) FILTER (WHERE stage = 'ARCHIVED')::int AS archived,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS todays_bookings,
        COUNT(*) FILTER (WHERE booking_id IS NOT NULL AND created_at >= CURRENT_DATE)::int AS todays_generated_ids,
        COUNT(*) FILTER (WHERE stage = 'UNLOAD' AND is_unload_complete = false)::int AS pending_unload,
        COUNT(*) FILTER (WHERE is_finance_complete = false AND stage NOT IN ('PARKING_LOT', 'ARCHIVED'))::int AS pending_finance,
        COALESCE((
          SELECT SUM(bgi.company_freight)
          FROM booking_goods_items bgi
          JOIN bookings bk ON bk.id = bgi.booking_id
          WHERE bk.stage NOT IN ('PARKING_LOT', 'ARCHIVED')
        ), 0)::float AS total_freight,
        COALESCE((
          SELECT SUM(bgi.company_freight)
          FROM booking_goods_items bgi
          JOIN bookings bk ON bk.id = bgi.booking_id
          WHERE bk.stage NOT IN ('PARKING_LOT', 'ARCHIVED')
        ), 0)::float AS total_company_freight,
        COUNT(DISTINCT driver_id) FILTER (WHERE stage IN ('ON_ROAD', 'UNLOAD') AND driver_id IS NOT NULL)::int AS active_drivers,
        COUNT(DISTINCT truck_id) FILTER (WHERE stage IN ('ON_ROAD', 'UNLOAD') AND truck_id IS NOT NULL)::int AS active_trucks
      FROM bookings
    `);
    return mapRowToCamel(result.rows[0]);
  }

  async findByEntityFilter(entityType, entityId, { currentOnly = false } = {}) {
    const filterMap = {
      driver: 'b.driver_id = $1',
      truck: 'b.truck_id = $1',
      transporter: 'b.transporter_id = $1',
      consignor: `EXISTS (
        SELECT 1 FROM booking_pickups bp
        WHERE bp.booking_id = b.id AND bp.consignor_id = $1
      )`,
      consignee: `EXISTS (
        SELECT 1 FROM booking_deliveries bd
        WHERE bd.booking_id = b.id AND bd.consignee_id = $1
      )`,
      location: `(
        EXISTS (SELECT 1 FROM booking_pickups bp WHERE bp.booking_id = b.id AND bp.location_id = $1)
        OR EXISTS (SELECT 1 FROM booking_deliveries bd WHERE bd.booking_id = b.id AND bd.location_id = $1)
      )`,
      owner: 'b.truck_owner_id = $1',
    };

    const condition = filterMap[entityType];
    if (!condition) return [];

    let sql = `${BOOKING_SELECT} WHERE ${condition}`;
    const params = [entityId];

    if (currentOnly) {
      sql += ` AND b.stage NOT IN ('DONE', 'ARCHIVED')`;
    } else {
      sql += ` AND b.stage IN ('DONE', 'ARCHIVED')`;
    }

    sql += ' ORDER BY b.updated_at DESC LIMIT 100';

    const result = await query(sql, params);
    return mapRowsToCamel(result.rows);
  }

  async getEntityStats(entityType, entityId) {
    const filterMap = {
      driver: 'driver_id = $1',
      truck: 'truck_id = $1',
      transporter: 'transporter_id = $1',
      consignor: `id IN (SELECT booking_id FROM booking_pickups WHERE consignor_id = $1)`,
      consignee: `id IN (SELECT booking_id FROM booking_deliveries WHERE consignee_id = $1)`,
      location: `(
        id IN (SELECT booking_id FROM booking_pickups WHERE location_id = $1)
        OR id IN (SELECT booking_id FROM booking_deliveries WHERE location_id = $1)
      )`,
      owner: 'truck_owner_id = $1',
    };

    const condition = filterMap[entityType];
    if (!condition) return null;

    const result = await query(
      `SELECT
        COUNT(*)::int AS total_trips,
        COALESCE((
          SELECT SUM(bgi.company_freight)
          FROM booking_goods_items bgi
          WHERE bgi.booking_id IN (SELECT id FROM bookings WHERE ${condition})
        ), 0)::float AS total_freight,
        COUNT(*) FILTER (WHERE stage NOT IN ('DONE', 'ARCHIVED'))::int AS current_bookings
       FROM bookings WHERE ${condition}`,
      [entityId]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async searchDataTable(filters) {
    const {
      stage,
      dateFrom,
      dateTo,
      transporterId,
      driverId,
      truckId,
      search,
      start = 0,
      length = 25,
      orderColumn = 'created_at',
      orderDir = 'desc',
    } = filters;

    const conditions = ['1=1'];
    const params = [];
    let paramIndex = 1;

    if (stage) {
      conditions.push(`b.stage = $${paramIndex++}`);
      params.push(stage);
    }

    if (dateFrom) {
      conditions.push(`b.created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`b.created_at <= $${paramIndex++}`);
      params.push(dateTo);
    }

    if (transporterId) {
      conditions.push(`b.transporter_id = $${paramIndex++}`);
      params.push(transporterId);
    }

    if (driverId) {
      conditions.push(`b.driver_id = $${paramIndex++}`);
      params.push(driverId);
    }

    if (truckId) {
      conditions.push(`b.truck_id = $${paramIndex++}`);
      params.push(truckId);
    }

    if (search) {
      conditions.push(`(
        b.booking_id ILIKE $${paramIndex}
        OR tr.name ILIKE $${paramIndex}
        OR dr.name ILIKE $${paramIndex}
        OR tk.number ILIKE $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM booking_pickups bp
          JOIN locations l ON bp.location_id = l.id
          WHERE bp.booking_id = b.id AND l.name ILIKE $${paramIndex}
        )
        OR EXISTS (
          SELECT 1 FROM booking_deliveries bd
          JOIN locations l ON bd.location_id = l.id
          WHERE bd.booking_id = b.id AND l.name ILIKE $${paramIndex}
        )
        OR EXISTS (
          SELECT 1 FROM booking_pickups bp
          JOIN consignors c ON bp.consignor_id = c.id
          WHERE bp.booking_id = b.id AND c.name ILIKE $${paramIndex}
        )
        OR EXISTS (
          SELECT 1 FROM booking_deliveries bd
          JOIN consignees c ON bd.consignee_id = c.id
          WHERE bd.booking_id = b.id AND c.name ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const allowedColumns = {
      booking_id: 'b.booking_id',
      stage: 'b.stage',
      from_location_name: 'from_location_name',
      to_location_name: 'to_location_name',
      transporter_name: 'tr.name',
      driver_name: 'dr.name',
      truck_number: 'tk.number',
      total_company_freight: 'total_company_freight',
      created_at: 'b.created_at',
      updated_at: 'b.updated_at',
    };

    const orderCol = allowedColumns[orderColumn] || 'b.created_at';
    const direction = orderDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM bookings b
       LEFT JOIN transporters tr ON b.transporter_id = tr.id
       LEFT JOIN drivers dr ON b.driver_id = dr.id
       LEFT JOIN trucks tk ON b.truck_id = tk.id
       WHERE ${whereClause}`,
      params
    );

    const dataResult = await query(
      `${BOOKING_SELECT}
       WHERE ${whereClause}
       ORDER BY ${orderCol} ${direction}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, length, start]
    );

    return {
      total: countResult.rows[0].total,
      filtered: countResult.rows[0].total,
      data: mapRowsToCamel(dataResult.rows),
    };
  }

  async isBookingIdTaken(bookingId, excludeId = null, client = null) {
    const executor = client || { query };
    const params = [bookingId];
    let sql = 'SELECT id FROM bookings WHERE booking_id = $1';
    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }
    const result = await executor.query(sql, params);
    return result.rows.length > 0;
  }
}

module.exports = BookingRepository;
