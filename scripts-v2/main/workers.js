/*
 *
 * PoolWorkers (Updated)
 *
 */

const PoolShares = require('./shares');
const PoolStratum = require('./stratum');

// Pool Workers Main Function
const PoolWorkers = function (logger, client) {

    const _this = this;
    this.pools = {};
    this.client = client;
    this.poolConfigs = JSON.parse(process.env.poolConfigs);
    this.portalConfig = JSON.parse(process.env.portalConfig);
    this.forkId = process.env.forkId;

    // Handle Worker Messaging
    this.handleMessaging = function() {
        process.on('message', (message) => {
            switch (message.type) {
                case 'banIP':
                    _this.pools.forEach(pool => {
                        if (_this.pools[pool].stratum) {
                            _this.pools[pool].stratum.addBannedIP(message.ip);
                        }
                    });
                    break;
                default:
                    break;
            }
        });
    }

    // Start Worker Capabilities
    this.start = function() {
        _this.handleMessaging();
        Object.keys(_this.poolConfigs).forEach((config) => {
            const poolConfig = _this.poolConfigs[config];
            const poolShares = new PoolShares(logger, client, poolConfig, _this.portalConfig);
            const poolStratum = new PoolStratum(logger, poolConfig, poolShares)
            poolStratum.start();
            _this.pools[config] = poolStratum;
        });
    }
};

module.exports = PoolWorkers;
