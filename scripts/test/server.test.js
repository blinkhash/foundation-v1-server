/*
 *
 * Server (Updated)
 *
 */

/* eslint-disable-next-line no-unused-vars */
const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const PoolServer = require('../main/server');
const PoolLogger = require('../main/logger');
const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

process.env.partnerConfigs = JSON.stringify({});
process.env.poolConfigs = JSON.stringify({ Pool1: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test server functionality', () => {

  let poolServer;
  beforeAll((done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    poolServer = new PoolServer(logger);
    poolServer.setupServer(() => {
      expect(consoleSpy).toHaveBeenCalled();
      console.log.mockClear();
      done();
    });
  });

  afterAll((done) => {
    poolServer.server.close(() => done());
  });

  test('Test initialization of server', () => {
    expect(typeof poolServer).toBe('object');
    expect(typeof poolServer.server).toBe('object');
    expect(poolServer.server._connections).toBe(0);
  });
});
