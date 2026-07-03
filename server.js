'use strict';

require('dotenv').config();

const createApp = require('./app');

const app = createApp();
const port = parseInt(process.env.PORT, 10) || 3000;

app.listen(port, () => {
  console.log(`Muizaa Logistics running at http://localhost:${port}`);
});
