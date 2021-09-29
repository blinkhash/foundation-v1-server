/*
 *
 * Shares (Updated)
 *
 */

const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Shares Function
const PoolShares = function (logger, client, poolConfig, portalConfig) {

  const _this = this;
  this.pool = poolConfig.name;
  this.client = client;
  this.poolConfig = poolConfig;
  this.portalConfig = portalConfig;
  this.forkId = process.env.forkId;

  const logSystem = 'Pool';
  const logComponent = poolConfig.name;
  const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

  _this.client.on('ready', () => {});
  _this.client.on('error', (error) => {
    logger.error(logSystem, logComponent, logSubCat, `Redis client had an error: ${ JSON.stringify(error) }`);
  });
  _this.client.on('end', () => {
    logger.error(logSystem, logComponent, logSubCat, 'Connection to redis database has been ended');
  });

  // Manage Times Calculations
  this.calculateTimes = function(results, address, blockValid, blockType) {

    const commands = [];
    const dateNow = Date.now();
    const lastTimes = results || {};

    // Check if Worker Recently Joined
    if (!lastTimes[address]) {
      lastTimes[address] = dateNow;
    }

    // Check for Continous Primary Mining
    const lastTime = lastTimes[address];
    const timeChange = utils.roundTo(Math.max(dateNow - lastTime, 0) / 1000, 4);
    if (timeChange < 900) {
      commands.push(['hincrbyfloat', `${ _this.pool }:rounds:${ blockType }:current:times`, address, timeChange]);
    }

    // Ensure Block Hasn't Been Found
    if (!blockValid) {
      commands.push(['hset', `${ _this.pool }:rounds:${ blockType }:current:submissions`, address, dateNow]);
    }

    return commands;
  };

  // Manage Shares Calculations
  this.calculateShares = function(results, shareData, shareValid, blockValid, blockType) {

    const commands = [];
    const dateNow = Date.now();
    const difficulty = (shareValid ? shareData.difficulty : -shareData.difficulty);
    const isSoloMining = utils.checkSoloMining(_this.poolConfig, shareData);
    const worker = blockType === 'primary' ? shareData.addrPrimary : shareData.addrAuxiliary;

    // Build Primary Output
    const outputShare = {
      time: dateNow,
      difficulty: difficulty,
      worker: worker,
      solo: isSoloMining,
    };

    // Handle Valid/Invalid Shares
    if (shareValid) {
      commands.push(['zadd', `${ _this.pool }:rounds:${ blockType }:current:hashrate`, dateNow / 1000 | 0, JSON.stringify(outputShare)]);
      commands.push(['hincrby', `${ _this.pool }:rounds:${ blockType }:current:counts`, 'valid', 1]);
      commands.push(['hincrbyfloat', `${ _this.pool }:rounds:${ blockType }:current:shares`, JSON.stringify(outputShare), shareData.difficulty]);
    } else {
      commands.push(['zadd', `${ _this.pool }:rounds:${ blockType }:current:hashrate`, dateNow / 1000 | 0, JSON.stringify(outputShare)]);
      commands.push(['hincrby', `${ _this.pool }:rounds:${ blockType }:current:counts`, 'invalid', 1]);
    }

    return commands;
  };

  // Manage Blocks Calculations
  /* istanbul ignore next */
  this.calculateBlocks = function(results, shareData, shareValid, blockValid) {

    const commands = [];
    const dateNow = Date.now();
    const blockType = shareData.blockType;
    const isSoloMining = utils.checkSoloMining(_this.poolConfig, shareData);

    const worker = ['share', 'primary'].includes(blockType) ? shareData.addrPrimary : shareData.addrAuxiliary;
    const difficulty = ['share', 'primary'].includes(blockType) ? shareData.blockDiffPrimary : shareData.blockDiffAuxiliary;
    const shares = ['share', 'primary'].includes(blockType) ? results[0] : results[2];

    // Convert Difficulties to Floats
    let difficulties = Object.values(shares || {}).map((value) => {
      return /^-?\d*(\.\d+)?$/.test(value) ? parseFloat(value) : 0;
    });

    difficulties = difficulties.reduce((p_sum, a) => p_sum + a, 0);
    const luck = (difficulties + shareData.difficulty) / difficulty * 100;

    // Build Output Block
    const outputBlock = {
      time: dateNow,
      height: shareData.height,
      hash: shareData.hash,
      reward: shareData.reward,
      transaction: shareData.transaction,
      difficulty: difficulty,
      luck: luck,
      worker: worker,
      solo: isSoloMining,
    };

    // Handle Valid/Invalid Blocks
    if (blockValid) {
      commands.push(['del', `${ _this.pool }:rounds:${ blockType }:current:submissions`]),
      commands.push(['rename', `${ _this.pool }:rounds:${ blockType }:current:counts`, `${ _this.pool }:rounds:${ blockType }:round-${ shareData.height }:counts`]);
      commands.push(['rename', `${ _this.pool }:rounds:${ blockType }:current:shares`, `${ _this.pool }:rounds:${ blockType }:round-${ shareData.height }:shares`]);
      commands.push(['rename', `${ _this.pool }:rounds:${ blockType }:current:times`, `${ _this.pool }:rounds:${ blockType }:round-${ shareData.height }:times`]);
      commands.push(['sadd', `${ _this.pool }:blocks:${ blockType }:pending`, JSON.stringify(outputBlock)]);
      commands.push(['hincrby', `${ _this.pool }:blocks:${ blockType }:counts`, 'valid', 1]);
    } else if (shareData.transaction) {
      commands.push(['hincrby', `${ _this.pool }:blocks:${ blockType }:counts`, 'invalid', 1]);
    }

    return commands;
  };

  // Manage Worker Times
  this.buildTimesCommands = function(results, shareData, shareValid, blockValid) {
    let commands = [];
    if (shareValid) {
      commands = commands.concat(_this.calculateTimes(results[1], shareData.addrPrimary, blockValid, 'primary'));
      if (_this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {
        commands = commands.concat(_this.calculateTimes(results[3], shareData.addrAuxiliary, blockValid, 'auxiliary'));
      }
    }
    return commands;
  };

  // Manage Worker Times
  this.buildSharesCommands = function(results, shareData, shareValid, blockValid) {
    let commands = [];
    commands = commands.concat(_this.buildTimesCommands(results, shareData, shareValid, blockValid));
    commands = commands.concat(_this.calculateShares(results, shareData, shareValid, blockValid, 'primary'));
    if (_this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {
      commands = commands.concat(_this.calculateShares(results, shareData, shareValid, blockValid, 'auxiliary'));
    }
    return commands;
  };


  // Build Redis Commands
  this.buildCommands = function(results, shareData, shareValid, blockValid, callback, handler) {
    let commands = [];
    commands = commands.concat(_this.buildSharesCommands(results, shareData, shareValid, blockValid));
    commands = commands.concat(_this.calculateBlocks(results, shareData, shareValid, blockValid));
    this.executeCommands(commands, callback, handler);
    return commands;
  };

  // Execute Redis Commands
  /* istanbul ignore next */
  this.executeCommands = function(commands, callback, handler) {
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error(logSystem, logComponent, logSubCat, `Error with redis share processing ${ JSON.stringify(error) }`);
        handler(error);
      } else {
        callback(results);
      }
    });
  };

  // Handle Share Submissions
  /* istanbul ignore next */
  this.handleShares = function(shareData, shareValid, blockValid, callback, handler) {
    const shareLookups = [
      ['hgetall', `${ _this.pool }:rounds:primary:current:shares`],
      ['hgetall', `${ _this.pool }:rounds:primary:current:submissions`],
      ['hgetall', `${ _this.pool }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ _this.pool }:rounds:auxiliary:current:submissions`]];
    this.executeCommands(shareLookups, (results) => {
      _this.buildCommands(results, shareData, shareValid, blockValid, callback, handler);
    }, handler);
  };
};

module.exports = PoolShares;
