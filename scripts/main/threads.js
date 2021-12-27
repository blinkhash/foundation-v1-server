/*
 *
 * Threads (Updated)
 *
 */

const cluster = require('cluster');
const PoolBuilder = require('./builder');
const PoolLoader = require('./loader');
const PoolPayments = require('./payments');
const PoolServer = require('./server');
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
      const poolLoader = new PoolLoader(logger, _this.portalConfig);
      const poolBuilder = new PoolBuilder(logger, _this.portalConfig);
      poolBuilder.poolConfigs = poolLoader.buildPoolConfigs();
      poolBuilder.setupPoolPayments();
      poolBuilder.setupPoolServer();
      poolBuilder.setupPoolWorkers();
    }

    // Handle Worker Forks
    if (cluster.isWorker) {
      switch (process.env.workerType) {
      case 'payments':
        new PoolPayments(logger, _this.client).setupPayments(() => {});
        break;
      case 'server':
        new PoolServer(logger, _this.client).setupServer(() => {});
        break;
      case 'worker':
        new PoolWorkers(logger, _this.client).setupWorkers(() => {});
        break;
      }
    }
  };
};

module.exports = PoolThreads;
