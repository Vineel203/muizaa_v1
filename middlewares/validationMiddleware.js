'use strict';

const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError('Validation failed', errors.array()));
  }
  return next();
}

module.exports = {
  validateRequest,
};
