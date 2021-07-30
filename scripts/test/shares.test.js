/*
 *
 * Shares (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const utils = require('../main/utils');
const PoolLogger = require('../main/logger');
const PoolShares = require('../main/shares');
const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

poolConfig.primary.address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.primary.recipients[0].address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test shares functionality', () => {

  let configCopy;
  beforeEach((done) => {
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    client.flushall(() => done());
  });

  test('Test initialization of shares', () => {
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    expect(typeof poolShares.poolConfig).toBe('object');
    expect(typeof poolShares.buildBlocksCommands).toBe('function');
    expect(typeof poolShares.buildSharesCommands).toBe('function');
  });

  test('Test redis client error handling', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    poolShares.client.emit('error', 'example error');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Redis client had an error'));
    console.log.mockClear();
  });

  test('Test redis client ending handling', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    poolShares.client.emit('end');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Connection to redis database has been ended'));
    console.log.mockClear();
  });

  test('Test timing command handling [1]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [{ 'example': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'example'],
      ['hset', 'Bitcoin:rounds:current:submissions', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, false);
    expect(commands.length).toBe(2);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
    expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test timing command handling [2]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'example'],
      ['hset', 'Bitcoin:rounds:current:submissions', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, false);
    expect(commands.length).toBe(2);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(0);
    expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test timing command handling [3]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [{ 'example': dateNow - 1000000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [['hset', 'Bitcoin:rounds:current:submissions', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, false);
    expect(commands.length).toBe(1);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(utils.roundTo(commands[0].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test timing command handling [4]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [{ 'example': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [['hincrbyfloat', 'Bitcoin:rounds:current:times', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, true);
    expect(commands.length).toBe(1);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
  });

  test('Test share command handling [1]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [{ 'example': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'example'],
      ['hset', 'Bitcoin:rounds:current:submissions', 'example'],
      ['hincrby', 'Bitcoin:rounds:current:counts', 'valid', 1],
      ['zadd', 'Bitcoin:rounds:current:hashrate'],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares']];
    const commands = poolShares.buildSharesCommands(results, shareData, true, false);
    expect(commands.length).toBe(5);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(commands[2]).toStrictEqual(expected[2]);
    expect(commands[3].slice(0, 2)).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
  });

  test('Test share command handling [2]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [{ 'example': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [
      ['hincrby', 'Bitcoin:rounds:current:counts', 'invalid', 1],
      ['zadd', 'Bitcoin:rounds:current:hashrate']];
    const commands = poolShares.buildSharesCommands(results, shareData, false, true);
    expect(commands.length).toBe(2);
    expect(commands[0]).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 2)).toStrictEqual(expected[1]);
  });

  test('Test block command handling [1]', () => {
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [
      ['del', 'Bitcoin:rounds:current:submissions'],
      ['rename', 'Bitcoin:rounds:current:counts', 'Bitcoin:rounds:round-1972211:counts'],
      ['rename', 'Bitcoin:rounds:current:shares', 'Bitcoin:rounds:round-1972211:shares'],
      ['rename', 'Bitcoin:rounds:current:times', 'Bitcoin:rounds:round-1972211:times'],
      ['sadd', 'Bitcoin:blocks:pending'],
      ['hincrby', 'Bitcoin:blocks:counts', 'valid', 1]];
    const commands = poolShares.buildBlocksCommands(shareData, true, true);
    expect(commands.length).toBe(6);
    expect(commands[0]).toStrictEqual(expected[0]);
    expect(commands[1]).toStrictEqual(expected[1]);
    expect(commands[2]).toStrictEqual(expected[2]);
    expect(commands[3]).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
    expect(commands[5]).toStrictEqual(expected[5]);
  });

  test('Test block command handling [2]', () => {
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': 'example',
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [['hincrby', 'Bitcoin:blocks:counts', 'invalid', 1]];
    const commands = poolShares.buildBlocksCommands(shareData, true, false);
    expect(commands.length).toBe(1);
    expect(commands[0]).toStrictEqual(expected[0]);
  });

  test('Test block command handling [3]', () => {
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const commands = poolShares.buildBlocksCommands(shareData, true, false);
    expect(commands.length).toBe(0);
  });

  test('Test block command handling [4]', () => {
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const commands = poolShares.buildBlocksCommands(shareData, false, false);
    expect(commands.length).toBe(0);
  });

  test('Test command handling and execution', (done) => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const results = [{ 'example': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    const expected = [
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'example'],
      ['hset', 'Bitcoin:rounds:current:submissions', 'example'],
      ['hincrby', 'Bitcoin:rounds:current:counts', 'valid', 1],
      ['zadd', 'Bitcoin:rounds:current:hashrate'],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares']];
    const commands = poolShares.buildCommands(results, shareData, true, false, () => {
      return done();
    });
    expect(commands.length).toBe(5);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(commands[2]).toStrictEqual(expected[2]);
    expect(commands[3].slice(0, 2)).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
  });

  test('Test command execution w/ errors', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const commands = [['rename', 'Bitcoin:example1', 'Bitcoin:example2']];
    poolShares.executeCommands(commands, () => {}, () => {
      expect(consoleSpy).toHaveBeenCalled();
      console.log.mockClear();
      done();
    });
  });

  test('Test command execution on shares handler start', (done) => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfig, configCopy);
    const commands = [['hset', 'Bitcoin:rounds:current:submissions', 'example', dateNow - 300000]];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    /* eslint-disable-next-line no-unused-vars */
    poolShares.client.multi(commands).exec((error, results) => {
      if (!error) {
        poolShares.handleShares(shareData, true, false, (results) => {
          expect(results[1]).toBe(0);
          expect(results[2]).toBe(1);
          expect(results[3]).toBe(1);
          expect(results[4]).toBe('1');
          done();
        }, () => {});
      } else {
        // Indicates Error thrown in Redis Client
        expect(true).toBe(false);
        done();
      }
    });
  });
});
