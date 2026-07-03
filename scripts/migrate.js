'use strict';

require('../config/env');

const fs = require('fs');
const path = require('path');
const { initDatabase, closePool } = require('../utils/db');

async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running database migration...');
  const pool = await initDatabase();
  await pool.query(sql);
  console.log('Migration completed successfully.');
  await closePool();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
