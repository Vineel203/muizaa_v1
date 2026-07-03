'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const createApp = require('./app');

let app;

function getApp() {
  if (!app) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not set. Run: firebase functions:secrets:set DATABASE_URL'
      );
    }
    if (!process.env.SESSION_SECRET) {
      throw new Error(
        'SESSION_SECRET is not set. Run: firebase functions:secrets:set SESSION_SECRET'
      );
    }
    app = createApp();
  }
  return app;
}

exports.api = onRequest(
  {
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: ['DATABASE_URL', 'SESSION_SECRET'],
  },
  (req, res) => getApp()(req, res)
);
