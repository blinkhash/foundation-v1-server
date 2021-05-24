/*
 *
 * Payments (Updated)
 *
 */

const nock = require('nock');
const redis = require('redis-mock');
const PoolLogger = require('../main/logger');
const PoolPayments = require('../main/payments');

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
});
