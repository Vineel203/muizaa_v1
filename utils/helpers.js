'use strict';

const { STAGES } = require('../config/permissions');

function formatBookingId(year, month, serial) {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const s = String(serial).padStart(3, '0');
  return `M${y}${m}${s}`;
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

module.exports = {
  formatBookingId,
  parseBookingId,
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
};
