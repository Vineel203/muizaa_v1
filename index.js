'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const createApp = require('./app');

const app = createApp();

exports.api = onRequest(
  {
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  app
);
