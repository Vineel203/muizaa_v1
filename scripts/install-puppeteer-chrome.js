'use strict';

const { execSync } = require('child_process');

try {
  console.log('Installing Puppeteer Chrome (if needed)...');
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('Puppeteer Chrome ready.');
} catch (error) {
  console.warn('Puppeteer Chrome install skipped or failed:', error.message);
  process.exitCode = 0;
}
