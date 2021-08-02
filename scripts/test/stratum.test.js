/*
 *
 * Stratum (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const mock = require('./daemon.mock.js');
const nock = require('nock');

const PoolLogger = require('../main/logger');
const PoolShares = require('../main/shares');
const PoolStratum = require('../main/stratum');

const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

poolConfig.primary.address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.primary.recipients[0].address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.p2p.enabled = false;

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

const logger = new PoolLogger(portalConfig);
const poolShares = new PoolShares(logger, client, poolConfig, portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test stratum functionality', () => {

  let configCopy;
  beforeEach((done) => {
    configCopy = JSON.parse(JSON.stringify(poolConfig));
    client.flushall(() => done());
  });

  test('Test initialization of stratum', () => {
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    expect(typeof poolStratum.poolConfig).toBe('object');
    expect(typeof poolStratum.checkBlock).toBe('function');
    expect(typeof poolStratum.authorizeWorker).toBe('function');
  });

  test('Test block viability checker [1]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.checkBlock({ hash: 'example' }, false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('We thought a block was found but it was rejected by the daemon'));
    console.log.mockClear();
  });

  test('Test block viability checker [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.checkBlock({ hash: 'example' }, true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Block found'));
    console.log.mockClear();
  });

  test('Test share viability checker [1]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.checkShare({}, false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('We thought a share was found but it was rejected by the daemon'));
    console.log.mockClear();
  });

  test('Test share viability checker [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.checkShare({}, true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Share accepted at difficulty'));
    console.log.mockClear();
  });

  test('Test stratum pool creation', (done) => {
    mock.mockDaemon();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('p2p has been disabled in the configuration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Stratum pool server started for Bitcoin'));
      poolStratum.poolStratum.stratum.stopServer();
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test worker checking method', (done) => {
    mock.mockDaemon();
    mock.mockValidateAddress();
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.checkWorker('tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', (authorized) => {
        expect(authorized).toBe(true);
        poolStratum.poolStratum.stratum.stopServer();
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test worker authorization method [1]', (done) => {
    mock.mockDaemon();
    mock.mockValidateAddress();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.authorizeWorker('00.00.00.00', 3001, 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', '', (results) => {
        expect(results.authorized).toBe(true);
        expect(results.disconnect).toBe(false);
        expect(results.error).toBe(null);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Authorized'));
        poolStratum.poolStratum.stratum.stopServer();
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test worker authorization method [2]', (done) => {
    mock.mockDaemon();
    mock.mockValidateAddressInvalid();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.authorizeWorker('00.00.00.00', 3001, 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', '', (results) => {
        expect(results.authorized).toBe(false);
        expect(results.disconnect).toBe(false);
        expect(results.error).toBe(null);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Unauthorized'));
        poolStratum.poolStratum.stratum.stopServer();
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test worker event handling [1]', (done) => {
    mock.mockDaemon();
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.poolStratum.on('banIP', () => {
        const bannedIPs = poolStratum.poolStratum.stratum.bannedIPs;
        expect(Object.keys(bannedIPs).length).toBe(1);
        expect(Object.keys(bannedIPs)[0]).toBe('00.00.00.00');
        poolStratum.poolStratum.stratum.stopServer();
        nock.cleanAll();
        done();
      });
      poolStratum.poolStratum.emit('banIP', '00.00.00.00');
    });
  });

  test('Test worker event handling [2]', (done) => {
    mock.mockDaemon();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.poolStratum.on('difficultyUpdate', () => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Difficulty update to'));
        poolStratum.poolStratum.stratum.stopServer();
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
      poolStratum.poolStratum.emit('difficultyUpdate', 'worker', 8);
    });
  });

  test('Test worker event handling [3]', (done) => {
    mock.mockDaemon();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    poolStratum.setupStratum(() => {
      poolStratum.poolStratum.emit('share', shareData, true, false, () => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Share accepted at difficulty'));
        poolStratum.poolStratum.stratum.stopServer();
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test worker share handling method', (done) => {
    mock.mockDaemon();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, configCopy, poolShares);
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'blockDiff': 137403310.58987552,
      'blockDiffActual': 137403310.58987552,
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'worker': 'example'
    };
    poolStratum.setupStratum(() => {
      poolStratum.handleShares(shareData, true, false, () => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Share accepted at difficulty'));
        poolStratum.poolStratum.stratum.stopServer();
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });
});
