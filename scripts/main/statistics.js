/*
 *
 * Statistics (Updated)
 *
 */

////////////////////////////////////////////////////////////////////////////////

// Main Statistics Function
const PoolStatistics = function (logger, client, poolConfig, portalConfig) {

  const _this = this;
  process.setMaxListeners(0);

  this.pool = poolConfig.name;
  this.client = client;
  this.poolConfig = poolConfig;
  this.portalConfig = portalConfig;
  this.forkId = process.env.forkId;

  const logSystem = 'Pool';
  const logComponent = poolConfig.name;
  const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

  // Current Statistics Refresh Interval
  _this.refreshInterval = _this.poolConfig.settings.statisticsRefreshInterval || 20000;

  // Get Mining Statistics from Daemon
  this.handleMiningInfo = function(daemon, blockType, callback, handler) {
    const commands = [];
    daemon.cmd('getmininginfo', [], (result) => {
      if (result[0].error) {
        logger.error('Statistics', _this.pool, `Error with statistics daemon: ${ JSON.stringify(result[0].error) }`);
        handler(result[0].error);
      } else {
        const data = result[0].response;
        commands.push(['hset', `${ this.pool }:statistics:${ blockType }:network`, 'difficulty', data.difficulty]);
        commands.push(['hset', `${ this.pool }:statistics:${ blockType }:network`, 'hashrate', data.networkhashps]);
        commands.push(['hset', `${ this.pool }:statistics:${ blockType }:network`, 'height', data.blocks]);
        callback(commands);
      }
    });
  };

  // Execute Redis Commands
  /* istanbul ignore next */
  this.executeCommands = function(commands, callback, handler) {
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error(logSystem, logComponent, logSubCat, `Error with redis statistics processing ${ JSON.stringify(error) }`);
        handler(error);
      } else {
        callback(results);
      }
    });
  };

  // Start Interval Initialization
  /* istanbul ignore next */
  this.handleIntervals = function(daemon, blockType) {
    setInterval(() => {
      _this.handleMiningInfo(daemon, blockType, (results) => {
        _this.executeCommands(results, () => {
          if (_this.poolConfig.debug) {
            logger.debug('Statistics', _this.pool, `Finished updating statistics for ${ blockType } configuration.`);
          }
        }, () => {});
      }, () => {});
    }, _this.refreshInterval);
  };

  // Start Interval Initialization
  /* istanbul ignore next */
  this.setupStatistics = function(poolStratum) {
    if (poolStratum.primary.daemon) {
      _this.handleIntervals(poolStratum.primary.daemon, 'primary');
      if (_this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled && poolStratum.auxiliary.daemon) {
        _this.handleIntervals(poolStratum.auxiliary.daemon, 'auxiliary');
      }
    }
  };
};

module.exports = PoolStatistics;
