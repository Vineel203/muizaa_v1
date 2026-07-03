'use strict';

require('./env');

function parseDatabaseUrl(connectionString) {
  if (!connectionString) return null;

  try {
    const normalized = connectionString.replace(/^postgresql:/, 'http:');
    const url = new URL(normalized);
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
    };
  } catch {
    return null;
  }
}

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

function getCredentials() {
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!parsed) {
    throw new Error('DATABASE_URL is invalid or not set');
  }

  return {
    user: process.env.DB_USER || parsed.user,
    password: process.env.DB_PASSWORD || parsed.password,
    database: process.env.DB_NAME || parsed.database,
  };
}

function getPoolConfig() {
  const max = parseInt(process.env.DB_POOL_MAX, 10) || 10;
  const common = {
    max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  const cloudSqlInstance = process.env.CLOUD_SQL_INSTANCE;
  const useConnector = process.env.CLOUD_SQL_USE_CONNECTOR === 'true';
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);

  // Production Cloud SQL via connector — pool built in utils/db.js
  if (cloudSqlInstance && useConnector && process.env.NODE_ENV === 'production') {
    return { ...common, mode: 'connector', instance: cloudSqlInstance, credentials: getCredentials() };
  }

  // Unix socket (when App Hosting mounts /cloudsql/...)
  if (cloudSqlInstance && process.env.NODE_ENV === 'production') {
    if (!parsed) {
      throw new Error('DATABASE_URL is required when CLOUD_SQL_INSTANCE is set');
    }

    return {
      ...common,
      mode: 'socket',
      user: process.env.DB_USER || parsed.user,
      password: process.env.DB_PASSWORD || parsed.password,
      database: process.env.DB_NAME || parsed.database,
      host: `/cloudsql/${cloudSqlInstance}`,
    };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return {
    ...common,
    mode: 'direct',
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(process.env.DATABASE_URL),
  };
}

module.exports = {
  getPoolConfig,
  getCredentials,
  parseDatabaseUrl,
};
