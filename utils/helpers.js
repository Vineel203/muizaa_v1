'use strict';

const { STAGES } = require('../config/permissions');

const { DOCUMENT_TYPES } = require('../config/documentTypes');

function formatDocumentNumber(documentType, year, month, serial) {
  const config = DOCUMENT_TYPES[documentType];
  if (!config) throw new Error(`Unknown document type: ${documentType}`);
  const y = config.yearDigits === 2
    ? String(year).slice(-2)
    : String(year);
  const m = String(month).padStart(2, '0');
  const s = String(serial).padStart(3, '0');
  return `${config.prefix}${y}${m}${s}`;
}

function formatBookingId(year, month, serial) {
  return formatDocumentNumber('BOOKING', year, month, serial);
}

function parseBookingId(bookingId) {
  if (!bookingId || !/^M\d{4}\d{2}\d{3}$/.test(bookingId)) {
    return null;
  }
  return {
    year: parseInt(bookingId.slice(1, 5), 10),
    month: parseInt(bookingId.slice(5, 7), 10),
    serial: parseInt(bookingId.slice(7, 10), 10),
  };
}

function parseDocumentNumber(documentType, value) {
  const config = DOCUMENT_TYPES[documentType];
  if (!config || !value) return null;
  const yearDigits = config.yearDigits;
  const regex = new RegExp(`^${config.prefix}(\\d{${yearDigits}})(\\d{2})(\\d{3})$`);
  const match = value.match(regex);
  if (!match) return null;
  const year = yearDigits === 2
    ? 2000 + parseInt(match[1], 10)
    : parseInt(match[1], 10);
  return {
    year,
    month: parseInt(match[2], 10),
    serial: parseInt(match[3], 10),
  };
}

function isArchivedStage(stage) {
  return stage === STAGES.ARCHIVED;
}

function isReadOnlyStage(stage) {
  return stage === STAGES.ARCHIVED;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return Boolean(value);
}

function sanitizeString(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapRowToCamel(row) {
  if (!row) return null;
  return Object.entries(row).reduce((acc, [key, value]) => {
    acc[snakeToCamel(key)] = value;
    return acc;
  }, {});
}

function mapRowsToCamel(rows) {
  return rows.map(mapRowToCamel);
}

function ensureArray(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key]);
  }
  return [value];
}

const GOODS_FINANCE_SUM_FIELDS = [
  { total: 'totalCompanyFreight', item: 'companyFreight' },
  { total: 'totalAdvance', item: 'advance' },
  { total: 'totalLoadingHamali', item: 'loadingHamali' },
  { total: 'totalUnloadingHamali', item: 'unloadingHamali' },
  { total: 'totalBalance', item: 'balance' },
];

function sumGoodsFinanceField(items, field) {
  return items.reduce((acc, item) => {
    const value = item[field];
    if (value === null || value === undefined || value === '') return acc;
    const num = Number(value);
    return Number.isNaN(num) ? acc : acc + num;
  }, 0);
}

function attachGoodsFinanceTotals(booking) {
  if (!booking) return booking;
  const items = booking.goodsItems || [];
  const totals = {};
  GOODS_FINANCE_SUM_FIELDS.forEach(({ total, item }) => {
    const sum = sumGoodsFinanceField(items, item);
    totals[total] = sum || null;
  });

  const totalCompanyFreight = totals.totalCompanyFreight || 0;
  const lorryFreightPaid = booking.lorryFreightPaid != null ? Number(booking.lorryFreightPaid) : 0;
  const netCompanyFreight = totalCompanyFreight - (Number.isNaN(lorryFreightPaid) ? 0 : lorryFreightPaid);

  return {
    ...booking,
    ...totals,
    netCompanyFreight: netCompanyFreight || (totalCompanyFreight || lorryFreightPaid ? netCompanyFreight : null),
  };
}

module.exports = {
  formatDocumentNumber,
  formatBookingId,
  parseBookingId,
  parseDocumentNumber,
  isArchivedStage,
  isReadOnlyStage,
  toNumber,
  toBoolean,
  sanitizeString,
  formatDateTime,
  formatDate,
  pick,
  omit,
  camelToSnake,
  snakeToCamel,
  mapRowToCamel,
  mapRowsToCamel,
  ensureArray,
  GOODS_FINANCE_SUM_FIELDS,
  sumGoodsFinanceField,
  attachGoodsFinanceTotals,
};
