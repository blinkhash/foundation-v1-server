/*
 *
 * Server (Updated)
 *
 */

/* eslint-disable-next-line no-unused-vars */
const redis = require('redis-mock');
const events = require('events');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const PoolApi = require('../main/api');
const PoolServer = require('../main/server');
const PoolLogger = require('../main/logger');
const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

process.env.poolConfigs = JSON.stringify({ Pool1: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

function mockResponse() {
  const response = new events.EventEmitter();
  response.writeHead = (code, headers) => {
    response.emit('header', [code, headers]);
  };
  response.end = (payload) => response.emit('end', payload);
  return response;
}

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

  test('Test handleErrors functionality [1]', () => {
    const mainApi = new PoolApi();
    const response = mockResponse();
    response.on('end', (payload) => {
      const expected = '{"version":"0.0.3","statusCode":500,"headers":{"Access-Control-Allow-Headers":"Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Allow-Methods","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET","Content-Type":"application/json"},"body":"The server was unable to handle your request. Verify your input or try again later"}';
      expect(payload).toBe(expected);
    });
    poolServer.handleErrors(mainApi, 'test', response);
  });
});
