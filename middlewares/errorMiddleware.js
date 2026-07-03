'use strict';

const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  return res.status(404).render('errors/404', {
    title: 'Page Not Found',
    layout: 'layouts/auth',
  });
}

function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: err.errors || undefined,
      code: err.code || 'INTERNAL_ERROR',
    });
  }

  if (statusCode === 401) {
    return res.redirect('/login');
  }

  return res.status(statusCode).render('errors/error', {
    title: 'Error',
    message,
    statusCode,
    layout: 'layouts/auth',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
