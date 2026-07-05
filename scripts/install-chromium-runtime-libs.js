'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGES = [
  'libnspr4',
  'libnss3',
  'libatk1.0-0',
  'libatk-bridge2.0-0',
  'libatspi2.0-0',
  'libcups2',
  'libdrm2',
  'libgbm1',
  'libxcomposite1',
  'libxdamage1',
  'libxfixes3',
  'libxrandr2',
  'libasound2',
  'libpango-1.0-0',
  'libcairo2',
  'libglib2.0-0',
  'libdbus-1-3',
  'libexpat1',
  'libfontconfig1',
  'libx11-6',
  'libxcb1',
  'libxext6',
  'libxi6',
  'libxrender1',
  'libgcc-s1',
  'libstdc++6',
];

function hasCommand(name) {
  try {
    execSync(`command -v ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (process.platform !== 'linux') {
    return;
  }

  if (!hasCommand('apt-get') || !hasCommand('dpkg-deb')) {
    console.warn('apt-get/dpkg-deb not available; skipping Chromium runtime libs install');
    return;
  }

  const vendorRoot = path.join(__dirname, '..', 'vendor', 'chromium-libs');
  fs.mkdirSync(vendorRoot, { recursive: true });

  const cwd = process.cwd();
  process.chdir(vendorRoot);

  try {
    console.log('Installing Chromium runtime libraries for Linux...');
    execSync('apt-get update -qq', { stdio: 'inherit' });
    execSync(`apt-get download -qq ${PACKAGES.join(' ')}`, { stdio: 'inherit' });

    for (const file of fs.readdirSync(vendorRoot).filter((name) => name.endsWith('.deb'))) {
      execSync(`dpkg-deb -x ${file} ${vendorRoot}`, { stdio: 'inherit' });
      fs.unlinkSync(file);
    }

    console.log('Chromium runtime libraries ready.');
  } catch (error) {
    console.warn('Chromium runtime libs install skipped or failed:', error.message);
  } finally {
    process.chdir(cwd);
  }
}

main();
