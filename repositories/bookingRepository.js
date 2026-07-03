'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

const BOOKING_SELECT = `
  SELECT
    b.*,
    fl.name AS from_location_name,
    tl.name AS to_location_name,
    co.name AS consignor_name,
    ce.name AS consignee_name,
    tr.name AS transporter_name,
    dr.name AS driver_name,
    dr.number AS driver_number,
    tk.number AS truck_number,
    tk.capacity AS truck_capacity,
    tow.name AS truck_owner_name,
    tow.number AS truck_owner_number,
    bd.bank_name,
    bd.account_number,
    bd.ifsc,
    g.name AS good_name
  FROM bookings b
  LEFT JOIN locations fl ON b.from_location_id = fl.id
  LEFT JOIN locations tl ON b.to_location_id = tl.id
  LEFT JOIN consignors co ON b.consignor_id = co.id
  LEFT JOIN consignees ce ON b.consignee_id = ce.id
  LEFT JOIN transporters tr ON b.transporter_id = tr.id
  LEFT JOIN drivers dr ON b.driver_id = dr.id
  LEFT JOIN trucks tk ON b.truck_id = tk.id
  LEFT JOIN truck_owners tow ON b.truck_owner_id = tow.id
  LEFT JOIN banking_details bd ON b.banking_detail_id = bd.id
  LEFT JOIN goods g ON b.good_id = g.id
`;

class BookingRepository {
  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [id]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${BOOKING_SELECT} WHERE b.booking_id = $1`,
      [bookingId]
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
      `INSERT INTO bookings (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return this.findById(result.rows[0].id, client);
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
        COALESCE(SUM(rate) FILTER (WHERE stage NOT IN ('PARKING_LOT', 'ARCHIVED')), 0)::float AS total_freight,
        COALESCE(SUM(company_freight) FILTER (WHERE stage NOT IN ('PARKING_LOT', 'ARCHIVED')), 0)::float AS total_company_freight,
        COUNT(DISTINCT driver_id) FILTER (WHERE stage IN ('ON_ROAD', 'UNLOAD') AND driver_id IS NOT NULL)::int AS active_drivers,
        COUNT(DISTINCT truck_id) FILTER (WHERE stage IN ('ON_ROAD', 'UNLOAD') AND truck_id IS NOT NULL)::int AS active_trucks
      FROM bookings
    `);
    return mapRowToCamel(result.rows[0]);
  }

  async findByEntityFilter(entityType, entityId, { currentOnly = false } = {}) {
    const columnMap = {
      driver: 'driver_id',
      truck: 'truck_id',
      transporter: 'transporter_id',
      consignor: 'consignor_id',
      consignee: 'consignee_id',
      location: 'from_location_id',
      owner: 'truck_owner_id',
    };

    const column = columnMap[entityType];
    if (!column) return [];

    let sql = `${BOOKING_SELECT} WHERE b.${column} = $1`;
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
    const columnMap = {
      driver: 'driver_id',
      truck: 'truck_id',
      transporter: 'transporter_id',
      consignor: 'consignor_id',
      consignee: 'consignee_id',
      location: 'from_location_id',
      owner: 'truck_owner_id',
    };

    const column = columnMap[entityType];
    if (!column) return null;

    const result = await query(
      `SELECT
        COUNT(*)::int AS total_trips,
        COALESCE(SUM(rate), 0)::float AS total_freight,
        COUNT(*) FILTER (WHERE stage NOT IN ('DONE', 'ARCHIVED'))::int AS current_bookings
       FROM bookings WHERE ${column} = $1`,
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
        OR fl.name ILIKE $${paramIndex}
        OR tl.name ILIKE $${paramIndex}
        OR co.name ILIKE $${paramIndex}
        OR ce.name ILIKE $${paramIndex}
        OR tr.name ILIKE $${paramIndex}
        OR dr.name ILIKE $${paramIndex}
        OR tk.number ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const allowedColumns = {
      booking_id: 'b.booking_id',
      stage: 'b.stage',
      from_location_name: 'fl.name',
      to_location_name: 'tl.name',
      transporter_name: 'tr.name',
      driver_name: 'dr.name',
      truck_number: 'tk.number',
      created_at: 'b.created_at',
      updated_at: 'b.updated_at',
    };

    const orderCol = allowedColumns[orderColumn] || 'b.created_at';
    const direction = orderDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM bookings b
       LEFT JOIN locations fl ON b.from_location_id = fl.id
       LEFT JOIN locations tl ON b.to_location_id = tl.id
       LEFT JOIN consignors co ON b.consignor_id = co.id
       LEFT JOIN consignees ce ON b.consignee_id = ce.id
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
}

module.exports = BookingRepository;
