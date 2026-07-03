'use strict';

const appConfig = require('../config/app');

function info(message, meta = {}) {
  console.log(JSON.stringify({ level: 'info', message, ...meta, ts: new Date().toISOString() }));
}

function warn(message, meta = {}) {
  console.warn(JSON.stringify({ level: 'warn', message, ...meta, ts: new Date().toISOString() }));
}

function error(message, meta = {}) {
  console.error(JSON.stringify({ level: 'error', message, ...meta, ts: new Date().toISOString() }));
}

function debug(message, meta = {}) {
  if (appConfig.isDevelopment) {
    console.debug(JSON.stringify({ level: 'debug', message, ...meta, ts: new Date().toISOString() }));
  }
}

module.exports = { info, warn, error, debug };
