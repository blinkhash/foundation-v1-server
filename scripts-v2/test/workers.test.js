/*
 *
 * Workers (Updated)
 *
 */

const redis = require('redis-mock');
const mock = require('./stratum.mock.js');
const nock = require('nock');
const utils = require('../main/utils');

const PoolLogger = require('../main/logger');
const PoolWorkers = require('../main/workers');

const poolConfig = utils.readFile("configs/example.json");
const portalConfig = utils.readFile("example.json");

poolConfig.address = "tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw";
poolConfig.recipients[0].address = "tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw";
poolConfig.p2p.enabled = false;
process.env.poolConfigs = JSON.stringify({ Bitcoin: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);

const client = redis.createClient({
    "port": portalConfig.redis.port,
    "host": portalConfig.redis.host,
});
client._redisMock._maxListeners = 0;

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

const logger = new PoolLogger(poolConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test workers functionality', () => {

    test('Test worker stratum creation [1]', (done) => {
        mock.mockDaemon();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const poolWorkers = new PoolWorkers(logger, client);
        poolWorkers.setupWorkers(() => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching("Block template polling has been disabled"));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching("p2p has been disabled in the configuration"));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching("Stratum pool server started for Bitcoin"));
            const poolStratum = poolWorkers.pools.Bitcoin;
            poolStratum.poolStratum.stratum.stopServer();
            console.log.mockClear();
            nock.cleanAll();
            done();
        });
    });

    test('Test worker stratum creation [2]', (done) => {
        mock.mockGetInitialBatch();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const poolWorkers = new PoolWorkers(logger, client);
        poolWorkers.setupWorkers(() => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching("Failed to connect daemon"));
            console.log.mockClear();
            nock.cleanAll();
            done();
        });
    });
});
