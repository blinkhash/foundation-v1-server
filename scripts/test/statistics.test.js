/*
 *
 * Shares (Updated)
 *
 */

const MockDate = require('mockdate');
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

function mockSetupClient(client, commands, pool, callback) {
  client.multi(commands).exec(() => callback());
}

////////////////////////////////////////////////////////////////////////////////

describe('Test statistics functionality', () => {

  beforeEach((done) => {
    client.flushall(() => done());
  });

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

  test('Test processing of historical statistics [1]', () => {
    MockDate.set(1637878085886);
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const results = [
      { difficulty: '1.092031593681264', hashrate: '30793089.90778545', height: '2199533' },
      ['{"time":1644418236971,"work":1,"identifier":"","effort":2.777761938931719,"worker":"QRspi5xuc5oaxfNzJD5Pqr9vMNLbF56L3M.worker1","solo":false,"round":"ff40848b"}',
        '{"time":1644418236972,"work":1,"identifier":"","effort":2.777761938931719,"worker":"QRspi5xuc5oaxfNzJD5Pqr9vMNLbF56L3M.worker2","solo":false,"round":"ff40848b"}'],
      ['{"time":1644418236973,"work":1,"identifier":"","effort":2.777761938931719,"worker":"QRspi5xuc5oaxfNzJD5Pqr9vMNLbF56L3N.worker1","solo":true,"round":"ff40848b"}',
        '{"time":1644418236974,"work":1,"identifier":"","effort":2.777761938931719,"worker":"QRspi5xuc5oaxfNzJD5Pqr9vMNLbF56L3N.worker2","solo":true,"round":"ff40848b"}'], 0];
    const expected = [
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":[{"identifier":"","hashrate":28633115.30666667}],"solo":[{"identifier":"","hashrate":28633115.30666667}]},"network":{"difficulty":1.092031593681264,"hashrate":30793089.90778545},"status":{"miners":2,"workers":4}}']];
    const processed = poolStatistics.calculateHistoricalInfo(results, 'primary');
    expect(processed).toStrictEqual(expected);
  });

  test('Test collection of hashrate statistics [1]', (done) => {
    MockDate.set(1637878085886);
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const expected = [
      ['zremrangebyscore', 'Pool1:rounds:primary:current:shared:hashrate', 0, '(1637877785'],
      ['zremrangebyscore', 'Pool1:rounds:primary:current:solo:hashrate', 0, '(1637877785']];
    poolStatistics.handleHashrateInfo('primary', (commands) => {
      expect(commands).toStrictEqual(expected);
      done();
    }, () => {});
  });

  test('Test collection of hashrate statistics [2]', (done) => {
    MockDate.set(1637878085886);
    poolConfigCopy.statistics.hashrateInterval = null;
    poolConfigCopy.statistics.hashrateWindow = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const expected = [
      ['zremrangebyscore', 'Pool1:rounds:primary:current:shared:hashrate', 0, '(1637877785'],
      ['zremrangebyscore', 'Pool1:rounds:primary:current:solo:hashrate', 0, '(1637877785']];
    poolStatistics.handleHashrateInfo('primary', (commands) => {
      expect(commands).toStrictEqual(expected);
      done();
    }, () => {});
  });

  test('Test collection of historical statistics [1]', (done) => {
    MockDate.set(1637878085886);
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const commands = [
      ['hset', 'Pool1:statistics:primary:network', 'difficulty', 0.001978989105730653],
      ['hset', 'Pool1:statistics:primary:network', 'hashrate', 52007.68563030699],
      ['hset', 'Pool1:statistics:primary:network', 'height', 611207]];
    const expected = [
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":[{"identifier":"","hashrate":0}],"solo":[{"identifier":"","hashrate":0}]},"network":{"difficulty":0.001978989105730653,"hashrate":52007.68563030699},"status":{"miners":0,"workers":0}}']];
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handleHistoricalInfo('primary', (output) => {
        expect(output).toStrictEqual(expected);
        done();
      }, () => {});
    });
  });

  test('Test collection of historical statistics [2]', (done) => {
    MockDate.set(1637878085886);
    poolConfigCopy.statistics.historicalInterval = null;
    poolConfigCopy.statistics.historicalWindow = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const commands = [
      ['hset', 'Pool1:statistics:primary:network', 'height', 611207]];
    const expected = [
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":[{"identifier":"","hashrate":0}],"solo":[{"identifier":"","hashrate":0}]},"network":{"difficulty":0,"hashrate":0},"status":{"miners":0,"workers":0}}']];
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handleHistoricalInfo('primary', (output) => {
        expect(output).toStrictEqual(expected);
        done();
      }, () => {});
    });
  });

  test('Test collection of historical statistics [3]', (done) => {
    MockDate.set(1637878085886);
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const expected = [
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":[{"identifier":"","hashrate":0}],"solo":[{"identifier":"","hashrate":0}]},"network":{"difficulty":0,"hashrate":0},"status":{"miners":0,"workers":0}}']];
    poolStatistics.handleHistoricalInfo('primary', (output) => {
      expect(output).toStrictEqual(expected);
      done();
    }, () => {});
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
    poolConfigCopy.statistics.refreshInterval = null;
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

  test('Test collection of payments statistics [1]', (done) => {
    MockDate.set(1637878085886);
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const expected = [
      ['zremrangebyscore', 'Pool1:payments:primary:records', 0, '(1637273285']];
    poolStatistics.handlePaymentsInfo('primary', (commands) => {
      expect(commands).toStrictEqual(expected);
      done();
    }, () => {});
  });

  test('Test collection of hashrate statistics [2]', (done) => {
    MockDate.set(1637878085886);
    poolConfigCopy.statistics.paymentsInterval = null;
    poolConfigCopy.statistics.paymentsWindow = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    const expected = [
      ['zremrangebyscore', 'Pool1:payments:primary:records', 0, '(1637273285']];
    poolStatistics.handlePaymentsInfo('primary', (commands) => {
      expect(commands).toStrictEqual(expected);
      done();
    }, () => {});
  });
});
