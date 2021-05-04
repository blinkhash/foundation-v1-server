/*
 *
 * Builder (Updated)
 *
 */

const cluster = require('cluster');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Builder Function
const PoolBuilder = function(logger, portalConfig) {

    const _this = this;
    this.portalConfig = portalConfig;

    // Handle Pool Worker Creation
    /* istanbul ignore next */
    this.createPoolWorker = function(poolWorkers, forkId) {

        // Build Worker from Data
        const worker = cluster.fork({
            workerType: 'worker',
            poolConfigs: JSON.stringify(_this.pools),
            portalConfig: JSON.stringify(_this.portalConfig),
            forkId: forkId,
        });

        worker.forkId = forkId;
        worker.type = 'worker';
        poolWorkers[forkId] = worker;

        // Handle Worker Events
        worker.on('message', (msg) => {
            switch (msg.type) {
            case 'banIP':
                Object.keys(cluster.workers).forEach(id => {
                    if (cluster.workers[id].type === 'worker') {
                        cluster.workers[id].send({ type: 'banIP', ip: msg.ip });
                    }
                });
                break;
            default:
                break;
            }
        });

        worker.on('exit', () => {
            logger.error('Builder', 'Workers', `Fork ${ forkId } died, starting replacement worker...`);
            setTimeout(() => {
                _this.createPoolWorker(forkId);
            }, 2000);
        });
    };

    // Functionality for Pool Workers
    /* istanbul ignore next */
    this.setupPoolWorkers = function() {

        const poolWorkers = {};
        let numWorkers = 0;

        // Check if No Configurations Exist
        if (Object.keys(_this.pools).length === 0) {
            logger.warning('Builder', 'Workers', 'No pool configs exists or are enabled in configs folder. No pools started.');
            return;
        }

        // Check if Daemons Configured
        Object.keys(_this.pools).forEach(config => {
            const pool = _this.pools[config];
            if (!Array.isArray(pool.daemons) || pool.daemons.length < 1) {
                logger.error('Builder', config, 'No daemons configured so a pool cannot be started for this coin.');
                delete _this.pools[config];
            }
        });

        // Create Pool Workers
        const numForks = utils.countProcessForks(_this.portalConfig);
        const startInterval = setInterval(() => {
            _this.createPoolWorker(poolWorkers, numWorkers);
            numWorkers += 1;
            if (numWorkers === numForks) {
                clearInterval(startInterval);
                logger.debug('Builder', 'Workers', `Started ${ Object.keys(_this.pools).length } pool(s) on ${ numForks } thread(s)`);
            }
        }, 250);
    };
};

module.exports = PoolBuilder;
