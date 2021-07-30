/*
 *
 * Builder (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const PoolThreads = require('../main/threads');
const PoolLogger = require('../main/logger');
const portalConfig = require('../../configs/main/example.js');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test threads functionality', () => {

  let configCopy;
  beforeEach((done) => {
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    client.flushall(() => done());
  });

  test('Test initialization of threads', () => {
    const poolThreads = new PoolThreads(logger, client, configCopy);
    expect(typeof poolThreads.client).toBe('object');
    expect(typeof poolThreads.setupThreads).toBe('function');
  });
});
