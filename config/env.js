'use strict';

const fs = require('fs');
const path = require('path');

// Load .env locally only — Firebase injects env vars at runtime (App Hosting / Cloud Functions).
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. For local dev, add it to .env. ` +
      'For Firebase, set it in App Hosting env/secrets or Functions secrets.'
    );
  }
  return value;
}

module.exports = { requireEnv };
