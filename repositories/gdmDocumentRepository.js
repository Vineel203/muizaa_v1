'use strict';

const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');

class GdmDocumentRepository {
  async findByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `SELECT * FROM gdm_documents
       WHERE booking_id = $1
       ORDER BY generated_at DESC, id DESC`,
      [bookingId]
    );
    return mapRowsToCamel(result.rows);
  }

  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      'SELECT * FROM gdm_documents WHERE id = $1',
      [id]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findByIdForBooking(id, bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      'SELECT * FROM gdm_documents WHERE id = $1 AND booking_id = $2',
      [id, bookingId]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async countByBookingId(bookingId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      'SELECT COUNT(*)::int AS count FROM gdm_documents WHERE booking_id = $1',
      [bookingId]
    );
    return result.rows[0].count;
  }

  async create(data, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `INSERT INTO gdm_documents (
        booking_id, gdm_number, invoice_number, generated_at, generated_by,
        drive_file_id, drive_url, drive_file_name, local_file_path, document_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.bookingId,
        data.gdmNumber,
        data.invoiceNumber || null,
        data.generatedAt || new Date(),
        data.generatedBy,
        data.driveFileId || null,
        data.driveUrl || null,
        data.driveFileName,
        data.localFilePath || null,
        JSON.stringify(data.documentData || {}),
      ]
    );
    return mapRowToCamel(result.rows[0]);
  }
}

module.exports = GdmDocumentRepository;
