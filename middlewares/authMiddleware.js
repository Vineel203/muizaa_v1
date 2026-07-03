'use strict';

const { UnauthorizedError } = require('../utils/errors');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return next(new UnauthorizedError('Please login to continue'));
    }
    return res.redirect('/login');
  }
  req.user = req.session.user;
  return next();
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
};
