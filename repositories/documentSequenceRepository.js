'use strict';

const { DOCUMENT_TYPES } = require('../config/documentTypes');
const { formatDocumentNumber } = require('../utils/helpers');

class DocumentSequenceRepository {
  async getNextNumber(documentType, client) {
    const config = DOCUMENT_TYPES[documentType];
    if (!config) {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const result = await client.query(
      `INSERT INTO document_sequences (document_type, year, month, last_serial)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (document_type, year, month)
       DO UPDATE SET last_serial = document_sequences.last_serial + 1
       RETURNING last_serial`,
      [documentType, year, month]
    );

    const serial = result.rows[0].last_serial;
    return formatDocumentNumber(documentType, year, month, serial);
  }
}

module.exports = DocumentSequenceRepository;
