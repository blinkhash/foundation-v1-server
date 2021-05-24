/*
 *
 * Payments (Updated)
 *
 */

const nock = require('nock');
const mock = require('./daemon.mock.js');
const redis = require('redis-mock');

const PoolLogger = require('../main/logger');
const PoolPayments = require('../main/payments');
const Stratum = require('blinkhash-stratum');

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

process.env.partnerConfigs = JSON.stringify({});
process.env.poolConfigs = JSON.stringify({ Bitcoin: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test payments functionality', () => {

  let configCopy;
  beforeEach(() => {
    configCopy = Object.assign({}, poolConfig);
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
    expect(poolPayments.coins.length).toBe(1);
    expect(poolPayments.coins[0]).toBe('Bitcoin');
  });

  test('Test checking for enabled configurations [2]', () => {
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.enabled = false;
    poolPayments.checkEnabled();
    expect(poolPayments.coins.length).toBe(0);
  });

  test('Test round shares if deleteable [1]', () => {
    const poolPayments = new PoolPayments(logger, client);
    const rounds = [
      { height: 180, category: "immature", serialized: "test" },
      { height: 181, category: "immature", serialized: "test" },
      { height: 182, category: "immature", serialized: "test" }];
    expect(poolPayments.checkShares(rounds, {})).toBe(true);
  });

  test('Test round shares if deleteable [2]', () => {
    const poolPayments = new PoolPayments(logger, client);
    const rounds = [
      { height: 180, category: "immature", serialized: "test" },
      { height: 181, category: "immature", serialized: "test" },
      { height: 182, category: "immature", serialized: "test" }];
    const round = { height: 180, category: "immature", serialized: "hmm" };
    expect(poolPayments.checkShares(rounds, round)).toBe(false);
  });

  test('Test address validation functionality [1]', (done) => {
    mock.mockValidateAddress();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.checkAddress(daemon, "test", "Bitcoin", "validateaddress", (error, message) => {
      expect(error).toBe(true);
      expect(message).toBe("The daemon does not own the pool address listed");
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [2]', (done) => {
    mock.mockValidateAddressError();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.checkAddress(daemon, "test", "Bitcoin", "validateaddress", (error, message) => {
      expect(error).toBe(true);
      expect(message).toBe("{\"error\":true}");
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [3]', (done) => {
    mock.mockValidateAddressSecondary();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.checkAddress(daemon, "test", "Bitcoin", "validateaddress", (error, message) => {
      expect(error).toBe(null);
      expect(typeof message).toBe("undefined");
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [4]', (done) => {
    mock.mockGetAddressInfo();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleAddress(daemon, "test", "Bitcoin", (error, message) => {
      expect(error).toBe(null);
      expect(message).toStrictEqual([]);
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [5]', (done) => {
    mock.mockValidateAddressSecondary();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleAddress(daemon, "test", "Bitcoin", (error, message) => {
      expect(error).toBe(null);
      expect(message).toStrictEqual([]);
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleAddress(daemon, "test", "Bitcoin", (error, message) => {
      expect(error).toBe(true);
      expect(message).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [1]', (done) => {
    mock.mockGetBalance();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleBalance(daemon, poolConfig, "Bitcoin", (error, message) => {
      expect(message[0]).toBe(100000000);
      expect(message[1]).toBe(500000);
      expect(message[2]).toBe(8);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleBalance(daemon, poolConfig, "Bitcoin", (error, message) => {
      expect(error).toBe(true);
      expect(message).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test balance retrieval from daemon [3]', (done) => {
    mock.mockGetBalanceInvalid();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleBalance(daemon, poolConfig, "Bitcoin", (error, message) => {
      expect(error).toBe(true);
      expect(message).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

});
