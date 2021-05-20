/*
 *
 * Builder (Updated)
 *
 */

const redis = require('redis-mock');
const PoolThreads = require('../main/threads');
const PoolLogger = require('../main/logger');
const portalConfig = require('../../configs/main/example.js');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._redisMock._maxListeners = 0;

const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test threads functionality', () => {

  let configCopy;
  beforeEach(() => {
    configCopy = Object.assign({}, portalConfig);
  });

  test('Test initialization of threads', () => {
    const poolThreads = new PoolThreads(logger, client, configCopy);
    expect(typeof poolThreads.client).toBe('object');
    expect(typeof poolThreads.setupThreads).toBe('function');
  });
});
