/*
 *
 * Shares (Updated)
 *
 */

const utils = require('../main/utils');
const redis = require('redis-mock');
const PoolLogger = require('../main/logger');
const PoolShares = require('../main/shares');

const poolConfig = {
    "coin": {
        "name": "Bitcoin",
    },
    "logColors": true,
    "logLevel": "debug",
    "ports": {
        "3001": {
            "soloMining": true,
        }
    }
}

const portalConfig = {
    "redis": {
        "host": "127.0.0.1",
        "port": "6379",
    }
}

const logger = new PoolLogger(poolConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test shares functionality', () => {

    let client;
    beforeEach(() => {
        client = redis.createClient({
            "port": portalConfig.redis.port,
            "host": portalConfig.redis.host,
        });
        client._redisMock._maxListeners = 0;
    });

    test('Test timing command handling [1]', () => {
        const dateNow = Date.now();
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [{ 'example': dateNow - 300000 }];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [
            ['hincrbyfloat', 'Bitcoin:rounds:current:times:values', 'example'],
            ['hset', 'Bitcoin:rounds:current:times:last', 'example']]
        const commands = poolShares.buildTimesCommands(results, shareData, false);
        expect(commands.length).toBe(2);
        expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
        expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
        expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
        expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
    });

    test('Test timing command handling [2]', () => {
        const dateNow = Date.now();
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [
            ['hincrbyfloat', 'Bitcoin:rounds:current:times:values', 'example'],
            ['hset', 'Bitcoin:rounds:current:times:last', 'example']]
        const commands = poolShares.buildTimesCommands(results, shareData, false);
        expect(commands.length).toBe(2);
        expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
        expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
        expect(utils.roundTo(commands[0].slice(3)[0])).toBe(0);
        expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000))
    });

    test('Test timing command handling [3]', () => {
        const dateNow = Date.now();
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [{ 'example': dateNow - 1000000 }];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [['hset', 'Bitcoin:rounds:current:times:last', 'example']]
        const commands = poolShares.buildTimesCommands(results, shareData, false);
        expect(commands.length).toBe(1);
        expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
        expect(utils.roundTo(commands[0].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000))
    });

    test('Test timing command handling [4]', () => {
        const dateNow = Date.now();
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [{ 'example': dateNow - 300000 }];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [['hincrbyfloat', 'Bitcoin:rounds:current:times:values', 'example']]
        const commands = poolShares.buildTimesCommands(results, shareData, true);
        expect(commands.length).toBe(1);
        expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
        expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
    });

    test('Test share command handling [1]', () => {
        const dateNow = Date.now();
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [{ 'example': dateNow - 300000 }];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [
            ['hincrbyfloat', 'Bitcoin:rounds:current:times:values', 'example'],
            ['hset', 'Bitcoin:rounds:current:times:last', 'example'],
            ['hincrby', 'Bitcoin:rounds:current:shares:values', 'example', 1],
            ['hincrby', 'Bitcoin:rounds:current:shares:counts', 'validShares', 1],
            ['zadd', 'Bitcoin:rounds:current:shares:records']]
        const commands = poolShares.buildSharesCommands(results, shareData, true, false);
        expect(commands.length).toBe(5);
        expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
        expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
        expect(commands[2]).toStrictEqual(expected[2]);
        expect(commands[3]).toStrictEqual(expected[3]);
        expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
    });

    test('Test share command handling [2]', () => {
        const dateNow = Date.now();
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [{ 'example': dateNow - 300000 }];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [
            ['hincrby', 'Bitcoin:rounds:current:shares:counts', 'invalidShares', 1],
            ['zadd', 'Bitcoin:rounds:current:shares:records']]
        const commands = poolShares.buildSharesCommands(results, shareData, false, true);
        expect(commands.length).toBe(2);
        expect(commands[0]).toStrictEqual(expected[0]);
        expect(commands[1].slice(0, 2)).toStrictEqual(expected[1]);
    });

    test('Test block command handling [1]', () => {
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [
            ['rename', 'Bitcoin:rounds:current:times:last', 'Bitcoin:rounds:round-1972211:times:last'],
            ['rename', 'Bitcoin:rounds:current:times:values', 'Bitcoin:rounds:round-1972211:times:values'],
            ['rename', 'Bitcoin:rounds:current:shares:values', 'Bitcoin:rounds:round-1972211:shares:values'],
            ['sadd', 'Bitcoin:main:blocks:pending'],
            ['hincrby', 'Bitcoin:main:blocks:counts', 'validBlocks', 1]]
        const commands = poolShares.buildBlocksCommands(shareData, true, true);
        expect(commands.length).toBe(5);
        expect(commands[0]).toStrictEqual(expected[0]);
        expect(commands[1]).toStrictEqual(expected[1]);
        expect(commands[2]).toStrictEqual(expected[2]);
        expect(commands[3].slice(0, 2)).toStrictEqual(expected[3]);
        expect(commands[4]).toStrictEqual(expected[4]);
    });

    test('Test block command handling [2]', () => {
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": 'example',
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [['hincrby', 'Bitcoin:main:blocks:counts', 'invalidBlocks', 1]]
        const commands = poolShares.buildBlocksCommands(shareData, true, false);
        expect(commands.length).toBe(1);
        expect(commands[0]).toStrictEqual(expected[0]);
    });

    test('Test block command handling [3]', () => {
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [['hincrby', 'Bitcoin:main:blocks:counts', 'invalidBlocks', 1]]
        const commands = poolShares.buildBlocksCommands(shareData, true, false);
        expect(commands.length).toBe(0);
    });

    test('Test command handling and execution', (done) => {
        const dateNow = Date.now();
        const callback = () => done()
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const results = [{ 'example': dateNow - 300000 }];
        const shareData = {
            "job": '4',
            "ip": '::1',
            "port": 3001,
            "blockDiff": 137403310.58987552,
            "blockDiffActual": 137403310.58987552,
            "difficulty": 1,
            "hash": null,
            "hashInvalid": null,
            "height": 1972211,
            "reward": 10006839,
            "shareDiff": '2.35170820',
            "worker": 'example'
        }
        const expected = [
            ['hincrbyfloat', 'Bitcoin:rounds:current:times:values', 'example'],
            ['hset', 'Bitcoin:rounds:current:times:last', 'example'],
            ['hincrby', 'Bitcoin:rounds:current:shares:values', 'example', 1],
            ['hincrby', 'Bitcoin:rounds:current:shares:counts', 'validShares', 1],
            ['zadd', 'Bitcoin:rounds:current:shares:records']]
        const commands = poolShares.buildCommands(results, shareData, true, false, callback);
        expect(commands.length).toBe(5);
        expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
        expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
        expect(commands[2]).toStrictEqual(expected[2]);
        expect(commands[3]).toStrictEqual(expected[3]);
        expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
    });

    test('Test command execution', (done) => {
        const callback = function() {
            done();
        }
        const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);
        const commands = [['rename', 'Bitcoin:example1', 'Bitcoin:example2']];
        poolShares.executeCommands(commands, () => {}, callback);
    });
});
