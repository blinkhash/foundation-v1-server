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

const auxiliary = {
  'enabled': true,
  'daemons': [{
    'host': '127.0.0.1',
    'port': 8336,
    'username': '',
    'password': ''
  }]
};

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

/* eslint-disable no-unused-vars */
describe('Test stratum functionality', () => {

  let poolConfigCopy, configCopy;
  beforeEach((done) => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    client.flushall(() => done());
  });

  test('Test initialization of stratum', () => {
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    expect(typeof poolStratum.poolConfig).toBe('object');
    expect(typeof poolStratum.checkPrimary).toBe('function');
    expect(typeof poolStratum.authorizeWorker).toBe('function');
  });

  test('Test block viability checker [1]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkPrimary({ hash: 'example', blockType: 'primary', transaction: 'example' }, false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('We thought a primary block was found but it was rejected by the daemon'));
    console.log.mockClear();
  });

  test('Test block viability checker [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkPrimary({ hash: 'example', blockType: 'primary' }, true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Primary block found'));
    console.log.mockClear();
  });

  test('Test block viability checker [3]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkAuxiliary({ hash: 'example', blockType: 'auxiliary' }, false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('We thought an auxiliary block was found but it was rejected by the daemon'));
    console.log.mockClear();
  });

  test('Test block viability checker [4]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkAuxiliary({ hash: 'example', blockType: 'auxiliary' }, true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Auxiliary block found'));
    console.log.mockClear();
  });

  test('Test share viability checker [1]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkShare({}, 'invalid');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('We thought a share was found but it was rejected by the daemon'));
    console.log.mockClear();
  });

  test('Test share viability checker [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkShare({}, 'stale');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('We thought a share was found but it was rejected by the daemon'));
    console.log.mockClear();
  });

  test('Test share viability checker [3]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkShare({}, 'valid');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Share accepted at difficulty'));
    console.log.mockClear();
  });

  test('Test share viability checker [4]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.checkShare({ blockType: 'auxiliary' }, true);
    expect(consoleSpy).not.toHaveBeenCalled();
    console.log.mockClear();
  });

  test('Test stratum pool creation', (done) => {
    mock.mockDaemon();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('p2p has been disabled in the configuration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Stratum pool server started for Pool1'));
      poolStratum.poolStratum.stratum.stopServer();
      console.log.mockClear();
      nock.cleanAll();
      done();
    });
  });

  test('Test worker checking method', (done) => {
    mock.mockDaemon();
    mock.mockValidateAddress();
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.checkPrimaryWorker('tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', (authorized) => {
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
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.authorizeWorker('00.00.00.00', 3001, 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', 'auxiliary', '', (results) => {
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
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.authorizeWorker('00.00.00.00', 3001, 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', 'auxiliary', '', (results) => {
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

  test('Test worker authorization method [3]', (done) => {
    mock.mockDaemon();
    mock.mockAuxiliaryValidateAddressError();
    poolConfigCopy.auxiliary = auxiliary;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.authorizeWorker('00.00.00.00', 3001, 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', 'auxiliary', '', (results) => {
        expect(results.authorized).toBe(false);
        expect(results.disconnect).toBe(false);
        expect(results.error).toBe(null);
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test worker authorization method [3]', (done) => {
    mock.mockDaemon();
    mock.mockAuxiliaryValidateAddressError();
    poolConfigCopy.auxiliary = auxiliary;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
    poolStratum.setupStratum(() => {
      poolStratum.authorizeWorker('00.00.00.00', 3001, 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw', null, '', (results) => {
        expect(results.authorized).toBe(false);
        expect(results.disconnect).toBe(false);
        expect(results.error).toBe(null);
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test worker event handling [1]', (done) => {
    mock.mockDaemon();
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
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
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
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
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
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
    const poolStratum = new PoolStratum(logger, poolConfigCopy, configCopy, poolShares);
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
      poolStratum.handleShares(shareData, 'valid', false, () => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Share accepted at difficulty'));
        poolStratum.poolStratum.stratum.stopServer();
        console.log.mockClear();
        nock.cleanAll();
        done();
      });
    });
  });
});
