'use strict';

const fs = require('fs');
const path = require('path');

async function runMigrations(pool) {
  const dbDir = path.join(__dirname, '..', 'database');
  const schemaPath = path.join(dbDir, 'schema.sql');
  const patchesDir = path.join(dbDir, 'patches');

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
}

module.exports = { runMigrations };
