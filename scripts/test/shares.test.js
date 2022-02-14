/*
 *
 * Shares (Updated)
 *
 */

const MockDate = require('mockdate');
const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

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

  let poolConfigCopy, configCopy;
  beforeEach((done) => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    client.flushall(() => done());
  });

  test('Test initialization of shares', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    expect(typeof poolShares.poolConfig).toBe('object');
    expect(typeof poolShares.calculateBlocks).toBe('function');
    expect(typeof poolShares.buildSharesCommands).toBe('function');
  });

  test('Test redis client error handling', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.client.emit('error', 'example error');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Redis client had an error'));
    console.log.mockClear();
  });

  test('Test redis client ending handling', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.client.emit('end');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Connection to redis database has been ended'));
    console.log.mockClear();
  });

  test('Test times command handling [1]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { time: 1637877700000, times: 10000 };
    expect(poolShares.handleTimes(lastShare)).toBe(10385.886);
  });

  test('Test times command handling [2]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { time: 1637878084000, times: 10000 };
    expect(poolShares.handleTimes(lastShare)).toBe(10001.886);
  });

  test('Test times command handling [3]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { time: 1637078085886, times: 10000 };
    expect(poolShares.handleTimes(lastShare)).toBe(10000);
  });

  test('Test effort command handling [1]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const shareData = { difficulty: 1 };
    const shares = { 'example': '{"time":1637348736715,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true,"round":"361aae45"}'};
    expect(poolShares.handleEffort(shares, 'test', shareData, 100, false)).toBe(1);
  });

  test('Test effort command handling [2]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const shareData = { difficulty: 50 };
    const shares = { 'example': '{"time":1637348736715,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true,"round":"361aae45"}'};
    expect(poolShares.handleEffort(shares, 'test', shareData, 100, false)).toBe(50);
  });

  test('Test effort command handling [3]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const shareData = { difficulty: 50 };
    const shares = { 'example': '{"time":1637348736715,"work":10,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'};
    expect(poolShares.handleEffort(shares, 'test', shareData, 100, true)).toBe(50);
  });

  test('Test effort command handling [4]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const shareData = { difficulty: 50 };
    const shares = { 'example': '{"time":1637348736715,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true,"round":"361aae45"}'};
    expect(poolShares.handleEffort(shares, 'example', shareData, 100, true)).toBe(51);
  });

  test('Test effort command handling [5]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const shareData = { difficulty: 50 };
    const shares = { 'example': '{"time":1637348736715,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'};
    expect(poolShares.handleEffort(shares, 'test', shareData, 100, false)).toBe(51);
  });

  test('Test effort command handling [5]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const shareData = { difficulty: 50 };
    const shares = { 'example': '{"time":1637348736715,"work":"blah","effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'};
    expect(poolShares.handleEffort(shares, 'test', shareData, 100, false)).toBe(50);
  });

  test('Test types command handling [1]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { types: { valid: 500, invalid: 2, stale: 1 }};
    expect(poolShares.handleTypes(lastShare, 'valid').valid).toBe(501);
  });

  test('Test types command handling [2]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { types: { valid: 500, invalid: 2, stale: 1 }};
    expect(poolShares.handleTypes(lastShare, 'invalid').valid).toBe(500);
  });

  test('Test types command handling [3]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { types: { valid: 500, invalid: 2, stale: 1 }};
    expect(poolShares.handleTypes(lastShare, 'invalid').invalid).toBe(3);
  });

  test('Test types command handling [4]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const lastShare = { types: { valid: 500, invalid: 2, stale: 1 }};
    expect(poolShares.handleTypes(lastShare, 'stale').stale).toBe(2);
  });

  test('Test share command handling [1]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'identifier': 'master',
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 7.277845022124848e-7]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [2]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'identifier': 'master',
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","solo":false,"times":0,"types":{"valid":0,"invalid":1,"stale":0},"work":-1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'invalid', 1]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'invalid', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [3]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example1', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 7.277845022124848e-7],
      ['zadd', 'Pool1:rounds:auxiliary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hincrby', 'Pool1:rounds:auxiliary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:shares', 'example2', '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:counts', 'effort', 28.57142857142857]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [4]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.roundValue = '361aae45';
    const results = [{}, {}, { 'example': '{"time":1637348736715,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true,"round":"361aae45"}'}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3003,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', 1637878085, '{"time":1637878085886,"effort":0.0000014555690044249697,"identifier":"","round":"361aae45","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'example', '{"time":1637878085886,"effort":0.0000014555690044249697,"identifier":"","round":"361aae45","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":2,"worker":"example"}']];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [5]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.roundValue = '361aae45';
    const results = [{ 'example': '{"time":1637878005886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":0.0000014555690044249697,"identifier":"","round":"361aae45","solo":false,"times":80,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":0.0000014555690044249697,"identifier":"","round":"361aae45","solo":false,"times":80,"types":{"valid":1,"invalid":0,"stale":0},"work":2,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 0.0000014555690044249697]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [6]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.roundValue = 'aaaaaaaa';
    poolShares.prevRoundValue = '361aae45';
    const results = [{ 'example': '{"time":1637878085886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","round":"aaaaaaaa","solo":false,"times":0,"types":{"valid":0,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","round":"aaaaaaaa","solo":false,"times":0,"types":{"valid":0,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 0.0000014555690044249697]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [7]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":0,"invalid":0,"stale":1},"work":-1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'stale', 1]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'stale', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [8]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.roundValue = 'aaaaaaaa';
    poolShares.prevRoundValue = '361aae45';
    const results = [{ 'example': '{"time":1637878005886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'identifier': 'master',
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","round":"aaaaaaaa","solo":false,"times":0,"types":{"valid":0,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","round":"aaaaaaaa","solo":false,"times":0,"types":{"valid":0,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 0.0000014555690044249697]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [9]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': '{"time":1637878005886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"361aae45"}'}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example1', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 7.277845022124848e-7],
      ['zadd', 'Pool1:rounds:auxiliary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":57.14285714285714,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hincrby', 'Pool1:rounds:auxiliary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:shares', 'example2', '{"time":1637878085886,"effort":57.14285714285714,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:counts', 'effort', 57.14285714285714]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [10]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example1', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 7.277845022124848e-7],
      ['zadd', 'Pool1:rounds:auxiliary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hincrby', 'Pool1:rounds:auxiliary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:shares', 'example2', '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:counts', 'effort', 28.57142857142857]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [11]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'identifier': 'master',
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"master","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 7.277845022124848e-7]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [12]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, {}, { 'example': '{"time":1637878005886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true,"round":"361aae45"}'}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'example1', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', 1637878085, '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'example2', '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}']];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [13]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'example1', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example1"}'],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', 1637878085, '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}'],
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'example2', '{"time":1637878085886,"effort":28.57142857142857,"identifier":"","solo":true,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example2"}']];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test share command handling [14]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.roundValue = '361aae45';
    const results = [{ 'example': '{"time":1637878005886,"work":15,"effort":7.277845022124848e-7,"worker":"example","solo":false,"round":"orphan"}'}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":0.000011644552035399757,"identifier":"","round":"361aae45","solo":false,"times":80,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":0.000011644552035399757,"identifier":"","round":"361aae45","solo":false,"times":80,"types":{"valid":1,"invalid":0,"stale":0},"work":16,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 0.000011644552035399757]];
    const commands = poolShares.buildSharesCommands(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [1]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:primary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":137403310.58987552,"luck":7.277845022124848e-7,"worker":"example","solo":false}'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1],
      ['rename', 'Pool1:rounds:primary:current:shared:counts', 'Pool1:rounds:primary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:primary:current:shared:shares', 'Pool1:rounds:primary:round-1972211:shares']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [2]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': 'example',
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'transaction': 'example',
    };
    const expected = [['hincrby', 'Pool1:blocks:primary:counts', 'invalid', 1]];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [3]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [4]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [];
    const commands = poolShares.calculateBlocks(results, shareData, 'invalid', false, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [5]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{ 'example1': '{"work":8}', 'example2': '{"work":8}', 'example3': '{"work":8}' }, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 32,
      'blockType': 'primary',
      'difficulty': 4,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '4',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:primary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":32,"luck":87.5,"worker":"example","solo":false}'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1],
      ['rename', 'Pool1:rounds:primary:current:shared:counts', 'Pool1:rounds:primary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:primary:current:shared:shares', 'Pool1:rounds:primary:round-1972211:shares']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [6]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, { 'example': '{"time":1637878085886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true}'}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3003,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:primary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":137403310.58987552,"luck":0.0000014555690044249697,"worker":"example","solo":true}'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:round-1972211:shares', 'example', '{"time":1637878085886,"effort":0.0000014555690044249697,"identifier":"","solo":true,"work":2,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'example', '{"time":1637878085886,"effort":0,"identifier":"","solo":true,"times":0,"types":{"valid":0,"invalid":0,"stale":0},"work":1,"worker":"example"}']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [7]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3003,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:primary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":137403310.58987552,"luck":7.277845022124848e-7,"worker":"example","solo":true}'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:round-1972211:shares', 'example', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":true,"work":1,"worker":"example"}']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [8]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3003,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:primary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":137403310.58987552,"luck":7.277845022124848e-7,"worker":"example","solo":false}'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1],
      ['rename', 'Pool1:rounds:primary:current:shared:counts', 'Pool1:rounds:primary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:primary:current:shared:shares', 'Pool1:rounds:primary:round-1972211:shares']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [9]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', false, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [10]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': '{"time":1637878085886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true}'}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:auxiliary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":3.5,"luck":28.57142857142857,"worker":"example2","solo":false}'],
      ['hincrby', 'Pool1:blocks:auxiliary:counts', 'valid', 1],
      ['rename', 'Pool1:rounds:auxiliary:current:shared:counts', 'Pool1:rounds:auxiliary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:auxiliary:current:shared:shares', 'Pool1:rounds:auxiliary:round-1972211:shares']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [11]', () => {
    MockDate.set(1637878085886);
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockDiffAuxiliary': 3.5,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:auxiliary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":3.5,"luck":28.57142857142857,"worker":"example2","solo":false}'],
      ['hincrby', 'Pool1:blocks:auxiliary:counts', 'valid', 1],
      ['rename', 'Pool1:rounds:auxiliary:current:shared:counts', 'Pool1:rounds:auxiliary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:auxiliary:current:shared:shares', 'Pool1:rounds:auxiliary:round-1972211:shares']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, false);
    expect(commands).toStrictEqual(expected);
  });

  test('Test block command handling [12]', () => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, { 'example': '{"time":1637878085886,"work":1,"effort":7.277845022124848e-7,"worker":"example","solo":true}'}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3003,
      'addrPrimary': null,
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['sadd', 'Pool1:blocks:primary:pending', '{"time":1637878085886,"height":1972211,"hash":null,"reward":10006839,"identifier":"","difficulty":137403310.58987552,"luck":7.277845022124848e-7,"worker":null,"solo":true}'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:round-1972211:shares', null, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":true,"work":1,"worker":null}']];
    const commands = poolShares.calculateBlocks(results, shareData, 'valid', true, true);
    expect(commands).toStrictEqual(expected);
  });

  test('Test command handling and execution', (done) => {
    MockDate.set(1637878085886);
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3002,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', 1637878085, '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hincrby', 'Pool1:rounds:primary:current:shared:counts', 'valid', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'example', '{"time":1637878085886,"effort":7.277845022124848e-7,"identifier":"","solo":false,"times":0,"types":{"valid":1,"invalid":0,"stale":0},"work":1,"worker":"example"}'],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'effort', 7.277845022124848e-7]];
    const commands = poolShares.buildCommands(results, shareData, 'valid', false, () => {
      return done();
    });
    expect(commands).toStrictEqual(expected);
  });
});
