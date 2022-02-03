/*
 *
 * Workers (Updated)
 *
 */

const PoolShares = require('./shares');
const PoolStatistics = require('./statistics');
const PoolStratum = require('./stratum');

////////////////////////////////////////////////////////////////////////////////

// Main Workers Function
const PoolWorkers = function (logger, client) {

  const _this = this;
  process.setMaxListeners(0);

  this.pools = {};
  this.client = client;
  this.poolConfigs = JSON.parse(process.env.poolConfigs);
  this.portalConfig = JSON.parse(process.env.portalConfig);
  this.forkId = process.env.forkId;

  // Build Promise from Input Configuration
  /* istanbul ignore next */
  this.createPromises = function(configName) {
    return new Promise((resolve, reject) => {
      const poolConfig = _this.poolConfigs[configName];
      const poolShares = new PoolShares(logger, _this.client, poolConfig, _this.portalConfig);
      const poolStatistics = new PoolStatistics(logger, _this.client, poolConfig, _this.portalConfig);
      const poolStratum = new PoolStratum(logger, poolConfig, _this.portalConfig, poolShares, poolStatistics);
      poolStratum.setupStratum((response) => {
        if (response === true) resolve(poolStratum);
        else reject(`Error thrown on pool creation: ${ response }`);
      });
    });
  };

  // Start Worker Capabilities
  this.setupWorkers = function(callback) {
    const poolsKeys = Object.keys(_this.poolConfigs);
    const poolsPromises = poolsKeys.map((configName) => _this.createPromises(configName));
    Promise.all(poolsPromises).then((results) => {
      results.forEach(poolStratum => {
        _this.pools[poolStratum.pool] = poolStratum;
      });
      callback();
    }, callback);
  };
};

module.exports = PoolWorkers;
