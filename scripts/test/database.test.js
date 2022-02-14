/*
 *
 * Logger (Updated)
 *
 */

/* eslint-disable-next-line no-unused-vars */
const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const PoolDatabase = require('../main/database');
const portalConfig = require('../../configs/main/example.js');

////////////////////////////////////////////////////////////////////////////////

describe('Test database functionality', () => {

  let configCopy;
  beforeEach(() => {
    configCopy = JSON.parse(JSON.stringify(portalConfig));
  });

  test('Test initialization of database', () => {
    const database = new PoolDatabase(configCopy);
    expect(typeof database).toBe('object');
    expect(typeof database.buildRedisClient).toBe('function');
    expect(typeof database.checkRedisClient).toBe('function');
  });

  test('Test database events [1]', () => {
    const database = new PoolDatabase(configCopy);
    const client = database.buildRedisClient();
    expect(typeof client).toBe('object');
    expect(typeof client.options).toBe('object');
    expect(client.connected).toBe(false);
  });

  test('Test database events [2]', () => {
    configCopy.redis.password = 'example';
    const database = new PoolDatabase(configCopy);
    const client = database.buildRedisClient();
    expect(typeof client).toBe('object');
    expect(typeof client.options).toBe('object');
    expect(client.connected).toBe(false);
  });

  test('Test database events [3]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const database = new PoolDatabase(configCopy);
    const client = database.buildRedisClient();
    client.info = (callback) => callback(null, 'redis_version:9.0.0');
    database.checkRedisClient(client);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('Test database events [4]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const database = new PoolDatabase(configCopy);
    const client = database.buildRedisClient();
    client.info = (callback) => callback(null, 'redis_version:1.0.0');
    database.checkRedisClient(client);
    expect(consoleSpy).toHaveBeenCalledWith('Could not detect redis version or your redis client is out of date');
  });

  test('Test database events [5]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const database = new PoolDatabase(configCopy);
    const client = database.buildRedisClient();
    client.info = (callback) => callback(null, 'example:9.0.0');
    database.checkRedisClient(client);
    expect(consoleSpy).toHaveBeenCalledWith('Could not detect redis version or your redis client is out of date');
  });

  test('Test database events [6]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const database = new PoolDatabase(configCopy);
    const client = database.buildRedisClient();
    client.info = (callback) => callback(true, 'redis_version:9.0.0');
    database.checkRedisClient(client);
    expect(consoleSpy).toHaveBeenCalledWith('Redis version check failed');
  });
});
