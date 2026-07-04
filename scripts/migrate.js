'use strict';

require('../config/env');

const { initDatabase, closePool } = require('../utils/db');
const { runMigrations } = require('./run-migrations');

async function migrate() {
  console.log('Running database migration...');
  const pool = await initDatabase();
  await runMigrations(pool);
  console.log('Migration completed successfully.');
  await closePool();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);

  if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(err.message)) {
    console.error(`
Cannot reach Cloud SQL over the public IP. Use the Cloud SQL connector instead:

  1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
  2. gcloud auth login
  3. gcloud auth application-default login
  4. gcloud config set project muizaa

  PowerShell (encode ! in password as %21):
  $env:CLOUD_SQL_INSTANCE="muizaa:asia-south1:muizaa-instance"
  $env:CLOUD_SQL_USE_CONNECTOR="true"
  $env:DATABASE_URL="postgresql://apiaccess:Admin%2112@localhost:5432/muizaa-database"
  $env:DB_SSL="false"
  npm run migrate

Or allow your IP in Cloud Console → SQL → Connections → Authorized networks.
`);
  }

  process.exit(1);
});
