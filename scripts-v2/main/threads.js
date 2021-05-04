/*
 *
 * Threads (Updated)
 *
 */

const cluster = require('cluster');
const PoolBuilder = require('./builder');
const PoolLoader = require('./loader');
const PoolWorkers = require('./workers');

////////////////////////////////////////////////////////////////////////////////

// Main Initializer Function
const PoolThreads = function(logger, client, portalConfig) {

    const _this = this;
    this.client = client;
    this.portalConfig = portalConfig;

    // Start Pool Server
    /* istanbul ignore next */
    this.setupThreads = function() {

        // Handle Master Forks
        if (cluster.isMaster) {
            const poolLoader = new PoolLoader(logger, _this.portalConfig)
            const poolBuilder = new PoolBuilder(logger, _this.portalConfig);
            poolBuilder.pools = poolLoader.buildPoolConfigs();
            poolBuilder.partners = poolLoader.buildPartnerConfigs();
            poolBuilder.setupPoolWorkers();
        }

        // Handle Worker Forks
        if (cluster.isWorker) {
            switch (process.env.workerType) {
            case 'worker':
                new PoolWorkers(logger, _this.client).setupWorkers(() => {});
                break;
            default:
                break;
            }
        }
    };
};

module.exports = PoolThreads;
