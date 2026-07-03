'use strict';

const appConfig = require('../config/app');
const { STAGES, STAGE_LABELS, STAGE_COLORS } = require('../config/permissions');
const { formatDateTime, formatDate } = require('../utils/helpers');

function attachLocals(req, res, next) {
  res.locals.appName = appConfig.appName;
  res.locals.user = req.session?.user || null;
  res.locals.currentPath = req.path;
  res.locals.STAGES = STAGES;
  res.locals.STAGE_LABELS = STAGE_LABELS;
  res.locals.STAGE_COLORS = STAGE_COLORS;
  res.locals.formatDateTime = formatDateTime;
  res.locals.formatDate = formatDate;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}

module.exports = attachLocals;
