'use strict';

const fs = require('fs');
const puppeteerCore = require('puppeteer-core');
const { GoogleAuth } = require('google-auth-library');
const logger = require('../utils/logger');

const SYSTEM_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const SANDBOX_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

const PAPER_SIZES_IN = {
  A4: { width: 8.27, height: 11.7 },
  A6: { width: 4.13, height: 5.83 },
  Letter: { width: 8.5, height: 11 },
};

function parseMarginInches(value) {
  if (value === null || value === undefined || value === '') return '0';
  const raw = String(value).trim().toLowerCase();
  if (raw.endsWith('mm')) {
    return String(parseFloat(raw) / 25.4);
  }
  if (raw.endsWith('in')) {
    return String(parseFloat(raw));
  }
  if (raw.endsWith('px')) {
    return String(parseFloat(raw) / 96);
  }
  const numeric = parseFloat(raw);
  return Number.isNaN(numeric) ? '0' : String(numeric);
}

function shouldUseGotenberg() {
  return Boolean(process.env.GOTENBERG_URL && process.env.GOTENBERG_URL.trim());
}

function shouldUseGotenbergIam() {
  if (process.env.GOTENBERG_USE_IAM === 'false') return false;
  if (process.env.GOTENBERG_USE_IAM === 'true') return true;
  const url = process.env.GOTENBERG_URL || '';
  return url.includes('.run.app') || url.includes('.cloudfunctions.net');
}

async function resolveLaunchOptions() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: SANDBOX_ARGS,
    };
  }

  let executablePath = null;

  try {
    const puppeteer = require('puppeteer');
    executablePath = await puppeteer.executablePath();
    if (executablePath && !fs.existsSync(executablePath)) {
      executablePath = null;
    }
  } catch (error) {
    logger.warn('Puppeteer bundled Chrome not found', { message: error.message });
  }

  if (!executablePath) {
    for (const candidate of SYSTEM_CHROME_PATHS) {
      if (fs.existsSync(candidate)) {
        executablePath = candidate;
        break;
      }
    }
  }

  if (!executablePath) {
    throw new Error(
      'Chrome is not available for PDF generation. Install Google Chrome, run: npm run install:chrome, or set GOTENBERG_URL for production.'
    );
  }

  return {
    executablePath,
    headless: true,
    args: SANDBOX_ARGS,
  };
}

class PdfService {
  async generateFromHtml(html, options = {}) {
    if (shouldUseGotenberg()) {
      return this.generateViaGotenberg(html, options);
    }
    return this.generateViaPuppeteer(html, options);
  }

  async generateViaGotenberg(html, options = {}) {
    const baseUrl = process.env.GOTENBERG_URL.trim().replace(/\/$/, '');
    const format = String(options.format || 'A4').toUpperCase();
    const paper = PAPER_SIZES_IN[format] || PAPER_SIZES_IN.A4;
    const margins = options.margin || {};

    const form = new FormData();
    form.append('files', new Blob([html], { type: 'text/html; charset=utf-8' }), 'index.html');
    form.append('paperWidth', String(paper.width));
    form.append('paperHeight', String(paper.height));
    form.append('printBackground', 'true');
    form.append('preferCssPageSize', 'true');
    form.append('marginTop', parseMarginInches(margins.top ?? '0'));
    form.append('marginRight', parseMarginInches(margins.right ?? '0'));
    form.append('marginBottom', parseMarginInches(margins.bottom ?? '0'));
    form.append('marginLeft', parseMarginInches(margins.left ?? '0'));

    const url = `${baseUrl}/forms/chromium/convert/html`;
    const headers = {};

    if (shouldUseGotenbergIam()) {
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(baseUrl);
      const { headers: authHeaders } = await client.getRequestMetadataAsync();
      const authorization = authHeaders.get('authorization');
      if (!authorization) {
        throw new Error('Failed to obtain Cloud Run ID token for Gotenberg');
      }
      headers.Authorization = authorization;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gotenberg PDF failed (${response.status}): ${detail.slice(0, 500)}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async generateViaPuppeteer(html, options = {}) {
    const launchOptions = await resolveLaunchOptions();

    let browser;
    try {
      browser = await puppeteerCore.launch(launchOptions);

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: options.margin || { top: '0', right: '0', bottom: '0', left: '0' },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error('PDF generation failed', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = PdfService;
