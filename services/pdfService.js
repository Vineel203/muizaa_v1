'use strict';

const fs = require('fs');
const puppeteerCore = require('puppeteer-core');
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

async function resolveLaunchOptions() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: SANDBOX_ARGS,
    };
  }

  // Cloud Run / Linux production — bundled serverless Chromium
  if (process.platform === 'linux') {
    const chromiumModule = require('@sparticuz/chromium');
    const Chromium = chromiumModule.default || chromiumModule;

    if (typeof Chromium.setGraphicsMode !== 'undefined') {
      Chromium.setGraphicsMode = false;
    }

    const executablePath = await Chromium.executablePath();
    if (!executablePath || !fs.existsSync(executablePath)) {
      throw new Error('Serverless Chromium binary not found for PDF generation');
    }

    const args = typeof puppeteerCore.defaultArgs === 'function'
      ? puppeteerCore.defaultArgs({ args: [...Chromium.args, ...SANDBOX_ARGS], headless: true })
      : [...Chromium.args, ...SANDBOX_ARGS];

    return {
      executablePath,
      headless: true,
      args,
    };
  }

  // Local dev — Puppeteer-downloaded Chrome or system Chrome
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
      'Chrome is not available for PDF generation. Install Google Chrome or run: npm run install:chrome'
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
