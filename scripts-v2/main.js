/*
 *
 * Main (Updated)
 *
 */

const fs = require('fs');
const utils = require('./main/utils');

const PoolDatabase = require('./main/database');
const PoolLogger = require('./main/logger');
const PoolBuilder = require('./main/builder');
const PoolInitializer = PoolBuilder.initializer;

////////////////////////////////////////////////////////////////////////////////

// Check to Ensure Config Exists
if (!fs.existsSync('config.json')) {
    throw new Error('Unable to find config.json file. Read the installation/setup instructions.');
}

// Initialize Secondary Services
const config = utils.readFile('config.json');
const logger = new PoolLogger({ logLevel: config.logLevel, logColors: config.logColors });
const database = new PoolDatabase(logger, config);
const client = database.buildRedisClient();

// Check for Redis Connection Errors
client.on('error', () => {
    throw new Error('Unable to establish database connection. Ensure Redis is setup properly and listening.');
});

// Start Pool Server
database.checkRedisClient(client);
new PoolInitializer(logger, client, config).setupClusters();
