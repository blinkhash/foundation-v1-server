/*
 *
 * Stats (Updated)
 *
 */

const Stratum = require('foundation-stratum');

////////////////////////////////////////////////////////////////////////////////

// Main Stats Function
const PoolStats = function (logger, client) {

  const _this = this;
  this.client = client;
  this.poolConfigs = JSON.parse(process.env.poolConfigs);
  this.portalConfig = JSON.parse(process.env.portalConfig);
  this.forkId = process.env.forkId;

  // set `networkStatsRefreshInterval` in your pool's config
  _this.refreshInterval = _this.poolConfigs.networkStatsRefreshInterval || 20000;

  this.setupPoolStats = function(callback) {
    Object.keys(_this.poolConfigs).forEach((pool) => {
      const config = _this.poolConfigs[pool];

      if (config.primary.payments.daemon) {
        // Build Primary Daemon
        const handler = (severity, results) => logger[severity]('Stats', pool, results);

        const daemon = new Stratum.daemon([config.primary.payments.daemon], handler);
        
        setInterval(() => {
          _this.handleMiningInfo(daemon, pool, callback, handler);
        }, _this.refreshInterval);
      }
    });  
  };

  this.handleMiningInfo = function(daemon, pool, callback, handler) {
    const commands = [];
    
    daemon.cmd('getmininginfo', [], (result) => {
      if (result.error) {
        logger.error('Stats', pool, `Error with stats daemon: ${ JSON.stringify(result.error) }`);
        callback(true,[]);
      } else {
        const data = result.response;

        commands.push(['hset', `${ pool }:stats`, 'blockchainHeight', data.blocks]);
        commands.push(['hset', `${ pool }:stats`, 'networkDiff', data.difficulty]);
        commands.push(['hset', `${ pool }:stats`, 'networkHashesPerSecond', data.networkhashps]);

        _this.executeCommands(commands, pool, callback, handler);
      }
    }, true);
  };


  // Execute Redis Commands
  /* istanbul ignore next */
  this.executeCommands = function(commands, pool, callback, handler) {
    const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Pool', pool, logSubCat, `Error with redis share processing ${ JSON.stringify(error) }`);
        handler(error);
      } else {
        logger.debug('Stats', pool, 'Refreshing Network Stats');
        callback(results);
      }
    });
  };
};

module.exports = PoolStats;
