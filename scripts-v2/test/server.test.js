/*
 *
 * Server (Updated)
 *
 */

const utils = require('../main/utils');
const PoolServer = require('../main/server');
const PoolLogger = require('../main/logger');

const poolConfig = utils.readFile('configs/example.json');
const portalConfig = utils.readFile('example.json');

process.env.partnerConfigs = JSON.stringify({});
process.env.poolConfigs = JSON.stringify({ Bitcoin: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);
const logger = new PoolLogger(portalConfig);

// Mock Redis w/ Redis-Mock Functionality
jest.mock('redis', () => require('redis-mock'));

////////////////////////////////////////////////////////////////////////////////

describe('Test server functionality', () => {

    let poolServer;
    beforeAll((done) => {
        poolServer = new PoolServer(logger);
        poolServer.setupServer(() => done());
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
