'use strict';

const { Pool } = require('pg');
const { getPoolConfig } = require('../config/database');
const logger = require('./logger');

let pool = null;

function getPool() {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error', { error: err.message });
    });

    if (process.env.CLOUD_SQL_INSTANCE) {
      logger.info('PostgreSQL pool using Cloud SQL socket', {
        instance: process.env.CLOUD_SQL_INSTANCE,
      });
    }
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function getClient() {
  return getPool().connect();
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
  }
}

module.exports = {
  getPool,
  query,
  getClient,
  withTransaction,
  closePool,
};
