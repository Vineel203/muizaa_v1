'use strict';

const { Pool } = require('pg');
const { getPoolConfig } = require('../config/database');
const logger = require('./logger');

let pool = null;
let initPromise = null;

async function createPool() {
  const config = getPoolConfig();

  if (config.mode === 'connector') {
    const { Connector, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
    const connector = new Connector();

    const clientOpts = await connector.getOptions({
      instanceConnectionName: config.instance,
      ipType: IpAddressTypes.PUBLIC,
    });

    logger.info('PostgreSQL pool using Cloud SQL connector', {
      instance: config.instance,
    });

    return new Pool({
      ...clientOpts,
      user: config.credentials.user,
      password: config.credentials.password,
      database: config.credentials.database,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    });
  }

  if (config.mode === 'socket') {
    logger.info('PostgreSQL pool using Cloud SQL socket', {
      host: config.host,
    });

    return new Pool({
      user: config.user,
      password: config.password,
      database: config.database,
      host: config.host,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    });
  }

  return new Pool({
    connectionString: config.connectionString,
    ssl: config.ssl,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
  });
}

async function initDatabase() {
  if (pool) return pool;
  if (!initPromise) {
    initPromise = createPool().then((createdPool) => {
      pool = createdPool;
      pool.on('error', (err) => {
        logger.error('Unexpected PostgreSQL pool error', { error: err.message });
      });
      return pool;
    });
  }
  return initPromise;
}

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() before creating the app.');
  }
  return pool;
}

async function query(text, params) {
  const activePool = pool || (await initDatabase());
  return activePool.query(text, params);
}

async function getClient() {
  const activePool = pool || (await initDatabase());
  return activePool.connect();
}

async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    initPromise = null;
  }
}

module.exports = {
  initDatabase,
  getPool,
  query,
  getClient,
  withTransaction,
  closePool,
};
