/*
 *
 * Stratum (Updated)
 *
 */

const Stratum = require('blinkhash-stratum');

////////////////////////////////////////////////////////////////////////////////

// Main Stratum Function
const PoolStratum = function (logger, poolConfig, poolShares) {

  const _this = this;
  this.coin = poolConfig.coin.name;
  this.poolConfig = poolConfig;
  this.poolShares = poolShares;
  this.forkId = process.env.forkId;

  const logSystem = 'Pool';
  const logComponent = _this.coin;
  const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

  // Determine Block Viability
  this.checkBlock = function(shareData, blockValid) {
    const serializedData = JSON.stringify(shareData);
    if (shareData.hash && !blockValid) {
      logger.debug(logSystem, logComponent, logSubCat, `We thought a block was found but it was rejected by the daemon: ${ serializedData }`);
    } else if (blockValid) {
      logger.debug(logSystem, logComponent, logSubCat, `Block found: ${ shareData.hash } by ${ shareData.worker }`);
    }
  };

  // Determine Share Viability
  this.checkShare = function(shareData, shareValid) {
    const serializedData = JSON.stringify(shareData);
    if (!shareValid) {
      logger.debug(logSystem, logComponent, logSubCat, `Share rejected by the daemon: ${ serializedData }`);
    } else {
      logger.debug(logSystem, logComponent, logSubCat, `Share accepted at difficulty ${ shareData.difficulty }/${ shareData.shareDiff } by ${ shareData.worker } [${ shareData.ip }]`);
    }
  };

  // Handle Worker Authentication
  this.authorizeWorker = function(ip, port, workerName, password, callback) {
    _this.checkWorker(workerName, (authorized) => {
      const authString = authorized ? 'Authorized' : 'Unauthorized ';
      logger.debug(logSystem, logComponent, logSubCat, `${ authString } ${ workerName }:${ password } [${ ip }:${ port }]`);
      callback({ error: null, authorized: authorized, disconnect: false });
    });
  };

  // Check for Valid Worker Address
  this.checkWorker = function(workerName, callback) {
    const address = workerName.split('.')[0];
    _this.poolStratum.daemon.cmd('validateaddress', [address], (results) => {
      const isValid = results.filter((result) => {
        return result.response.isvalid;
      }).length > 0;
      callback(isValid);
    });
  };

  // Handle Share Submissions
  /* istanbul ignore next */
  this.handleShares = function(shareData, shareValid, blockValid, callback) {
    _this.poolShares.handleShares(shareData, shareValid, blockValid, () => {
      _this.checkBlock(shareData, blockValid);
      _this.checkShare(shareData, shareValid);
      callback();
    }, () => {});
  };

  // Handle Stratum Events
  this.handleEvents = function(poolStratum) {
    poolStratum.on('banIP', (ip) => {
      _this.poolStratum.stratum.addBannedIP(ip);
    });
    poolStratum.on('log', (severity, text) => {
      logger[severity](logSystem, logComponent, logSubCat, text);
    });
    poolStratum.on('difficultyUpdate', (workerName, diff) => {
      logger.debug(logSystem, logComponent, logSubCat, `Difficulty update to ${ diff } for worker: ${ JSON.stringify(workerName) }`);
    });
    poolStratum.on('share', (shareData, shareValid, blockValid, callback) => {
      _this.handleShares(shareData, shareValid, blockValid, callback);
    });
    return poolStratum;
  };

  // Build Pool from Configuration
  this.setupStratum = function(callback) {
    let poolStratum = Stratum.create(_this.poolConfig, _this.authorizeWorker, callback);
    poolStratum = _this.handleEvents(poolStratum);
    poolStratum.setupPool();
    this.poolStratum = poolStratum;
  };
};

module.exports = PoolStratum;
