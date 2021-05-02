/*
 *
 * Builder (Updated)
 *
 */

const utils = require('../main/utils');
const redis = require('redis-mock');
const PoolBuilder = require('../main/builder');
const PoolLogger = require('../main/logger');
const PoolFormatter = PoolBuilder.formatter;
const PoolInitializer = PoolBuilder.initializer;

const portalConfig = utils.readFile('example.json');

const client = redis.createClient({
    'port': portalConfig.redis.port,
    'host': portalConfig.redis.host,
});
client._redisMock._maxListeners = 0;

const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test builder functionality', () => {

    test('Test initialization of builder', () => {
        const configCopy = Object.assign({}, portalConfig);
        const poolInitializer = new PoolInitializer(logger, client, configCopy);
        expect(typeof poolInitializer.client).toBe('object');
        expect(typeof poolInitializer.portalConfig).toBe('object');
        expect(typeof poolInitializer.setupClusters).toBe('function');
    });

    test('Test pool configuration formatting [1]', () => {
        const configCopy = Object.assign({}, portalConfig);
        const poolConfig = utils.readFile('configs/example.json');
        const poolFormatter = new PoolFormatter(logger, configCopy);
        const poolConfigFormatted = poolFormatter.formatPoolConfigs([], [], poolConfig);
        expect(typeof poolConfigFormatted.banning).toBe('object');
        expect(poolConfigFormatted.blockRefreshInterval).toBe(1000);
        expect(poolConfigFormatted.enabled).toBe(false);
    });

    test('Test pool configuration formatting [2]', () => {
        const configCopy = Object.assign({}, portalConfig);
        const poolConfig = utils.readFile('configs/example.json');
        delete poolConfig.coin.mainnet;
        const poolFormatter = new PoolFormatter(logger, configCopy);
        const poolConfigFormatted = poolFormatter.formatPoolConfigs([], [], poolConfig);
        expect(poolConfig.coin.mainnet).toBe(undefined);
        expect(typeof poolConfigFormatted.banning).toBe('object');
        expect(poolConfigFormatted.blockRefreshInterval).toBe(1000);
        expect(poolConfigFormatted.enabled).toBe(false);
    });

    test('Test pool configuration formatting [3]', () => {
        const configCopy = Object.assign({}, portalConfig);
        const poolConfig = utils.readFile('configs/example.json');
        delete poolConfig.coin.testnet;
        const poolFormatter = new PoolFormatter(logger, configCopy);
        const poolConfigFormatted = poolFormatter.formatPoolConfigs([], [], poolConfig);
        expect(poolConfig.coin.testnet).toBe(undefined);
        expect(typeof poolConfigFormatted.banning).toBe('object');
        expect(poolConfigFormatted.blockRefreshInterval).toBe(1000);
        expect(poolConfigFormatted.enabled).toBe(false);
    });

    test('Test pool configuration formatting [4]', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const configCopy = Object.assign({}, portalConfig);
        const poolConfig = utils.readFile('configs/example.json');
        const poolFormatter = new PoolFormatter(logger, configCopy);
        poolFormatter.formatPoolConfigs([], ['3001'], poolConfig);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Overlapping configuration on port 3001'));
        console.log.mockClear();
    });
});
