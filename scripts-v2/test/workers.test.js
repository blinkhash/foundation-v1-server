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

const poolConfig = {
    'address': 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw',
    'asicBoost': true,
    'banning': {
        'time': 600,
        'invalidPercent': 50,
        'checkThreshold': 5,
        'purgeInterval': 300
    },
    'coin': {
        'name': 'Bitcoin',
        'symbol': 'BTC',
        'algorithm': 'sha256d',
        'hasGetInfo': false,
        'segwit': true,
        'mainnet': {
            'bech32': 'bc',
            'bip32': {
                'public': 0x0488b21e,
                'private': 0x0488ade4,
            },
            'peerMagic': 'f9beb4d9',
            'pubKeyHash': 0x00,
            'scriptHash': 0x05,
            'wif': 0x80,
            'coin': 'btc',
        },
        'testnet': {
            'bech32': 'tb',
            'bip32': {
                'public': 0x043587cf,
                'private': 0x04358394,
            },
            'peerMagic': '0b110907',
            'pubKeyHash': 0x6f,
            'scriptHash': 0xc4,
            'wif': 0xef,
            'coin': 'btc',
        }
    },
    'connectionTimeout': 600,
    'daemons': [{
        'host': '127.0.0.1',
        'port': 8332,
        'user': '',
        'password': ''
    }],
    'jobRebroadcastTimeout': 60,
    'ports': {
        '3001': {
            'enabled': true,
            'initial': 32,
            'difficulty': {
                'minDiff': 8,
                'maxDiff': 512,
                'targetTime': 15,
                'retargetTime': 90,
                'variancePercent': 30
            }
        }
    },
    'p2p': {
        'enabled': false,
        'host': '127.0.0.1',
        'port': 8333,
        'disableTransactions': true
    },
    'recipients': [{
        'address': 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw',
        'percentage': 0.05,
    }],
    'rewards': '',
    'tcpProxyProtocol': false,
};

const portalConfig = utils.readFile('example.json');
process.env.poolConfigs = JSON.stringify({ Bitcoin: poolConfig });
process.env.portalConfig = JSON.stringify(portalConfig);

const client = redis.createClient({
    'port': portalConfig.redis.port,
    'host': portalConfig.redis.host,
});
client._redisMock._maxListeners = 0;

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test workers functionality', () => {

    test('Test worker stratum creation [1]', (done) => {
        mock.mockDaemon();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const poolWorkers = new PoolWorkers(logger, client);
        poolWorkers.setupWorkers(() => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Block template polling has been disabled'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('p2p has been disabled in the configuration'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Stratum pool server started for Bitcoin'));
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
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Failed to connect daemon'));
            console.log.mockClear();
            nock.cleanAll();
            done();
        });
    });
});
