'use strict';

require('../config/env');

const { getContainer } = require('../config/container');
const { closePool } = require('../utils/db');

async function seed() {
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

  await closePool();
  console.log('Seed completed.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
