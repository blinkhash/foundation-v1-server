/*
 *
 * Loader (Updated)
 *
 */

const PoolLoader = require('../main/loader');
const PoolLogger = require('../main/logger');
const portalConfig = require('../../configs/main/example.js');
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test loader functionality', () => {

    let configCopy;
    beforeEach(() => {
        configCopy = Object.assign({}, portalConfig);
    });

    test('Test initialization of builder', () => {
        const poolLoader = new PoolLoader(logger, configCopy);
        expect(typeof poolLoader.portalConfig).toBe('object');
        expect(typeof poolLoader.validatePartnerConfigs).toBe('function');
        expect(typeof poolLoader.validatePoolPorts).toBe('function');
    });

    test('Test partner configuration validation [1]', () => {
        const poolLoader = new PoolLoader(logger, configCopy);
        const partnerConfig = { subscription: { endDate: '08/01/2021' }};
        const response = poolLoader.validatePartnerConfigs(partnerConfig);
        expect(response).toBe(true);
    });

    test('Test partner configuration validation [2]', () => {
        const poolLoader = new PoolLoader(logger, configCopy);
        const partnerConfig = { subscription: { endDate: '01/01/2021' }};
        const response = poolLoader.validatePartnerConfigs(partnerConfig);
        expect(response).toBe(false);
    });

    test('Test pool configuration validation [1]', () => {
        const poolLoader = new PoolLoader(logger, configCopy);
        const poolConfig = { enabled: true, coin: { algorithm: 'scrypt' }};
        const response = poolLoader.validatePoolConfigs(poolConfig);
        expect(response).toBe(true);
    });

    test('Test pool configuration validation [2]', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const poolLoader = new PoolLoader(logger, configCopy);
        const poolConfig = { enabled: true, coin: { algorithm: 'invalid' }};
        const response = poolLoader.validatePoolConfigs(poolConfig);
        expect(consoleSpy).toHaveBeenCalled();
        expect(response).toBe(false);
        console.log.mockClear();
    });

    test('Test pool configuration validation [3]', () => {
        const poolLoader = new PoolLoader(logger, configCopy);
        const poolConfig = { enabled: false };
        const response = poolLoader.validatePoolConfigs(poolConfig);
        expect(response).toBe(false);
    });

    test('Test pool port validation [1]', () => {
        const poolLoader = new PoolLoader(logger, configCopy);
        const poolConfig = { enabled: true, ports: [{ enabled: true, port: 3001 }]};
        const poolConfigs = { Bitcoin: { enabled: true, ports: [{ enabled: true, port: 3002 }]}};
        const response = poolLoader.validatePoolPorts(poolConfigs, poolConfig);
        expect(response).toBe(true);
    });

    test('Test pool port validation [2]', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const poolLoader = new PoolLoader(logger, configCopy);
        const poolConfig = { enabled: true, ports: [{ enabled: true, port: 3001 }]};
        const poolConfigs = { Bitcoin: { enabled: true, ports: [{ enabled: true, port: 3001 }]}};
        const response = poolLoader.validatePoolPorts(poolConfigs, poolConfig);
        expect(consoleSpy).toHaveBeenCalled();
        expect(response).toBe(false);
        console.log.mockClear();
    });
});
