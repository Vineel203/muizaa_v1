'use strict';

require('dotenv').config();

module.exports = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  name: process.env.SESSION_NAME || 'muizaa.sid',
  maxAge: parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 86400000,
  rememberMaxAge: parseInt(process.env.SESSION_REMEMBER_MAX_AGE_MS, 10) || 2592000000,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};
