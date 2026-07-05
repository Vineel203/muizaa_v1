'use strict';

require('../config/env');

const fs = require('fs');
const path = require('path');
const { initDatabase, closePool } = require('../utils/db');
const { runMigrations } = require('./run-migrations');

function printConnectionHelp() {
  console.error(`
Cannot reach the database. Add these to your .env file (see .env.example):

  CLOUD_SQL_INSTANCE=muizaa:asia-south1:muizaa-instance
  CLOUD_SQL_USE_CONNECTOR=true
  DATABASE_URL=postgresql://apiaccess:YOUR_PASSWORD%2112@127.0.0.1:5432/muizaa-database
  DB_SSL=false

Then run:  npm run db:fresh

For public IP instead of connector, whitelist your IP in Cloud SQL and omit CLOUD_SQL_* vars.
Requires gcloud auth application-default login when using the connector.
`);
}

function isResetConfirmed() {
  return process.env.CONFIRM_DB_RESET === 'yes' || process.argv.includes('--yes');
}

async function resetDatabase({ seed = false } = {}) {
  if (!isResetConfirmed()) {
    console.error('Blocked: this deletes ALL data in the database.');
    console.error('Re-run with:  npm run db:fresh');
    console.error('Or:           npm run db:reset -- --yes');
    process.exit(1);
  }

  const resetPath = path.join(__dirname, '..', 'database', 'reset.sql');
  const resetSql = fs.readFileSync(resetPath, 'utf8');

  const mode = process.env.CLOUD_SQL_USE_CONNECTOR === 'true' ? 'connector' : 'direct';
  console.log(`Connecting to database (${mode})...`);
  const pool = await initDatabase();

  console.log('Dropping all tables (reset.sql)...');
  await pool.query(resetSql);
  console.log('Database wiped.');

  console.log('Applying schema and patches...');
  await runMigrations(pool);
  console.log('Migration completed.');

  await closePool();

  if (seed) {
    console.log('Seeding admin user and development data...');
    const { spawnSync } = require('child_process');
    const result = spawnSync(process.execPath, [path.join(__dirname, 'seed.js'), '--dev'], {
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }

  console.log(seed ? 'Fresh database ready (schema + admin + sample data).' : 'Fresh database ready.');
}

const seedAfter = process.argv.includes('--seed');

resetDatabase({ seed: seedAfter }).catch((err) => {
  console.error('Reset failed:', err.message);

  if (/Could not load the default credentials/i.test(err.message)) {
    console.error(`
Cloud SQL connector requires Google Cloud login, OR remove connector vars to use public IP.

  Option A — use .env public IP only (restart terminal first, or run):
    Remove-Item Env:CLOUD_SQL_USE_CONNECTOR -ErrorAction SilentlyContinue
    Remove-Item Env:CLOUD_SQL_INSTANCE -ErrorAction SilentlyContinue
    npm run db:fresh

  Option B — install gcloud and login:
    gcloud auth application-default login
    gcloud config set project muizaa
`);
  } else if (/timeout|ETIMEDOUT|ECONNREFUSED|28P01|password authentication/i.test(err.message)) {
    printConnectionHelp();
  }

  process.exit(1);
});
