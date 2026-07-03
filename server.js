'use strict';

require('./config/env');

const createApp = require('./app');

function validateStartupEnv() {
  const missing = ['DATABASE_URL', 'SESSION_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`FATAL: Missing environment variables: ${missing.join(', ')}`);
    console.error('Local: add them to .env');
    console.error('Firebase App Hosting: set secrets in apphosting.yaml / Firebase console');
    process.exit(1);
  }
}

validateStartupEnv();

const app = createApp();
const port = parseInt(process.env.PORT, 10) || 8080;
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`Muizaa Logistics listening on http://localhost:${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${port} is already in use.`);
    console.error('Stop the other process, or run:');
    console.error(`  netstat -ano | findstr :${port}`);
    console.error('  taskkill /PID <pid> /F');
    console.error('\nOr change PORT in .env to another port (e.g. 3001).\n');
    process.exit(1);
  }
  throw err;
});
