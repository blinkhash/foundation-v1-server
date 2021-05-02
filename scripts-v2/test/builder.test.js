/*
 *
 * Builder (Updated)
 *
 */

const utils = require('../main/utils');
const redis = require('redis-mock');
const PoolInitializer = require('../main/builder');
const PoolLogger = require('../main/logger');

const portalConfig = utils.readFile('example.json');
const logger = new PoolLogger(portalConfig);

const client = redis.createClient({
    'port': portalConfig.redis.port,
    'host': portalConfig.redis.host,
});
client._redisMock._maxListeners = 0;

////////////////////////////////////////////////////////////////////////////////

describe('Test builder functionality', () => {

});
