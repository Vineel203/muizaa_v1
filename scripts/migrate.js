'use strict';

require('../config/env');

const fs = require('fs');
const path = require('path');
const { initDatabase, closePool } = require('../utils/db');

async function migrate() {
  const dbDir = path.join(__dirname, '..', 'database');
  const schemaPath = path.join(dbDir, 'schema.sql');
  const patchesDir = path.join(dbDir, 'patches');

  console.log('Running database migration...');
  const pool = await initDatabase();

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  console.log('Applied schema.sql');

  if (fs.existsSync(patchesDir)) {
    const patchFiles = fs
      .readdirSync(patchesDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of patchFiles) {
      const patchSql = fs.readFileSync(path.join(patchesDir, file), 'utf8');
      await pool.query(patchSql);
      console.log(`Applied patch ${file}`);
    }
  }

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
