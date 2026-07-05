'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

const INVOICE_SELECT = `
  SELECT
    i.*,
    COUNT(b.id)::int AS booking_count,
    COALESCE(SUM(bgi.packages), 0)::int AS total_packages,
    COALESCE(SUM(bgi.weight_kgs), 0)::float AS total_weight,
    COALESCE(SUM(bgi.company_freight), 0)::float AS total_freight
  FROM invoices i
  LEFT JOIN bookings b ON b.invoice_id = i.id
  LEFT JOIN booking_goods_items bgi ON bgi.booking_id = b.id
`;

class InvoiceRepository {
  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${INVOICE_SELECT} WHERE i.id = $1 GROUP BY i.id`,
      [id]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findBookingsByInvoiceId(invoiceId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT
        b.id,
        b.booking_id,
        b.stage,
        b.gdm_number,
        (
          SELECT COALESCE(SUM(company_freight), 0)::float
          FROM booking_goods_items WHERE booking_id = b.id
        ) AS total_company_freight,
        b.created_at,
        tr.name AS transporter_name,
        tk.number AS truck_number,
        tk.capacity AS truck_capacity,
        (
          SELECT STRING_AGG(l.name, ', ' ORDER BY bp.sort_order, bp.id)
          FROM booking_pickups bp
          LEFT JOIN locations l ON bp.location_id = l.id
          WHERE bp.booking_id = b.id AND l.name IS NOT NULL
        ) AS from_location_name,
        (
          SELECT STRING_AGG(l.name, ', ' ORDER BY bd.sort_order, bd.id)
          FROM booking_deliveries bd
          LEFT JOIN locations l ON bd.location_id = l.id
          WHERE bd.booking_id = b.id AND l.name IS NOT NULL
        ) AS to_location_name,
        (
          SELECT COALESCE(SUM(packages), 0)::int FROM booking_goods_items WHERE booking_id = b.id
        ) AS total_packages,
        (
          SELECT COALESCE(SUM(weight_kgs), 0)::float FROM booking_goods_items WHERE booking_id = b.id
        ) AS total_weight
       FROM bookings b
       LEFT JOIN transporters tr ON b.transporter_id = tr.id
       LEFT JOIN trucks tk ON b.truck_id = tk.id
       WHERE b.invoice_id = $1
       ORDER BY b.created_at ASC`,
      [invoiceId]
    );
    return mapRowsToCamel(result.rows);
  }

  async create(data, client = null) {
    const executor = client || { query };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await executor.query(
      `INSERT INTO invoices (${columns}) VALUES (${placeholders}) RETURNING *`,
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
      `UPDATE invoices SET ${setClause} WHERE id = $1`,
      [id, ...values]
    );
    return this.findById(id, client);
  }

  async assignBookings(invoiceId, bookingIds, client = null) {
    const executor = client || { query };
    if (!bookingIds.length) return;

    await executor.query(
      `UPDATE bookings SET invoice_id = $1, updated_at = NOW()
       WHERE id = ANY($2::int[]) AND (invoice_id IS NULL OR invoice_id = $1)`,
      [invoiceId, bookingIds]
    );
  }

  async findAvailableBookings(search = '', limit = 20, client = null) {
    const executor = client || { query };
    const params = [];
    let searchClause = '';
    let paramIndex = 1;

    if (search) {
      searchClause = `AND (
        b.booking_id ILIKE $${paramIndex}
        OR tr.name ILIKE $${paramIndex}
        OR tk.number ILIKE $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM booking_pickups bp
          JOIN locations l ON bp.location_id = l.id
          WHERE bp.booking_id = b.id AND l.name ILIKE $${paramIndex}
        )
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    params.push(limit);

    const result = await executor.query(
      `SELECT
        b.id,
        b.booking_id,
        b.stage,
        b.gdm_number,
        b.created_at,
        tr.name AS transporter_name,
        tk.number AS truck_number,
        (
          SELECT STRING_AGG(l.name, ', ' ORDER BY bp.sort_order, bp.id)
          FROM booking_pickups bp
          LEFT JOIN locations l ON bp.location_id = l.id
          WHERE bp.booking_id = b.id AND l.name IS NOT NULL
        ) AS from_location_name,
        (
          SELECT STRING_AGG(l.name, ', ' ORDER BY bd.sort_order, bd.id)
          FROM booking_deliveries bd
          LEFT JOIN locations l ON bd.location_id = l.id
          WHERE bd.booking_id = b.id AND l.name IS NOT NULL
        ) AS to_location_name
       FROM bookings b
       LEFT JOIN transporters tr ON b.transporter_id = tr.id
       LEFT JOIN trucks tk ON b.truck_id = tk.id
       WHERE b.invoice_id IS NULL
         AND b.stage NOT IN ('ARCHIVED')
         ${searchClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );
    return mapRowsToCamel(result.rows);
  }

  async searchDataTable(filters) {
    const {
      dateFrom,
      dateTo,
      search,
      start = 0,
      length = 25,
      orderColumn = 'created_at',
      orderDir = 'desc',
    } = filters;

    const conditions = ['1=1'];
    const params = [];
    let paramIndex = 1;

    if (dateFrom) {
      conditions.push(`i.created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`i.created_at <= $${paramIndex++}`);
      params.push(dateTo);
    }

    if (search) {
      conditions.push(`(
        i.invoice_number ILIKE $${paramIndex}
        OR i.recipient_details ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const allowedColumns = {
      invoice_number: 'i.invoice_number',
      created_at: 'i.created_at',
      booking_count: 'booking_count',
      total_freight: 'total_freight',
    };
    const orderCol = allowedColumns[orderColumn] || 'i.created_at';
    const direction = orderDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM invoices i WHERE ${whereClause}`,
      params
    );

    const dataResult = await query(
      `${INVOICE_SELECT}
       WHERE ${whereClause}
       GROUP BY i.id
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

  async isInvoiceNumberTaken(invoiceNumber, excludeId = null, client = null) {
    const executor = client || { query };
    const params = [invoiceNumber];
    let sql = 'SELECT id FROM invoices WHERE invoice_number = $1';
    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }
    const result = await executor.query(sql, params);
    return result.rows.length > 0;
  }
}

module.exports = InvoiceRepository;
