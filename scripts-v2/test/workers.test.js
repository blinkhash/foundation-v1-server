/*
 *
 * Workers (Updated)
 *
 */

const redis = require('redis-mock');
const mock = require('./stratum.mock.js');
const nock = require('nock');

const PoolLogger = require('../main/logger');
const PoolWorkers = require('../main/workers');

const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

poolConfig.address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.recipients[0].address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.p2p.enabled = false;

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._redisMock._maxListeners = 0;

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

process.env.poolConfigs = JSON.stringify({ Bitcoin: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test workers functionality', () => {

  test('Test initialization of workers', () => {
    const poolWorkers = new PoolWorkers(logger, client);
    expect(typeof poolWorkers.portalConfig).toBe('object');
    expect(typeof poolWorkers.createPromises).toBe('function');
    expect(typeof poolWorkers.setupWorkers).toBe('function');
  });

  test('Test worker stratum creation [1]', (done) => {
    mock.mockDaemon();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolWorkers = new PoolWorkers(logger, client);
    poolWorkers.setupWorkers(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('p2p has been disabled in the configuration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Stratum pool server started for Bitcoin'));
      const poolStratum = poolWorkers.pools.Bitcoin;
      poolStratum.poolStratum.stratum.stopServer();
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test worker stratum creation [2]', (done) => {
    mock.mockGetInitialBatch();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolWorkers = new PoolWorkers(logger, client);
    poolWorkers.setupWorkers(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Failed to connect daemon'));
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });
});
