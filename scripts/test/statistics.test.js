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

  test('Test collection of blocks statistics [1]', (done) => {
    MockDate.set(1637878085886);
    const commands = [];
    let block = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    for (let i = 0; i < 110; i++) {
      block = ['sadd', `Pool1:blocks:primary:confirmed`, `{"time":${ i },"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}`];
      commands.push(block);
    }
    const expected = [
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":0,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":1,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":2,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":3,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":4,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":5,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":6,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":7,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":8,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":9,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}']];
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handleBlocksInfo('primary', (output) => {
        expect(output).toStrictEqual(expected);
        done();
      }, () => {});
    });
  });

  test('Test collection of blocks statistics [2]', (done) => {
    MockDate.set(1637878085886);
    const commands = [];
    let block = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    for (let i = 0; i < 80; i++) {
      block = ['sadd', `Pool1:blocks:primary:confirmed`, `{"time":${ i },"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}`];
      commands.push(block);
    }
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handleBlocksInfo('primary', (output) => {
        expect(output).toStrictEqual([]);
        done();
      }, () => {});
    });
  });

  test('Test collection of blocks statistics [3]', (done) => {
    MockDate.set(1637878085886);
    poolConfigCopy.statistics.blocksInterval = null;
    const commands = [];
    let block = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    for (let i = 0; i < 110; i++) {
      block = ['sadd', `Pool1:blocks:primary:confirmed`, `{"time":${ i },"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}`];
      commands.push(block);
    }
    const expected = [
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":0,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":1,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":2,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":3,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":4,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":5,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":6,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":7,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":8,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['srem', `Pool1:blocks:primary:confirmed`, '{"time":9,"hash":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}']];
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handleBlocksInfo('primary', (output) => {
        expect(output).toStrictEqual(expected);
        done();
      }, () => {});
    });
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
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":28633115.30666667,"solo":28633115.30666667},"network":{"difficulty":1.092031593681264,"hashrate":30793089.90778545},"status":{"miners":2,"workers":4}}']];
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
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":0,"solo":0},"network":{"difficulty":0.001978989105730653,"hashrate":52007.68563030699},"status":{"miners":0,"workers":0}}']];
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
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":0,"solo":0},"network":{"difficulty":0,"hashrate":0},"status":{"miners":0,"workers":0}}']];
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
      ['zadd', 'Pool1:statistics:primary:historical', 1637878085, '{"time":1637878085886,"hashrate":{"shared":0,"solo":0},"network":{"difficulty":0,"hashrate":0},"status":{"miners":0,"workers":0}}']];
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
    const commands = [];
    let record = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    for (let i = 0; i < 110; i++) {
      record = ['zadd', `Pool1:payments:primary:records`, i, `{"time":${ i },"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}`];
      commands.push(record);
    }
    const expected = [
      ['zrem', `Pool1:payments:primary:records`, '{"time":0,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":1,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":2,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":3,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":4,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":5,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":6,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":7,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":8,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":9,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}']];
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handlePaymentsInfo('primary', (output) => {
        expect(output).toStrictEqual(expected);
        done();
      }, () => {});
    });
  });

  test('Test collection of payments statistics [2]', (done) => {
    MockDate.set(1637878085886);
    const commands = [];
    let record = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    for (let i = 0; i < 80; i++) {
      record = ['zadd', `Pool1:payments:primary:records`, i, `{"time":${ i },"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}`];
      commands.push(record);
    }
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handlePaymentsInfo('primary', (output) => {
        expect(output).toStrictEqual([]);
        done();
      }, () => {});
    });
  });

  test('Test collection of payments statistics [3]', (done) => {
    MockDate.set(1637878085886);
    poolConfigCopy.statistics.paymentsInterval = null;
    const commands = [];
    let record = null;
    const poolStatistics = new PoolStatistics(logger, client, poolConfigCopy, configCopy);
    for (let i = 0; i < 110; i++) {
      record = ['zadd', `Pool1:payments:primary:records`, i, `{"time":${ i },"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}`];
      commands.push(record);
    }
    const expected = [
      ['zrem', `Pool1:payments:primary:records`, '{"time":0,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":1,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":2,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":3,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":4,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":5,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":6,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":7,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":8,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}'],
      ['zrem', `Pool1:payments:primary:records`, '{"time":9,"paid":3609.9696,"transaction":"1bcf6f1d3eee0399b70e665f534af252e2d4e8771e98a8b61e15af0c27665667"}']];
    mockSetupClient(client, commands, 'Pool1', () => {
      poolStatistics.handlePaymentsInfo('primary', (output) => {
        expect(output).toStrictEqual(expected);
        done();
      }, () => {});
    });
  });
});
