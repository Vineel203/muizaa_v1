'use strict';

require('../config/env');

const { getContainer } = require('../config/container');
const { initDatabase, closePool } = require('../utils/db');
const { seedDevData } = require('./seed-dev-data');

function shouldSeedDevData() {
  return process.argv.includes('--dev')
    || process.env.SEED_DEV_DATA === 'yes'
    || process.env.SEED_DEV_DATA === 'true';
}

async function seed() {
  const pool = await initDatabase();
  const { authService } = getContainer().services;

  const email = process.env.ADMIN_EMAIL || 'admin@muizaa.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const fullName = process.env.ADMIN_NAME || 'System Admin';

  console.log('Seeding admin user...');

  try {
    const user = await authService.createAdmin({ email, password, fullName });
    console.log(`Admin user created: ${user.email}`);
  } catch (error) {
    if (error.message === 'User already exists') {
      console.log('Admin user already exists, skipping.');
    } else {
      throw error;
    }
  }

  if (shouldSeedDevData()) {
    console.log('Seeding development sample data...');
    await seedDevData(pool);
  } else {
    console.log('Skipping dev data (use --dev or SEED_DEV_DATA=yes to include sample data).');
  }

  await closePool();
  console.log('Seed completed.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
