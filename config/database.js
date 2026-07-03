'use strict';

require('./env');

function resolveSsl(connectionString) {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };

  if (!connectionString) return false;

  try {
    const normalized = connectionString.replace(/^postgresql:/, 'http:');
    const url = new URL(normalized);
    const sslmode = url.searchParams.get('sslmode');
    if (sslmode === 'disable') return false;
    if (sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'verify-ca') {
      return { rejectUnauthorized: false };
    }
  } catch {
    // fall through
  }

  return false;
}

module.exports = {
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(process.env.DATABASE_URL),
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};
