'use strict';

const { PERMISSIONS } = require('../config/permissions');
const { ForbiddenError } = require('../utils/errors');

function requirePermission(permission) {
  return (req, res, next) => {
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      return next(new ForbiddenError('Permission not configured'));
    }

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission for this action'));
    }

    return next();
  };
}

module.exports = {
  requirePermission,
};
