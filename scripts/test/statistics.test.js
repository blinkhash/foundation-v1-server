/*
 *
 * Shares (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const nock = require('nock');
const mockDaemon = require('./daemon.mock.js');

const PoolLogger = require('../main/logger');
const PoolStatistics = require('../main/statistics');
const Stratum = require('foundation-stratum');

const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

poolConfig.debug = true;
poolConfig.primary.address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.primary.recipients[0].address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test statistics functionality', () => {

  let poolConfigCopy, configCopy;
  beforeEach((done) => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    client.flushall(() => done());
  });

  test('Test initialization of statistics', () => {
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    expect(typeof poolStatistics.poolConfig).toBe('object');
    expect(typeof poolStatistics.handleMiningInfo).toBe('function');
    expect(typeof poolStatistics.setupStatistics).toBe('function');
  });

  test('Test collection of mining statistics [1]', (done) => {
    mockDaemon.mockGetMiningInfo();
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const daemon = new Stratum.daemon([poolConfigCopy.primary.payments.daemon], () => {});
    const expected = [
      ['hset', 'Pool1:statistics:primary:network', 'difficulty', 0.001978989105730653],
      ['hset', 'Pool1:statistics:primary:network', 'hashrate', 52007.68563030699],
      ['hset', 'Pool1:statistics:primary:network', 'height', 611207]];
    poolStatistics.handleMiningInfo(daemon, 'primary', (commands) => {
      expect(commands.length).toBe(3);
      expect(commands[0]).toStrictEqual(expected[0]);
      expect(commands[1]).toStrictEqual(expected[1]);
      expect(commands[2]).toStrictEqual(expected[2]);
      nock.cleanAll();
      done();
    }, () => {});
  });

  test('Test collection of mining statistics [2]', (done) => {
    mockDaemon.mockGetMiningInfoError1();
    poolConfigCopy.settings.statisticsRefreshInterval = null;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const daemon = new Stratum.daemon([poolConfigCopy.primary.payments.daemon], () => {});
    poolStatistics.handleMiningInfo(daemon, 'primary', () => {}, (error) => {
      expect(error.code).toBe(-5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Error with statistics daemon'));
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });
});
