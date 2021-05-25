/*
 *
 * Payments (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const nock = require('nock');
const mock = require('./daemon.mock.js');

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
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

process.env.partnerConfigs = JSON.stringify({});
process.env.poolConfigs = JSON.stringify({ Bitcoin: poolConfig });
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
  client.multi(commands).exec((error, results) => {
    callback();
  });
}

////////////////////////////////////////////////////////////////////////////////

describe('Test payments functionality', () => {

  beforeEach((done) => {
    client.flushall((error, results) => {
      done();
    });
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
    poolPayments.checkAddress(daemon, "test", "Bitcoin", "validateaddress", (error, results) => {
      expect(error).toBe(true);
      expect(results).toBe("The daemon does not own the pool address listed");
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [2]', (done) => {
    mock.mockValidateAddressError();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.checkAddress(daemon, "test", "Bitcoin", "validateaddress", (error, results) => {
      expect(error).toBe(true);
      expect(results).toBe("{\"error\":true}");
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [3]', (done) => {
    mock.mockValidateAddressSecondary();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.checkAddress(daemon, "test", "Bitcoin", "validateaddress", (error, results) => {
      expect(error).toBe(null);
      expect(typeof results).toBe("undefined");
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [4]', (done) => {
    mock.mockGetAddressInfo();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleAddress(daemon, "test", "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      done();
    })
  });

  test('Test address validation functionality [5]', (done) => {
    mock.mockValidateAddressSecondary();
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleAddress(daemon, "test", "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(results).toStrictEqual([]);
      nock.cleanAll();
      done();
    });
  });

  test('Test address validation functionality [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleAddress(daemon, "test", "Bitcoin", (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
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
    poolPayments.handleBalance(daemon, poolConfig, "Bitcoin", (error, results) => {
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
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    poolPayments.handleBalance(daemon, poolConfig, "Bitcoin", (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
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
    poolPayments.handleBalance(daemon, poolConfig, "Bitcoin", (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of orphan shares/times [1]', (done) => {
    const poolPayments = new PoolPayments(logger, client);
    const round = { orphanShares: { 'example': 8 }, orphanTimes: { 'example': 1 }};
    const expected = [
      ['hincrby', 'Bitcoin:rounds:current:shares:counts', 'validShares', 1],
      ['hincrby', 'Bitcoin:rounds:current:shares:values'],
      ['zadd', 'Bitcoin:rounds:current:shares:records'],
      ['hincrbyfloat', 'Bitcoin:rounds:current:times:values', 'example', 1]];
    poolPayments.handleOrphans([], round, "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(4);
      expect(results[0][0]).toStrictEqual(expected[0]);
      expect(results[0][1].slice(0, 2)).toStrictEqual(expected[1]);
      expect(results[0][2].slice(0, 2)).toStrictEqual(expected[2]);
      expect(results[0][3]).toStrictEqual(expected[3]);
      done();
    });
  });

  test('Test handling of orphan shares/times [2]', (done) => {
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.handleOrphans([], {}, "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toStrictEqual([]);
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [1]', (done) => {
    mock.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    poolPayments.handleUnspent(daemon, config, "checks", "Bitcoin", (error, results) => {
      expect(results[0]).toBe(2375000000);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    poolPayments.handleUnspent(daemon, config, "checks", "Bitcoin", (error, results) => {
      expect(error).toBe(true);
      expect(results.length).toBe(0);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [3]', (done) => {
    mock.mockListUnspentEmpty();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    poolPayments.handleUnspent(daemon, config, "checks", "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toBe(0);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [4]', (done) => {
    mock.mockListUnspentInvalid();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    poolPayments.handleUnspent(daemon, config, "checks", "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toBe(0);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test calculation of unspent inputs in daemon [5]', (done) => {
    mock.mockListUnspent();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    poolPayments.handleUnspent(daemon, config, "start", "Bitcoin", (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Payment wallet has a balance of 23.75 BTC'));
      expect(results[0]).toBe(2375000000);
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test handling of duplicate rounds [1]', (done) => {
    mock.mockDuplicateRounds();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const rounds = [
      { hash: "abcd", height: 180, duplicate: true },
      { hash: "abce", height: 180, duplicate: true },
      { hash: "abcf", height: 181, duplicate: false }];
    poolPayments.handleDuplicates(daemon, "Bitcoin", rounds, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(1);
      expect(results[0][0].hash).toBe("abcf");
      expect(results[0][0].duplicate).toBe(false);
      console.log.mockClear();
      nock.cleanAll();
      done();
    })
  });

  test('Test handling of duplicate rounds [2]', (done) => {
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.handleDuplicates(daemon, "Bitcoin", [], (error, results) => {
      expect(error).toBe(true);
      expect(results).toStrictEqual([]);
      done();
    })
  });

  test('Test handling of duplicate rounds [3]', (done) => {
    mock.mockDuplicateBlocks();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const rounds = [
      { hash: "abcd", height: 180, duplicate: true },
      { hash: "abcd", height: 180, duplicate: true },
      { hash: "abcf", height: 181, duplicate: false }];
    poolPayments.handleDuplicates(daemon, "Bitcoin", rounds, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(1);
      expect(results[0][0].hash).toBe("abcf");
      expect(results[0][0].duplicate).toBe(false);
      console.log.mockClear();
      nock.cleanAll();
      done();
    })
  });

  test('Test handling of duplicate rounds [4]', (done) => {
    mock.mockDuplicateBlocks();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const rounds = [
      { hash: "abcd", height: 180, duplicate: true },
      { hash: "abce", height: 181, duplicate: true },
      { hash: "abcf", height: 182, duplicate: false }];
    poolPayments.handleDuplicates(daemon, "Bitcoin", rounds, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].length).toBe(1);
      expect(results[0][0].hash).toBe("abcf");
      expect(results[0][0].duplicate).toBe(false);
      console.log.mockClear();
      nock.cleanAll();
      done();
    })
  });

  test('Test handling of immature blocks [1]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, solo: false, worker: "example" };
    poolPayments.handleImmature(config, round, {}, { "example": 20.15 }, 20.15, {}, { "example": 8 }, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.immature).toBe(1249960000)
      expect(results[0].example.shares.round).toBe(8)
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, solo: false, worker: "example" };
    poolPayments.handleImmature(config, round, {}, { "example": 20.15 }, 20.15, {}, {}, (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toStrictEqual({});
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [3]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, solo: true, worker: "example" };
    poolPayments.handleImmature(config, round, {}, { "example": 20.15 }, 20.15, { "example": 8 }, {}, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.immature).toBe(1249960000)
      expect(results[0].example.shares.round).toBe(8)
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, solo: true, worker: "example" };
    poolPayments.handleImmature(config, round, {}, { "example": 20.15 }, 20.15, {}, {}, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.immature).toBe(1249960000)
      expect(results[0].example.shares.round).toBe(1)
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [5]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, solo: false, worker: "example" };
    poolPayments.handleImmature(config, round, {}, { "example": 8.2 }, 20.15, {}, { "example": 8 }, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.immature).toBe(1249960000)
      expect(results[0].example.shares.round).toBe(3.28)
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, solo: false, worker: "example" };
    poolPayments.handleImmature(config, round, {}, {}, 20.15, {}, { "example": 8 }, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.immature).toBe(1249960000)
      expect(results[0].example.shares.round).toBe(8)
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [1]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, height: 180, solo: false, worker: "example" };
    poolPayments.handleGenerate(config, round, {}, { "example": 20.15 }, 20.15, {}, { "example": 8 }, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.generate).toBe(1249960000);
      expect(results[0].example.records["180"].amounts).toBe(12.4996);
      expect(results[0].example.records["180"].shares).toBe(8);
      expect(results[0].example.records["180"].times).toBe(1);
      expect(results[0].example.shares.round).toBe(8);
      expect(results[0].example.shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [2]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, height: 180, solo: false, worker: "example" };
    poolPayments.handleGenerate(config, round, {}, { "example": 20.15 }, 20.15, {}, {}, (error, results) => {
      expect(error).toBe(null);
      expect(results[0]).toStrictEqual({});
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [3]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, height: 180, solo: true, worker: "example" };
    poolPayments.handleGenerate(config, round, {}, { "example": 20.15 }, 20.15, { "example": 8 }, {}, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.generate).toBe(1249960000);
      expect(results[0].example.records["180"].amounts).toBe(12.4996);
      expect(results[0].example.records["180"].shares).toBe(8);
      expect(results[0].example.records["180"].times).toBe(1);
      expect(results[0].example.shares.round).toBe(8);
      expect(results[0].example.shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, height: 180, solo: true, worker: "example" };
    poolPayments.handleGenerate(config, round, {}, { "example": 20.15 }, 20.15, {}, {}, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.generate).toBe(1249960000);
      expect(results[0].example.records["180"].amounts).toBe(12.4996);
      expect(results[0].example.records["180"].shares).toBe(1);
      expect(results[0].example.records["180"].times).toBe(1);
      expect(results[0].example.shares.round).toBe(1);
      expect(results[0].example.shares.total).toBe(1);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of generate blocks [5]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, height: 180, solo: false, worker: "example" };
    poolPayments.handleGenerate(config, round, {}, { "example": 8.2 }, 20.15, {}, { "example": 8 }, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.generate).toBe(1249960000);
      expect(results[0].example.records["180"].amounts).toBe(12.4996);
      expect(results[0].example.records["180"].shares).toBe(3.28);
      expect(results[0].example.records["180"].times).toBe(0.41);
      expect(results[0].example.shares.round).toBe(3.28);
      expect(results[0].example.shares.total).toBe(3.28);
      console.log.mockClear();
      done();
    });
  });

  test('Test handling of immature blocks [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].payments.processingFee = parseFloat(0.0004);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
    const config = poolPayments.poolConfigs["Bitcoin"];
    const round = { reward: 12.50, height: 180, solo: false, worker: "example" };
    poolPayments.handleGenerate(config, round, {}, {}, 20.15, {}, { "example": 8 }, (error, results) => {
      expect(error).toBe(null);
      expect(results[0].example.generate).toBe(1249960000);
      expect(results[0].example.records["180"].amounts).toBe(12.4996);
      expect(results[0].example.records["180"].shares).toBe(8);
      expect(results[0].example.records["180"].times).toBe(1);
      expect(results[0].example.shares.round).toBe(8);
      expect(results[0].example.shares.total).toBe(8);
      console.log.mockClear();
      done();
    });
  });

  test('Test main block/round handling [1]', (done) => {
    const commands = [
      ['zadd', `Bitcoin:blocks:pending`, 180, mockBuildBlock(180, "hash", 12.5, "txid", 8, "worker", false)],
      ['zadd', `Bitcoin:blocks:pending`, 181, mockBuildBlock(181, "hash", 12.5, "txid", 8, "worker", false)],
      ['zadd', `Bitcoin:blocks:pending`, 182, mockBuildBlock(182, "hash", 12.5, "txid", 8, "worker", false)],
      ['zadd', `Bitcoin:blocks:pending`, 183, mockBuildBlock(183, "hash", 12.5, "txid", 8, "worker", false)]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
      const config = poolPayments.poolConfigs["Bitcoin"];
      poolPayments.handleBlocks(daemon, config, (error, results) => {
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
      ['zadd', `Bitcoin:blocks:pending`, 180, mockBuildBlock(180, "hash", 12.5, "txid", 8, "worker", false)],
      ['zadd', `Bitcoin:blocks:pending`, 180, mockBuildBlock(180, "hash2", 12.5, "txid2", 8, "worker2", false)],
      ['zadd', `Bitcoin:blocks:pending`, 182, mockBuildBlock(182, "hash", 12.5, "txid", 8, "worker", false)],
      ['zadd', `Bitcoin:blocks:pending`, 183, mockBuildBlock(183, "hash", 12.5, "txid", 8, "worker", false)]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {})
      const config = poolPayments.poolConfigs["Bitcoin"];
      poolPayments.handleBlocks(daemon, config, (error, results) => {
        expect(error).toBe(true);
        expect(results).toStrictEqual([]);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main worker handling', (done) => {
    const commands = [
      ['hincrbyfloat', `Bitcoin:payments:unpaid`, 'worker1', 672.21],
      ['hincrbyfloat', `Bitcoin:payments:unpaid`, 'worker2', 391.15]];
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const poolPayments = new PoolPayments(logger, client);
      poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
      const config = poolPayments.poolConfigs["Bitcoin"];
      poolPayments.handleWorkers(config, [[]], (error, results) => {
        expect(error).toBe(null);
        expect(Object.keys(results[1]).length).toBe(2);
        expect(results[1]["worker1"].balance).toBe(67221000000);
        expect(results[1]["worker2"].balance).toBe(39115000000);
        console.log.mockClear();
        done();
      });
    });
  });

  test('Test main transaction handling [1]', (done) => {
    mock.mockGetTransactionsGenerate();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe("generate");
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
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Could not get transactions from daemon'));
      expect(results).toStrictEqual([]);
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [3]', (done) => {
    mock.mockGetTransactionsImmature();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe("immature");
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [4]', (done) => {
    mock.mockGetTransactionsSplit();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe("generate");
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [5]', (done) => {
    mock.mockGetTransactionsOrphan();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.poolConfigs["Bitcoin"].address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe("orphan");
      expect(results[0][0].delete).toBe(true);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [6]', (done) => {
    mock.mockGetTransactionsSingle();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe("generate");
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [7]', (done) => {
    mock.mockGetTransactionsValue();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    poolPayments.poolConfigs["Bitcoin"].payments.magnitude = 100000000;
    poolPayments.poolConfigs["Bitcoin"].payments.minPaymentSatoshis = 500000;
    poolPayments.poolConfigs["Bitcoin"].payments.coinPrecision = 8;
    poolPayments.poolConfigs["Bitcoin"].address = 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd';
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(results[0][0].category).toBe("generate");
      expect(results[0][0].reward).toBe(11.87510021);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [8]', (done) => {
    mock.mockGetTransactionsError1();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Daemon reports invalid transaction'));
      expect(results[0][0].category).toBe("kicked");
      expect(results[0][0].delete).toBe(true);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [9]', (done) => {
    mock.mockGetTransactionsError2();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Daemon reports no details for transaction'));
      expect(results[0][0].category).toBe("kicked");
      expect(results[0][0].delete).toBe(true);
      expect(results[0][0].transaction).toBe('efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c');
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [10]', (done) => {
    mock.mockGetTransactionsError3();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Unable to load transaction'));
      expect(results).toStrictEqual([[], []]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });

  test('Test main transaction handling [11]', (done) => {
    mock.mockGetTransactionsError4();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolPayments = new PoolPayments(logger, client);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], () => {});
    const config = poolPayments.poolConfigs["Bitcoin"];
    const rounds = [{ transaction: 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c' }];
    poolPayments.handleTransactions(daemon, config, [rounds, []], (error, results) => {
      expect(error).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Unable to load pool address details'));
      expect(results).toStrictEqual([[], []]);
      nock.cleanAll();
      console.log.mockClear();
      done();
    });
  });
});
