/*
 *
 * Workers (Updated)
 *
 */

const PoolShares = require('./shares');
const PoolStratum = require('./stratum');

////////////////////////////////////////////////////////////////////////////////

// Main Workers Function
const PoolWorkers = function (logger, client) {

    const _this = this;
    this.pools = {};
    this.client = client;
    this.poolConfigs = JSON.parse(process.env.poolConfigs);
    this.portalConfig = JSON.parse(process.env.portalConfig);
    this.forkId = process.env.forkId;

    // Build Promise from Input Configuration
    this.createPromises = function(configName) {
        return new Promise((resolve, reject) => {
            const poolConfig = _this.poolConfigs[configName];
            const poolShares = new PoolShares(logger, _this.client, poolConfig, _this.portalConfig);
            const poolStratum = new PoolStratum(logger, poolConfig, poolShares);
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
            console.log(results);
            results.forEach(poolStratum => {
                _this.pools[poolStratum.coin] = poolStratum;
            });
            callback();
        }, callback);
    };
};

module.exports = PoolWorkers;
