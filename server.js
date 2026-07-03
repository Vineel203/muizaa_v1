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

app.listen(port, host, () => {
  console.log(`Muizaa Logistics listening on ${host}:${port}`);
});
