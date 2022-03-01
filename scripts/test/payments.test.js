/*
 *
 * Payments (Updated)
 *
 */

const MockDate = require('mockdate');
const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const nock = require('nock');
const mockDaemon = require('./daemon.mock.js');
const mockPayments = require('./payments.mock.js');

const PoolLogger = require('../main/logger');
const PoolPayments = require('../main/payments');
const Stratum = require('foundation-stratum');

const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

poolConfig.primary.address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.primary.recipients[0].address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.p2p.enabled = false;

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

process.env.poolConfigs = JSON.stringify({ Pool1: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

function mockBuildBlock(height, hash, reward, transaction, difficulty, worker, solo) {
  return JSON.stringify({
    height: height,
    hash: hash,
    reward: reward,
    transaction: transaction,
    difficulty: difficulty,
    worker: worker,
    solo: solo,
  });
}

function mockSetupClient(client, commands, coin, callback) {
  client.multi(commands).exec(() => callback());
}

////////////////////////////////////////////////////////////////////////////////

/* eslint-disable no-unused-vars */
describe('Test payments functionality', () => {

  beforeEach((done) => {
    client.flushall(() => done());
  });

  test('Test initialization of payments', () => {
    const poolPayments = new PoolPayments(logger, client);
    expect(typeof poolPayments.portalConfig).toBe('object');
    expect(typeof poolPayments.checkEnabled).toBe('function');
    expect(typeof poolPayments.handleIntervals).toBe('function');
  });

  test('Test checking for enabled configurations [1]', () => {
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.checkEnabled();
    expect(poolPayments.pools.length).toBe(1);
    expect(poolPayments.pools[0]).toBe('Pool1');
  });

  test('Test checking for enabled configurations [2]', () => {
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.enabled = false;
    poolPayments.checkEnabled();
    expect(poolPayments.pools.length).toBe(0);
  });

  test('Test round shares if deleteable [1]', () => {
    const poolPayments = new PoolPayments(logger, client);
    const rounds = [
      { height: 180, category: 'immature', serialized: 'test' },
      { height: 181, category: 'immature', serialized: 'test' },
      { height: 182, category: 'immature', serialized: 'test' }];
    expect(poolPayments.checkShares(rounds, {})).toBe(true);
  });

  test('Test round shares if deleteable [2]', () => {
    const poolPayments = new PoolPayments(logger, client);
    const rounds = [
      { height: 180, category: 'immature', serialized: 'test' },
      { height: 181, category: 'immature', serialized: 'test' },
      { height: 182, category: 'immature', serialized: 'test' }];
    const round = { height: 180, category: 'immature', serialized: 'hmm' };
    expect(poolPayments.checkShares(rounds, round)).toBe(false);
  });

  test('Test address validation functionality [1]', (done) => {
    mockDaemon.mockValidateAddress();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.checkAddress(daemon, 'test', 'validateaddress', (error, results) => {
      expect(error).toBe(true);
      expect(results).toBe('The daemon does not own the pool address listed');
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [2]', (done) => {
    mockDaemon.mockValidateAddressError();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.checkAddress(daemon, 'test', 'validateaddress', (error, results) => {
      expect(error).toBe(true);
      expect(results).toBe('{"error":true}');
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [3]', (done) => {
    mockDaemon.mockValidateAddressSecondary();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.checkAddress(daemon, 'test', 'validateaddress', (error, results) => {
      expect(error).toBe(null);
      expect(typeof results).toBe('undefined');
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [4]', (done) => {
    mockDaemon.mockGetAddressInfo();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleAddress(daemon, 'test', 'Bitcoin', (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [5]', (done) => {
    mockDaemon.mockValidateAddressSecondary();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleAddress(daemon, 'test', 'Bitcoin', (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleAddress(daemon, 'test', 'Bitcoin', (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [1]', (done) => {
    mockDaemon.mockGetBalance();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleBalance(daemon, poolConfig, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toBe(100000000);
      expect(results[1]).toBe(500000);
      expect(results[2]).toBe(8);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleBalance(daemon, poolConfig, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [3]', (done) => {
    mockDaemon.mockGetBalanceInvalid();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleBalance(daemon, poolConfig, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [4]', (done) => {
    mockDaemon.mockGetBalanceInvalid();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleBalance(daemon, poolConfig, 'Bitcoin', 'auxiliary', (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of orphan shares/times [1]', (done) => {
    MockDate.set(1637878085886);
    const poolPayments = new PoolPayments(logger, client);
    const round = { orphanShares: { 'example': 8 }, orphanTimes: { 'example': 1 }};
    const expected = [
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":0,"identifier":null,"round":"orphan","solo":false,"times":1,"types":{"valid":1,"invalid":0,"stale":0},"work":8,"worker":"example"}']];
    poolPayments.handleOrphans(round, 'Pool1', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual(expected);
      done();
    });
  });

  test('Test handling of orphan shares/times [2]', (done) => {
    MockDate.set(1637878085886);
    const poolPayments = new PoolPayments(logger, client);
    const round = { orphanShares: { 'example': 8 }, orphanTimes: {}};
    const expected = [
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":0,"identifier":null,"round":"orphan","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":8,"worker":"example"}']];
    poolPayments.handleOrphans(round, 'Pool1', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual(expected);
      done();
    });
  });

  test('Test handling of orphan shares/times [3]', (done) => {
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.handleOrphans({}, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual([]);
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [1]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleUnspent(daemon, config, 'checks', 'Bitcoin', 'primary', (error, results) => {
      expect(results[0]).toBe(2375000000);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleUnspent(daemon, config, 'checks', 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(true);
      expect(results.length).toBe(0);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [3]', (done) => {
    mockDaemon.mockListUnspentEmpty();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleUnspent(daemon, config, 'checks', 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toBe(0);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [4]', (done) => {
    mockDaemon.mockListUnspentInvalid();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleUnspent(daemon, config, 'checks', 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toBe(0);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [5]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleUnspent(daemon, config, 'start', 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Bitcoin wallet has a balance of 23.75 BTC'));
      expect(results[0]).toBe(2375000000);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [5]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].auxiliary = { coin: { name: 'Bitcoin', symbol: 'BTC' }, payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleUnspent(daemon, config, 'start', 'Bitcoin', 'auxiliary', (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Bitcoin wallet has a balance of 23.75 BTC'));
      expect(results[0]).toBe(2375000000);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of duplicate rounds [1]', (done) => {
    mockDaemon.mockDuplicateRounds();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const rounds = [
      { hash: 'abcd', height: 180, duplicate: true },
      { hash: 'abce', height: 180, duplicate: true },
      { hash: 'abcf', height: 181, duplicate: false }];
    poolPayments.handleDuplicates(daemon, rounds, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(1);
      expect(results[0][0].hash).toBe('abcf');
      expect(results[0][0].duplicate).toBe(false);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of duplicate rounds [2]', (done) => {
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.handleDuplicates(daemon, [], 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      done();
    });
  });

  test('Test handling of duplicate rounds [3]', (done) => {
    mockDaemon.mockDuplicateBlocks();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const rounds = [
      { hash: 'abcd', height: 180, duplicate: true },
      { hash: 'abcd', height: 180, duplicate: true },
      { hash: 'abcf', height: 181, duplicate: false }];
    poolPayments.handleDuplicates(daemon, rounds, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(1);
      expect(results[0][0].hash).toBe('abcf');
      expect(results[0][0].duplicate).toBe(false);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of duplicate rounds [4]', (done) => {
    mockDaemon.mockDuplicateBlocks();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const rounds = [
      { hash: 'abcd', height: 180, duplicate: true },
      { hash: 'abce', height: 181, duplicate: true },
      { hash: 'abcf', height: 182, duplicate: false }];
    poolPayments.handleDuplicates(daemon, rounds, 'Bitcoin', 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(1);
      expect(results[0][0].hash).toBe('abcf');
      expect(results[0][0].duplicate).toBe(false);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of immature blocks [1]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, { 'example': 20.15 }, 20.15, {}, { 'example': 8 }, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].immature).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, { 'example': 20.15 }, 20.15, {}, {}, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toStrictEqual({});
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [3]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: true, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, { 'example': 20.15 }, 20.15, { 'example': 8 }, {}, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].immature).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: true, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, { 'example': 20.15 }, 20.15, {}, {}, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].immature).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(1);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [5]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, { 'example': 8.2 }, 20.15, {}, { 'example': 8 }, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].immature).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(3.28);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, {}, 20.15, {}, { 'example': 8 }, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].immature).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].auxiliary = { payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleImmature(config, round, {}, {}, 20.15, {}, { 'example': 8 }, 'auxiliary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].immature).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [1]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: false, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, { 'example': 20.15 }, 20.15, {}, { 'example': 8 }, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].generate).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      expect(results[0]['example'].shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: false, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, { 'example': 20.15 }, 20.15, {}, {}, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toStrictEqual({});
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [3]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: true, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, { 'example': 20.15 }, 20.15, { 'example': 8 }, {}, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].generate).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      expect(results[0]['example'].shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: true, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, { 'example': 20.15 }, 20.15, {}, {}, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].generate).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(1);
      expect(results[0]['example'].shares.total).toBe(1);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [5]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: false, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, { 'example': 8.2 }, 20.15, {}, { 'example': 8 }, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].generate).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(3.28);
      expect(results[0]['example'].shares.total).toBe(3.28);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: false, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, {}, 20.15, {}, { 'example': 8 }, 'primary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].generate).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      expect(results[0]['example'].shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [7]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].auxiliary = { payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { reward: 12.50, height: 180, solo: false, worker: 'example' };
    poolPayments.handleGenerate(config, round, {}, {}, 20.15, {}, { 'example': 8 }, 'auxiliary', (error, results) => {
      expect(error).toBe(null);
      expect(results[0]['example'].generate).toBe(1249960000);
      expect(results[0]['example'].shares.round).toBe(8);
      expect(results[0]['example'].shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test main block/round handling [1]', (done) => {
    const commands = [
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
      const config = poolPayments.poolConfigs['Pool1'];
      poolPayments.handleBlocks(daemon, config, 'primary', (error, results) => {
        expect(error).toBe(null);
        expect(results[0].length).toBe(4);
        expect(results[0][0].difficulty).toBe(8);
        expect(results[0][1].height).toBe(181);
        expect(results[0][2].reward).toBe(12.5);
        expect(results[0][3].transaction).toBe('txid');
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main block/round handling [2]', (done) => {
    const commands = [
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(180, 'hash2', 12.5, 'txid2', 8, 'worker2', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
      const config = poolPayments.poolConfigs['Pool1'];
      poolPayments.handleBlocks(daemon, config, 'primary', (error, results) => {
        expect(error).toBe(true);
        expect(results).toStrictEqual([]);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main worker handling [1]', (done) => {
    const commands = [
      ['hincrbyfloat', 'Pool1:payments:primary:balances', 'worker1', 672.21],
      ['hincrbyfloat', 'Pool1:payments:primary:balances', 'worker2', 391.15]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
      const config = poolPayments.poolConfigs['Pool1'];
      poolPayments.handleWorkers(config, 'primary', [[]], (error, results) => {
        expect(error).toBe(null);
        expect(Object.keys(results[1]).length).toBe(2);
        expect(results[1]['worker1'].balance).toBe(67221000000);
        expect(results[1]['worker2'].balance).toBe(39115000000);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main worker handling [2]', (done) => {
    const commands = [
      ['hincrbyfloat', 'Pool1:payments:auxiliary:balances', 'worker1', 672.21],
      ['hincrbyfloat', 'Pool1:payments:auxiliary:balances', 'worker2', 391.15]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      poolPayments.poolConfigs['Pool1'].auxiliary = { payments: {} };
      poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
      const config = poolPayments.poolConfigs['Pool1'];
      poolPayments.handleWorkers(config, 'auxiliary', [[]], (error, results) => {
        expect(error).toBe(null);
        expect(Object.keys(results[1]).length).toBe(2);
        expect(results[1]['worker1'].balance).toBe(67221000000);
        expect(results[1]['worker2'].balance).toBe(39115000000);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main transaction handling [1]', (done) => {
    mockDaemon.mockGetTransactionsGenerate();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('generate');
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Could not get transactions from daemon'));
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [3]', (done) => {
    mockDaemon.mockGetTransactionsImmature();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('immature');
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [4]', (done) => {
    mockDaemon.mockGetTransactionsSplit();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('generate');
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [5]', (done) => {
    mockDaemon.mockGetTransactionsOrphan();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].primary.address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('orphan');
      expect(results[0][0].delete).toBe(true);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [6]', (done) => {
    mockDaemon.mockGetTransactionsSingle();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('generate');
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [7]', (done) => {
    mockDaemon.mockGetTransactionsValue();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('generate');
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [8]', (done) => {
    mockDaemon.mockGetTransactionsError1();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Daemon reports invalid transaction'));
      expect(results[0][0].category).toBe('kicked');
      expect(results[0][0].delete).toBe(true);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [9]', (done) => {
    mockDaemon.mockGetTransactionsError2();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Daemon reports no details for transaction'));
      expect(results[0][0].category).toBe('kicked');
      expect(results[0][0].delete).toBe(true);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [10]', (done) => {
    mockDaemon.mockGetTransactionsError3();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'primary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Unable to load transaction'));
      expect(results).toStrictEqual([[], []]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [11]', (done) => {
    mockDaemon.mockGetTransactionsValue();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    poolPayments.poolConfigs['Pool1'].auxiliary = { payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, 'auxiliary', [rounds, [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('generate');
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main shares handling [1]', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker1', JSON.stringify({ time: 0, work: 8, worker: 'worker1', times: 20, solo: true })],
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker2', JSON.stringify({ time: 0, work: 28, worker: 'worker2', times: 40, solo: false })]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      const config = poolPayments.poolConfigs['Pool1'];
      const rounds = [{ height: 180 }];
      poolPayments.handleShares(config, 'primary', [rounds, [], []], (error, results) => {
        expect(error).toBe(null);
        expect(results[2][0]['worker1']).toBe(20);
        expect(results[2][0]['worker2']).toBe(40);
        expect(results[3][0]['worker1']).toBe(8);
        expect(results[4][0]['worker2']).toBe(28);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main shares handling [2]', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker1.w1', JSON.stringify({ time: 0, work: 8, worker: 'worker1.w1', times: 40, solo: true })],
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker2.w1', JSON.stringify({ time: 0, work: 28, worker: 'worker2.w1', times: 25, solo: false })],
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker1.w2', JSON.stringify({ time: 0, work: 8, worker: 'worker1.w2', times: 45, solo: true })],
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker2.w2', JSON.stringify({ time: 0, work: 28, worker: 'worker2.w2', times: 30, solo: false })],
      ['hset', 'Pool1:rounds:primary:round-181:shares', 'worker1', JSON.stringify({ time: 0, work: 26, worker: 'worker1', times: 60, solo: true })],
      ['hset', 'Pool1:rounds:primary:round-181:shares', 'worker2', JSON.stringify({ time: 0, work: 40, worker: 'worker2', times: 43, solo: false })]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      const config = poolPayments.poolConfigs['Pool1'];
      const rounds = [{ height: 180 }, { height: 181 }];
      poolPayments.handleShares(config, 'primary', [rounds, [], []], (error, results) => {
        expect(error).toBe(null);
        expect(results[2][0]['worker1']).toBe(45);
        expect(results[2][0]['worker2']).toBe(30);
        expect(results[3][0]['worker1']).toBe(16);
        expect(results[4][0]['worker2']).toBe(56);
        expect(results[3][1]['worker1']).toBe(26);
        expect(results[4][1]['worker2']).toBe(40);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test calculation of currency owed [1]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', reward: 12.5 }, { category: 'generate', reward: 12.5 }];
    poolPayments.handleOwed(daemon, config, 'checks', 'primary', [rounds, [], [], [], [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('immature');
      expect(results[0][0].reward).toBe(12.5);
      expect(results[0][1].category).toBe('generate');
      expect(results[0][1].reward).toBe(12.5);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test calculation of currency owed [2]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', reward: 12.5 }, { category: 'generate', reward: 12.5 }];
    const workers = [{ balance: 10.5 }, { balance: 10 }];
    poolPayments.handleOwed(daemon, config, 'payments', 'primary', [rounds, workers, [], [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('immature');
      expect(results[0][0].reward).toBe(12.5);
      expect(results[0][1].category).toBe('generate');
      expect(results[0][1].reward).toBe(12.5);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test calculation of currency owed [3]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', reward: 12.5 }, { category: 'generate', reward: 12.5 }];
    const workers = [{ balance: 10.5 }, { balance: 10 }];
    poolPayments.handleOwed(daemon, config, 'checks', 'primary', [rounds, workers, [], [], []], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Error checking pool balance before processing payments'));
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      done();
    });
  });

  test('Test calculation of currency owed [4]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'orphan', reward: 12.5 }, { category: 'kicked', reward: 12.5 }, { category: 'other', reward: 12.5 }];
    const workers = [{ balance: 10.5 }, { balance: 10 }];
    poolPayments.handleOwed(daemon, config, 'checks', 'primary', [rounds, workers, [], [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('orphan');
      expect(results[0][0].reward).toBe(12.5);
      expect(results[0][1].category).toBe('kicked');
      expect(results[0][1].reward).toBe(12.5);
      console.log.mockClear();
      done();
    });
  });

  test('Test calculation of currency owed [5]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'generate', reward: 500 }];
    poolPayments.handleOwed(daemon, config, 'payments', 'primary', [rounds, [], [], [], [], []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Insufficient funds'));
      expect(results[0][0].category).toBe('generate');
      expect(results[0][0].reward).toBe(500);
      console.log.mockClear();
      done();
    });
  });

  test('Test calculation of currency owed [6]', (done) => {
    mockDaemon.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].auxiliary = { payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', reward: 12.5 }, { category: 'generate', reward: 12.5 }];
    poolPayments.handleOwed(daemon, config, 'checks', 'auxiliary', [rounds, [], [], [], [], []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe('immature');
      expect(results[0][0].reward).toBe(12.5);
      expect(results[0][1].category).toBe('generate');
      expect(results[0][1].reward).toBe(12.5);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [1]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'immature', height: 180, reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleRewards(config, 'checks', 'primary', [[round], {}, [{ 'example': 20.15 }], [{}], [{ 'example': 8 }]], (error, results) => {
      expect(error).toBe(null);
      expect(results[1]['example'].immature).toBe(1249960000);
      expect(results[1]['example'].shares.round).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'generate', height: 180, reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleRewards(config, 'checks', 'primary', [[round], {}, [{ 'example': 20.15 }], [{}], [{ 'example': 8 }]], (error, results) => {
      expect(error).toBe(null);
      expect(results[1]['example'].generate).toBe(1249960000);
      expect(results[1]['example'].shares.round).toBe(8);
      expect(results[1]['example'].shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [3]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'orphan', height: 180, reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleRewards(config, 'checks', 'primary', [[round], {}, [{ 'example': 20.15 }], [{}], [{ 'example': 8 }]], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].orphanShares['example']).toBe(8);
      expect(results[0][0].orphanTimes['example']).toBe(20.15);
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'immature', height: 180, reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleRewards(config, 'checks', 'primary', [[round], {}, [{ 'example': 20.15 }], [{}], [{}]], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching('No worker shares for round'));
      expect(results[1]).toStrictEqual({});
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'immature', height: 180, reward: 12.50, solo: false, worker: 'example' };
    poolPayments.handleRewards(config, 'payments', 'primary', [[round], {}, [{ 'example': 20.15 }], [{}], [{}]], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('No worker shares for round'));
      expect(results[1]).toStrictEqual({});
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [5]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'immature', height: 180, reward: 12.50, solo: false, worker: 'example' };
    const times = [{ 'example1': 20.15, 'example2': 15.267 }];
    const shared = [{ 'example1': 8, 'example2': 16 }];
    poolPayments.handleRewards(config, 'checks', 'primary', [[round], {}, times, [{}], shared], (error, results) => {
      expect(error).toBe(null);
      expect(results[1]['example1'].immature).toBe(416653333);
      expect(results[1]['example1'].shares.round).toBe(8);
      expect(results[1]['example2'].immature).toBe(833306667);
      expect(results[1]['example2'].shares.round).toBe(16);
      console.log.mockClear();
      done();
    });
  });

  test('Test reward calculation given rounds/workers [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const round = { category: 'generate', height: 180, reward: 12.50, solo: false, worker: 'example' };
    const times = [{ 'example1': 20.15, 'example2': 4.623 }];
    const shared = [{ 'example1': 8, 'example2': 16 }];
    poolPayments.handleRewards(config, 'checks', 'primary', [[round], {}, times, [{}], shared], (error, results) => {
      expect(error).toBe(null);
      expect(results[1]['example1'].generate).toBe(856136986);
      expect(results[1]['example1'].shares.round).toBe(8);
      expect(results[1]['example1'].shares.total).toBe(8);
      expect(results[1]['example2'].generate).toBe(393823014);
      expect(results[1]['example2'].shares.round).toBe(3.68);
      expect(results[1]['example2'].shares.total).toBe(3.68);
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [1]', (done) => {
    mockDaemon.mockSendMany();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    const expected = [
      ["zadd", "Pool1:payments:primary:records", 1637878085, "{\"time\":1637878085886,\"paid\":117.12181095,\"miners\":3,\"transaction\":\"transactionID\"}"]];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(null);
      expect(results.length).toBe(3);
      expect(results[2]).toStrictEqual(expected);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [2]', (done) => {
    mockDaemon.mockSendMany();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers2], (error, results) => {
      expect(error).toBe(null);
      expect(results.length).toBe(2);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [3]', (done) => {
    mockDaemon.mockSendManyError1();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('RPC command did not return txid. Disabling payments to prevent possible double-payouts'));
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [4]', (done) => {
    mockDaemon.mockSendManyError2();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Error sending payments {"code":-5}'));
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [5]', (done) => {
    mockDaemon.mockSendManyError3();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Insufficient funds for payments: {"code":-6}'));
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [6]', (done) => {
    mockDaemon.mockSendManyError4();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Error sending payments {"message":"error"}'));
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [7]', (done) => {
    mockDaemon.mockSendManyError5();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'primary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Error sending payments'));
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test sending currency through daemon [8]', (done) => {
    mockDaemon.mockSendMany();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].auxiliary = { coin: { symbol: 'BTC' }, payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.primary.payments.daemon], () => {});
    const config = poolPayments.poolConfigs['Pool1'];
    poolPayments.handleSending(daemon, config, 'auxiliary', [mockPayments.rounds, mockPayments.workers1], (error, results) => {
      expect(error).toBe(null);
      expect(results.length).toBe(3);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [1]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { immature: 1250000000 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:generate', 'example1', 0],
      ['hset', 'Pool1:payments:primary:immature', 'example1', 12.5]];
    poolPayments.handleUpdates(config, 'checks', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [2]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { immature: 1250000000 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:immature', 'example1', 12.5],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 0],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [3]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { generate: 1250000000 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 0],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [4]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'generate', height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { generate: 1250000000 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['smove', 'Pool1:blocks:primary:pending', 'Pool1:blocks:primary:confirmed', 'serialized'],
      ['del', 'Pool1:rounds:primary:round-180:counts'],
      ['del', 'Pool1:rounds:primary:round-180:shares'],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 0],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [5]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'generate', height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { generate: 1250000000 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:generate', 'example1', 12.5],
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0]];
    poolPayments.handleUpdates(config, 'checks', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [6]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'generate', height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { sent: 12.5 }};
    const expected = [
      ['hincrbyfloat', 'Pool1:payments:primary:paid', 'example1', 12.5],
      ['hset', 'Pool1:payments:primary:balances', 'example1', 0],
      ['hset', 'Pool1:payments:primary:generate', 'example1', 0],
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['smove', 'Pool1:blocks:primary:pending', 'Pool1:blocks:primary:confirmed', 'serialized'],
      ['del', 'Pool1:rounds:primary:round-180:counts'],
      ['del', 'Pool1:rounds:primary:round-180:shares'],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 12.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [7]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'generate', height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { sent: 12.5, change: 0 }};
    const expected = [
      ['hincrbyfloat', 'Pool1:payments:primary:paid', 'example1', 12.5],
      ['hset', 'Pool1:payments:primary:balances', 'example1', 0],
      ['hset', 'Pool1:payments:primary:generate', 'example1', 0],
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['smove', 'Pool1:blocks:primary:pending', 'Pool1:blocks:primary:confirmed', 'serialized'],
      ['del', 'Pool1:rounds:primary:round-180:counts'],
      ['del', 'Pool1:rounds:primary:round-180:shares'],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 12.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [8]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'generate', height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { sent: 12.5, change: 150000 }};
    const expected = [
      ['hincrbyfloat', 'Pool1:payments:primary:paid', 'example1', 12.5],
      ['hset', 'Pool1:payments:primary:balances', 'example1', 0],
      ['hset', 'Pool1:payments:primary:generate', 'example1', 0],
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['smove', 'Pool1:blocks:primary:pending', 'Pool1:blocks:primary:confirmed', 'serialized'],
      ['del', 'Pool1:rounds:primary:round-180:counts'],
      ['del', 'Pool1:rounds:primary:round-180:shares'],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 12.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [9]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'kicked', height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { immature: 0 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['smove', 'Pool1:blocks:primary:pending', 'Pool1:blocks:primary:kicked', 'serialized'],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 0],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [10]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'kicked', delete: true, height: 180, hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { immature: 0 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:immature', 'example1', 0],
      ['smove', 'Pool1:blocks:primary:pending', 'Pool1:blocks:primary:kicked', 'serialized'],
      ['del', 'Pool1:rounds:primary:round-180:counts'],
      ['del', 'Pool1:rounds:primary:round-180:shares'],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 0],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [11]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].primary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.minPaymentSatoshis = 50000000;
    poolPayments.poolConfigs['Pool1'].primary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].primary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { immature: 1250000000, change: 50000000 }};
    const expected = [
      ['hset', 'Pool1:payments:primary:balances', 'example1', 0.5],
      ['hset', 'Pool1:payments:primary:generate', 'example1', 0],
      ['hset', 'Pool1:payments:primary:immature', 'example1', 12.5],
      ['hincrbyfloat', 'Pool1:payments:primary:counts', 'total', 0],
      ['hset', 'Pool1:payments:primary:counts', 'last', 1637878085886],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1637885285886]];
    poolPayments.handleUpdates(config, 'payments', 'primary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test final updates given pipeline end [12]', (done) => {
    MockDate.set(1637878085886);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs['Pool1'].auxiliary = { payments: {} };
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.magnitude = 100000000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.coinPrecision = 8;
    poolPayments.poolConfigs['Pool1'].auxiliary.payments.processingFee = parseFloat(0.0004);
    const config = poolPayments.poolConfigs['Pool1'];
    const rounds = [{ category: 'immature', hash: 'hash', serialized: 'serialized', confirmations: 40 }];
    const workers = { 'example1': { immature: 1250000000 }};
    const expected = [
      ['hset', 'Pool1:payments:auxiliary:generate', 'example1', 0],
      ['hset', 'Pool1:payments:auxiliary:immature', 'example1', 12.5]];
    poolPayments.handleUpdates(config, 'checks', 'auxiliary', Date.now(), [rounds, workers], (error, results) => {
      expect(results).toStrictEqual(expected);
      console.log.mockClear();
      done();
    });
  });

  test('Test info message on successful pipeline', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.outputPaymentInfo(['Pool1']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Payment processing setup to run every'));
    console.log.mockClear();
  });
});
