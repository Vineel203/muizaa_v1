'use strict';

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const appConfig = require('./config/app');
const sessionConfig = require('./config/session');
const { getPool, query } = require('./utils/db');
const attachLocals = require('./middlewares/localsMiddleware');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const routes = require('./routes');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('layout', 'layouts/main');
  app.set('layout extractScripts', true);
  app.set('layout extractStyles', true);
  app.set('trust proxy', 1);

  app.use(expressLayouts);

  if (appConfig.isDevelopment) {
    app.use(morgan('dev'));
  }

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    session({
      store: new pgSession({
        pool: getPool(),
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: sessionConfig.secret,
      name: sessionConfig.name,
      resave: sessionConfig.resave,
      saveUninitialized: sessionConfig.saveUninitialized,
      cookie: {
        ...sessionConfig.cookie,
        maxAge: sessionConfig.maxAge,
      },
    })
  );

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/health/db', async (req, res) => {
    try {
      await query('SELECT 1 AS ok');

      const requiredTables = [
        'users',
        'session',
        'locations',
        'consignors',
        'consignees',
        'transporters',
        'drivers',
        'truck_owners',
        'trucks',
        'banking_details',
        'goods',
        'booking_sequences',
        'bookings',
        'booking_history',
      ];

      const tables = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `, [requiredTables]);

      const tableNames = tables.rows.map((r) => r.table_name);
      const missing = requiredTables.filter((t) => !tableNames.includes(t));

      if (missing.length) {
        return res.status(503).json({
          status: 'error',
          database: 'connected',
          message: `Missing tables: ${missing.join(', ')}. Run npm run migrate.`,
          missingTables: missing,
        });
      }

      const [users, bookings] = await Promise.all([
        query('SELECT COUNT(*)::int AS count FROM users'),
        query('SELECT COUNT(*)::int AS count FROM bookings'),
      ]);

      res.status(200).json({
        status: 'ok',
        database: 'connected',
        users: users.rows[0].count,
        bookings: bookings.rows[0].count,
        cloudSqlInstance: process.env.CLOUD_SQL_INSTANCE || null,
        connectionMode: process.env.CLOUD_SQL_USE_CONNECTOR === 'true' ? 'connector' : 'direct',
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        database: 'unreachable',
        message: error.message,
        cloudSqlInstance: process.env.CLOUD_SQL_INSTANCE || null,
      });
    }
  });

  app.use(attachLocals);
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
