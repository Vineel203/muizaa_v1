'use strict';

/**
 * Document number formats:
 *   BOOKING: M + YYYY + MM + SSS  (e.g. M202607001)
 *   GDM:     G + YY   + MM + SSS  (e.g. G2607001)
 *   INVOICE: I + YY   + MM + SSS  (e.g. I2607001)
 */
const DOCUMENT_TYPES = {
  BOOKING: { prefix: 'M', yearDigits: 4 },
  GDM: { prefix: 'G', yearDigits: 2 },
  INVOICE: { prefix: 'I', yearDigits: 2 },
};

module.exports = { DOCUMENT_TYPES };
