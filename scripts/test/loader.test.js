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
    configCopy = JSON.parse(JSON.stringify(portalConfig));
  });

  test('Test initialization of builder', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    expect(typeof poolLoader.portalConfig).toBe('object');
    expect(typeof poolLoader.validatePoolPorts).toBe('function');
  });

  test('Test pool configuration validation [1]', () => {
    const algorithms = { mining: 'scrypt', block: 'sha256d', coinbase: 'sha256d' };
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, statistics: {}, primary: { coin: { algorithms: algorithms }, payments: {}}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(response).toBe(true);
  });

  test('Test pool configuration validation [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const algorithms = { mining: 'invalid', block: 'sha256d', coinbase: 'sha256d' };
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, primary: { coin: { algorithms: algorithms }, payments: {}}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(consoleSpy).toHaveBeenCalled();
    expect(response).toBe(false);
    console.log.mockClear();
  });

  test('Test pool configuration validation [3]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const algorithms = { mining: 'scrypt', block: 'invalid', coinbase: 'sha256d' };
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, primary: { coin: { algorithms: algorithms }, payments: {}}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(consoleSpy).toHaveBeenCalled();
    expect(response).toBe(false);
    console.log.mockClear();
  });

  test('Test pool configuration validation [4]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const algorithms = { mining: 'scrypt', block: 'sha256d', coinbase: 'invalid' };
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, primary: { coin: { algorithms: algorithms }, payments: {}}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(consoleSpy).toHaveBeenCalled();
    expect(response).toBe(false);
    console.log.mockClear();
  });

  test('Test pool configuration validation [5]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const algorithms = { mining: 'scrypt', block: 'sha256d', coinbase: 'sha256d' };
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, statistics: {}, primary: { coin: { algorithms: algorithms }, payments: {}, recipients: [{ percentage: 1 }]}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(consoleSpy).toHaveBeenCalled();
    expect(response).toBe(false);
    console.log.mockClear();
  });

  test('Test pool configuration validation [6]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: false, name: 'Litecoin', primary: { coin: { name: 'Litecoin' }, payments: {}}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(response).toBe(false);
  });

  test('Test pool configuration validation [7]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const algorithms = { mining: 'scrypt', block: 'sha256d', coinbase: 'sha256d' };
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, statistics: { historicalInterval: 300 }, primary: { coin: { algorithms: algorithms }, payments: {}}};
    const response = poolLoader.validatePoolConfigs(poolConfig);
    expect(consoleSpy).toHaveBeenCalled();
    expect(response).toBe(false);
    console.log.mockClear();
  });

  test('Test pool recipient validation [1]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Litecoin', primary: {}};
    const response = poolLoader.validatePoolRecipients(poolConfig);
    expect(response).toBe(true);
  });

  test('Test pool recipient validation [2]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Litecoin', primary: { recipients: [{ percentage: 1 }]}};
    const response = poolLoader.validatePoolRecipients(poolConfig);
    expect(response).toBe(false);
  });

  test('Test pool recipient validation [3]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Litecoin', primary: { recipients: [{ percentage: 0.4 }]}};
    const response = poolLoader.validatePoolRecipients(poolConfig);
    expect(response).toBe(true);
  });

  test('Test pool recipient validation [4]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Litecoin', primary: { recipients: [{ percentage: 0.05 }]}};
    const response = poolLoader.validatePoolRecipients(poolConfig);
    expect(response).toBe(true);
  });

  test('Test pool name validation [1]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Litecoin', primary: { coin: { name: 'Litecoin' }}};
    const poolConfigs = { Pool1: { enabled: true, name: 'Bitcoin', primary: { coin: { name: 'Bitcoin' }}}};
    const response = poolLoader.validatePoolNames(poolConfigs, poolConfig);
    expect(response).toBe(true);
  });

  test('Test pool name validation [2]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Pool1' };
    const poolConfigs = { Pool1: { enabled: true, name: 'Bitcoin', primary: { coin: { name: 'Bitcoin' }}}};
    const response = poolLoader.validatePoolNames(poolConfigs, poolConfig);
    expect(response).toBe(false);
  });

  test('Test pool name validation [3]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, name: 'Pool1 Pool2' };
    const poolConfigs = { Pool1: { enabled: true, name: 'Bitcoin', primary: { coin: { name: 'Bitcoin' }}}};
    const response = poolLoader.validatePoolNames(poolConfigs, poolConfig);
    expect(response).toBe(false);
  });

  test('Test pool name validation [4]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true };
    const poolConfigs = { Pool1: { enabled: true, name: 'Bitcoin', primary: { coin: { name: 'Bitcoin' }}}};
    const response = poolLoader.validatePoolNames(poolConfigs, poolConfig);
    expect(response).toBe(false);
  });

  test('Test pool port validation [1]', () => {
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, ports: [{ enabled: true, port: 3005 }]};
    const poolConfigs = { Pool1: { enabled: true, ports: [{ enabled: true, port: 3006 }]}};
    const response = poolLoader.validatePoolPorts(poolConfigs, poolConfig);
    expect(response).toBe(true);
  });

  test('Test pool port validation [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, ports: [{ enabled: true, port: 3005 }]};
    const poolConfigs = { Pool1: { enabled: true, ports: [{ enabled: true, port: 3005 }]}};
    const response = poolLoader.validatePoolPorts(poolConfigs, poolConfig);
    expect(consoleSpy).toHaveBeenCalled();
    expect(response).toBe(false);
    console.log.mockClear();
  });

  test('Test pool port validation [3]', () => {
    configCopy.server.port = 3005;
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, ports: [{ enabled: true, port: 3005 }]};
    const poolConfigs = { Pool1: { enabled: true, ports: [{ enabled: true, port: 3006 }]}};
    const response = poolLoader.validatePoolPorts(poolConfigs, poolConfig);
    expect(response).toBe(false);
  });

  test('Test pool port validation [4]', () => {
    configCopy.redis.port = 3005;
    const poolLoader = new PoolLoader(logger, configCopy);
    const poolConfig = { enabled: true, ports: [{ enabled: true, port: 3005 }]};
    const poolConfigs = { Pool1: { enabled: true, ports: [{ enabled: true, port: 3006 }]}};
    const response = poolLoader.validatePoolPorts(poolConfigs, poolConfig);
    expect(response).toBe(false);
  });
});
