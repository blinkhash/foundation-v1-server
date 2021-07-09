/*
 *
 * Main (Updated)
 *
 */

const path = require('path');

const PoolDatabase = require('./main/database');
const PoolLogger = require('./main/logger');
const PoolThreads = require('./main/threads');

////////////////////////////////////////////////////////////////////////////////

let config;
const normalizedPath = path.join(__dirname, '../configs/main/config.js');

// Check to Ensure Config Exists
try {
  config = require(normalizedPath);
} catch(e) {
  throw new Error('Unable to find config.js file. Read the installation/setup instructions.');
}

const logger = new PoolLogger(config);
const database = new PoolDatabase(logger, config);
const client = database.buildRedisClient({ detect_buffers: true });

// Check for Redis Connection Errors
client.on('error', () => {
  throw new Error('Unable to establish database connection. Ensure Redis is setup properly and listening.');
});

// Start Pool Server
database.checkRedisClient(client);
new PoolThreads(logger, client, config).setupThreads();
