/*
 *
 * Logger (Updated)
 *
 */

/* eslint-disable-next-line no-unused-vars */
const colors = require('colors');
const PoolLogger = require('../main/logger');
const portalConfig = require('../../configs/main/example.js');

const logSystem = 'Test';
const logComponent = 'Test';
const logSubCat = 'Thread 1';

////////////////////////////////////////////////////////////////////////////////

describe('Test logger functionality', () => {

  let configCopy;
  beforeEach(() => {
    configCopy = JSON.parse(JSON.stringify(portalConfig));
  });

  test('Test initialization of logger', () => {
    const logger = new PoolLogger(configCopy);
    expect(typeof logger).toBe('object');
    expect(typeof logger.logText).toBe('function');
    expect(logger.logLevel).toBe(1);
  });

  test('Test logger events [1]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new PoolLogger(configCopy);
    logger.debug(logSystem, logComponent, logSubCat, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new PoolLogger(configCopy);
    logger.warning(logSystem, logComponent, logSubCat, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [3]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new PoolLogger(configCopy);
    logger.error(logSystem, logComponent, logSubCat, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [4]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new PoolLogger(configCopy);
    logger.special(logSystem, logComponent, logSubCat, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [5]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    configCopy.logger.logColors = false;
    const logger = new PoolLogger(configCopy);
    logger.debug(logSystem, logComponent, logSubCat, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [6]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    configCopy.logger.logLevel = 'error';
    const logger = new PoolLogger(configCopy);
    logger.debug(logSystem, logComponent, logSubCat, 'Example Text');
    expect(consoleSpy).not.toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [7]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new PoolLogger(configCopy);
    logger.debug(logSystem, logComponent, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test logger events [8]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    configCopy.logger.logColors = false;
    const logger = new PoolLogger(configCopy);
    logger.debug(logSystem, logComponent, 'Example Text');
    expect(consoleSpy).toHaveBeenCalled();
    console.log.mockClear();
  });
});
