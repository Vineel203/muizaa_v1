'use strict';

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

function fromDbError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error || !error.code) return fallback;

  switch (error.code) {
    case '42P01':
      return 'Database schema is incomplete. Run npm run migrate against the production database.';
    case '42703':
      return 'Database schema is out of date. Run npm run migrate against the production database.';
    case '23505':
      return 'A duplicate record already exists for one of the entered values.';
    case '23503':
      return 'A related record could not be found. Please check your selections.';
    case '23502':
      return 'A required field is missing.';
    default:
      return fallback;
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  fromDbError,
};
