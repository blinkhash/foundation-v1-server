/*
 *
 * Payments (Updated)
 *
 */

const async = require('async');
const utils = require('./utils');
const Stratum = require('blinkhash-stratum');

////////////////////////////////////////////////////////////////////////////////

// Main Payments Function
const PoolPayments = function (logger, client) {

  const _this = this;
  this.coins = [];
  this.client = client;
  this.poolConfigs = JSON.parse(process.env.poolConfigs);
  this.portalConfig = JSON.parse(process.env.portalConfig);
  this.forkId = process.env.forkId;

  // Check for Enabled Configs
  this.checkEnabled = function() {
    Object.keys(_this.poolConfigs).forEach((coin) => {
      const poolConfig = _this.poolConfigs[coin];
      if (poolConfig.payments && poolConfig.payments.enabled) {
        _this.coins.push(coin);
      }
    });
  };

  // Check for Deletable Shares
  this.checkShares = function(rounds, round) {
    let shareFlag = true;
    rounds.forEach((cRound) => {
      if ((cRound.height === round.height) &&
                (cRound.category !== 'kicked') &&
                (cRound.category !== 'orphan') &&
                (cRound.serialized !== round.serialized)) {
        shareFlag = false;
      }
    });
    return shareFlag;
  };

  // Check Address to Ensure Viability
  this.checkAddress = function(daemon, address, coin, command, callback) {
    daemon.cmd(command, [address], (result) => {
      if (result.error) {
        callback(true, JSON.stringify(result.error));
      } else if (!result.response || !result.response.ismine) {
        callback(true, 'The daemon does not own the pool address listed');
      } else {
        callback(false);
      }
    }, true);
  };

  // Ensure Payment Address is Valid for Daemon
  this.handleAddress = function(daemon, address, coin, callback) {
    _this.checkAddress(daemon, address, coin, 'validateaddress', (error,) => {
      if (error) {
        _this.checkAddress(daemon, address, coin, 'getaddressinfo', (error, message) => {
          if (error) {
            logger.error('Payments', coin, `Error with payment processing daemon: ${ message }`);
            callback(true, []);
          } else {
            callback(false, []);
          }
        });
      } else {
        callback(false, []);
      }
    });
  };

  // Calculate Current Balance in Daemon
  this.handleBalance = function(daemon, config, coin, callback) {
    const processingConfig = config.payments;
    daemon.cmd('getbalance', [], (result) => {
      if (result.error) {
        logger.error('Payments', coin, `Error with payment processing daemon ${ JSON.stringify(result.error) }`);
        callback(true, []);
        return;
      }
      try {
        const data = result.data.split('result":')[1].split(',')[0].split('.')[1];
        const magnitude = parseInt(`10${ new Array(data.length).join('0') }`);
        const minSatoshis = parseInt(processingConfig.minPayment * magnitude);
        const coinPrecision = magnitude.toString().length - 1;
        callback(false, [magnitude, minSatoshis, coinPrecision]);
      } catch(e) {
        logger.error('Payments', coin, `Error detecting number of satoshis in a coin. Tried parsing: ${ result.data }`);
        callback(true, []);
      }
    }, true, true);
  };

  // Handle Duplicate Blocks
  this.handleDuplicates = function(daemon, rounds, coin, callback) {

    const validBlocks = {};
    const invalidBlocks = [];

    const duplicates = rounds.filter((round) => round.duplicate);
    const commands = duplicates.map((round) => ['getblock', [round.hash]]);
    rounds = rounds.filter((round) => !round.duplicate);

    // Query Daemon Regarding Duplicate Blocks
    daemon.batchCmd(commands, (error, blocks) => {
      if (error || !blocks) {
        logger.error('Payments', coin, `Could not get blocks from daemon: ${ JSON.stringify(error) }`);
        callback(true);
        return;
      }

      // Build Duplicate Updates
      blocks.forEach((block, idx) => {
        if (block && block.result) {
          if (block.result.confirmations < 0) {
            invalidBlocks.push(['smove', `${ coin }:blocks:pending`, `${ coin }:blocks:duplicate`, duplicates[idx].serialized]);
          } else if (Object.prototype.hasOwnProperty.call(validBlocks, duplicates[idx].hash)) {
            invalidBlocks.push(['smove', `${ coin }:blocks:pending`, `${ coin }:blocks:duplicate`, duplicates[idx].serialized]);
          } else {
            validBlocks[duplicates[idx].hash] = duplicates[idx].serialized;
          }
        }
      });

      // Update Redis Database w/ Duplicates
      if (invalidBlocks.length > 0) {
        _this.client.multi(invalidBlocks).exec((error,) => {
          if (error) {
            logger.error('Payments', coin, `Error could not move invalid duplicate blocks ${ JSON.stringify(error) }`);
            return;
          }
          callback(null, rounds);
        });
      } else {
        callback(null, rounds);
      }
    }, true, true);
  };

  // Check Blocks for Duplicates/Issues
  this.handleBlocks = function(daemon, config, callback) {

    // Load Blocks from Database
    const coin = config.coin.name;
    const commands = [['zrangebyscore', `${ coin }:main:blocks:pending`, '-inf', 'inf']];
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not get blocks from database: ${ JSON.stringify(error) }`);
        callback(true);
        return;
      }

      // Manage Individual Rounds
      const rounds = results[0].map((r) => {
        const details = JSON.parse(r);
        return {
          time: details.time,
          height: details.height,
          hash: details.hash,
          reward: details.reward,
          transaction: details.transaction,
          difficulty: details.difficulty,
          worker: details.worker,
          solo: details.solo,
          duplicate: false,
          serialized: r
        };
      });

      // Check for Block Duplicates
      let duplicateFound = false;
      rounds.sort((a, b) => a.height - b.height);
      const roundHeights = rounds.flatMap(round => round.height);
      rounds.forEach(round => {
        if (utils.countOccurences(roundHeights, round.height) > 1) {
          round.duplicate = true;
          duplicateFound = true;
        }
      });

      // Handle Duplicate Blocks
      if (duplicateFound) {
        _this.handleDuplicates(daemon, rounds, coin, callback);
      } else {
        callback(null, rounds);
      }
    });
  };

  // Check Workers for Unpaid Balances
  this.handleWorkers = function(config, rounds, callback) {

    // Load Unpaid Workers from Database
    const coin = config.coin.name;
    const commands = [['hgetall', `${ coin }:main:payments:unpaid`]];
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not get workers from database: ${ JSON.stringify(error) }`);
        callback(true);
        return;
      }

      // Manage Individual Workers
      const workers = {};
      const magnitude = config.payments.magnitude;
      Object.keys(results[0] || {}).forEach((worker) => {
        workers[worker] = {
          balance: utils.coinsToSatoshies(parseFloat(results[0][worker]), magnitude)
        };
      });

      // Return Workers as Callback
      callback(null, rounds, workers);
    });
  };

  // Validate Transaction Hashes
  this.handleTransactions = function(daemon, config, rounds, workers, callback) {

    // Get Hashes for Each Transaction
    const coin = config.coin.name;
    const commands = rounds.map((round) => ['gettransaction', [round.transaction]]);

    // Query Daemon Regarding Transactions
    daemon.batchCmd(commands, (error, transactions) => {
      if (error || !transactions) {
        logger.error('Payments', coin, `Could not get transactions from daemon: ${ JSON.stringify(error) }`);
        callback(true);
        return;
      }

      // Handle Individual Transactions
      transactions.forEach((tx, idx) => {

        // Load Transaction Details
        const round = rounds[idx];
        let generationTx = tx.result.details.filter((tx) => {
          let txAddr = tx.address;
          if (txAddr.indexOf(':') > -1) {
            txAddr = txAddr.split(':')[1];
          }
          return txAddr === config.address;
        })[0];

        // Update Confirmations
        if (tx && tx.result)
          round.confirmations = parseInt((tx.result.confirmations || 0));

        // Check Daemon Edge Cases
        if (tx.error && tx.error.code === -5) {
          logger.warning('Payments', coin, `Daemon reports invalid transaction: ${ round.transaction }`);
          round.category = 'kicked';
          return;
        } else if (!tx.result.details || (tx.result.details && tx.result.details.length === 0)) {
          logger.warning('Payments', coin, `Daemon reports no details for transaction: ${ round.transaction }`);
          round.category = 'kicked';
          return;
        } else if (tx.error || !tx.result) {
          logger.error('Payments', coin, `Unable to load transaction: ${ round.transaction } ${ JSON.stringify(tx)}`);
          return;
        }

        // Check Transaction Edge Cases
        if (!generationTx && tx.result.details.length === 1) {
          generationTx = tx.result.details[0];
        }
        if (!generationTx) {
          logger.error('Payments', coin, `Unable to load pool address details: ${ round.transaction }`);
          return;
        }

        // Update Round Category/Reward
        round.category = generationTx.category;
        if ((round.category === 'generate') || (round.category === 'immature')) {
          const reward = parseFloat(generationTx.amount || generationTx.value);
          round.reward = utils.coinsRound(reward, config.payments.coinPrecision);
          return;
        }
      });

      // Manage Immature Rounds
      rounds = rounds.filter((round) => {
        switch (round.category) {
        case 'orphan':
        case 'kicked':
          round.remove = _this.checkShares(rounds, round);
          return false;
        case 'immature':
        case 'generate':
          return true;
        default:
          return false;
        }
      });

      // Return Rounds as Callback
      callback(null, rounds, workers);
    });
  };

  // Calculate Scores from Round Data
  this.handleTimes = function(config, rounds, workers, callback) {

    const times = [];
    const coin = config.coin.name;
    const commands = rounds.map((round) => {
      return [['hgetall', `${ coin }:rounds:round-${ round.height }:times:values`]];
    });

    // Build Commands from Rounds
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not load times data from database: ${ JSON.stringify(error) }`);
        callback(true);
        return;
      }

      // Build Worker Times Data w/ Results
      results.forEach((round) => {
        const timesRound = {};
        try {
          Object.keys(round).forEach((entry) => {
            timesRound[entry] = parseFloat(round[entry]);
          });
        } catch(e) {
          logger.error('Payments', coin, `Unable to format worker round times: ${ JSON.stringify(e) }`);
        }
        times.push(timesRound);
      });

      // Return Times Data as Callback
      callback(null, rounds, workers, times);
    });
  };

  // Calculate Shares from Round Data
  this.handleShares = function(config, rounds, workers, times, callback) {

    const solo = [];
    const shared = [];
    const coin = config.coin.name;
    const commands = rounds.map((round) => {
      return [['hgetall', `${ coin }:rounds:round-${ round.height }:shares:values`]];
    });

    // Build Commands from Rounds
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not load shares data from database: ${ JSON.stringify(error) }`);
        callback(true);
        return;
      }

      // Build Worker Shares Data w/ Results
      results.forEach((round) => {
        const soloRound = {};
        const sharedRound = {};
        try {
          Object.keys(round).forEach((entry) => {
            const details = JSON.parse(entry);
            if (details.solo) {
              if (!(details.worker in soloRound)) {
                soloRound[details.worker] = parseFloat(round[entry]);
              } else {
                soloRound[details.worker] += parseFloat(round[entry]);
              }
            } else {
              if (!(details.worker in sharedRound)) {
                sharedRound[details.worker] = parseFloat(round[entry]);
              } else {
                sharedRound[details.worker] += parseFloat(round[entry]);
              }
            }
          });
        } catch(e) {
          logger.error('Payments', coin, `Unable to format worker round shares: ${ JSON.stringify(e) }`);
        }
        solo.push(soloRound);
        shared.push(sharedRound);
      });

      // Return Times Data as Callback
      callback(null, rounds, workers, times, solo, shared);
    });
  };

  // Process Main Payment Checks
  this.processChecks = function(daemon, config, interval, callbackMain) {

    // Process Checks Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, callback),
      (rounds, callback) => _this.handleWorkers(config, rounds, callback),
      (rounds, workers, callback) => _this.handleTransactions(daemon, config, rounds, workers, callback),
      (rounds, workers, callback) => _this.handleTimes(config, rounds, workers, callback),
      (rounds, workers, times, callback) => _this.handleShares(config, rounds, workers, times, callback),
    ]);

    callbackMain();
  };

  // Process Main Payment Functionality
  this.processPayments = function(daemon, config, interval, callbackMain) {

    // Process Payments Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, callback),
      (rounds, callback) => _this.handleWorkers(config, rounds, callback),
      (rounds, workers, callback) => _this.handleTransactions(daemon, config, rounds, workers, callback),
      (rounds, workers, callback) => _this.handleTimes(config, rounds, workers, callback),
      (rounds, workers, times, callback) => _this.handleShares(config, rounds, workers, times, callback),
    ]);

    callbackMain();
  };

  // Start Payment Interval Management
  this.handleIntervals = function(daemon, config, callback) {

    // Handle Main Payment Checks
    const checkInterval = setInterval(() => {
      try {
        const lastInterval = Date.now();
        _this.processChecks(daemon, config, lastInterval, () => {});
      } catch(e) {
        clearInterval(checkInterval);
        throw new Error(e);
      }
    }, config.payments.checkInterval * 1000);

    // Handle Main Payment Functionality
    const paymentInterval = setInterval(() => {
      try {
        const lastInterval = Date.now();
        _this.processPayments(daemon, config, lastInterval, () => {});
      } catch(e) {
        clearInterval(paymentInterval);
        throw new Error(e);
      }
    }, config.payments.paymentInterval * 1000);

    // Start Payment Functionality with Initial Check
    setTimeout(() => {
      try {
        const lastInterval = Date.now();
        _this.processChecks(daemon, config, lastInterval, () => callback(null, true));
      } catch(e) {
        throw new Error(e);
      }
    }, 100);
  };

  // Handle Payment Processing for Enabled Pools
  this.handlePayments = function(coin, callback) {

    const poolConfig = _this.poolConfigs[coin];
    poolConfig.payments.processingFee = parseFloat(poolConfig.coin.txfee) || parseFloat(0.0004);
    poolConfig.payments.minConfirmations = Math.max((poolConfig.payments.minConfirmations || 10), 1);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], (severity, message) => {
      logger[severity]('Payments', coin, message);
    });

    // Warn if < Recommended Config
    if (poolConfig.payments.minConfirmations < 3) {
      logger.warning('Payments', coin, 'The recommended number of confirmations is >= 3.');
    }

    // Handle Initial Validation
    async.parallel([
      (callback) => _this.handleAddress(daemon, poolConfig.address, coin, callback),
      (callback) => _this.handleBalance(daemon, poolConfig, coin, callback)
    ], (error, results) => {
      if (error) {
        callback(true, false);
        return;
      } else {
        poolConfig.payments.magnitude = results[1][0];
        poolConfig.payments.minPaymentSatoshis = results[1][1];
        poolConfig.payments.coinPrecision = results[1][2];
        _this.handleIntervals(daemon, poolConfig, callback);
        return;
      }
    });
  };

  // Output Derived Payment Information
  this.outputPaymentInfo = function(pools) {
    pools.forEach((coin) => {
      const poolOptions = _this.poolConfigs[coin];
      const processingConfig = poolOptions.payments;
      logger.debug('Payments', coin, `Payment processing setup to run every ${
        processingConfig.paymentInterval } second(s) with daemon (${
        processingConfig.daemon.user }@${ processingConfig.daemon.host }:${
        processingConfig.daemon.port }) and redis (${ _this.portalConfig.redis.host }:${
        _this.portalConfig.redis.port })`
      );
    });
  };

  // Start Worker Capabilities
  this.setupPayments = function(callback) {
    _this.checkEnabled();
    async.filter(_this.coins, _this.handlePayments, (error, results) => {
      _this.outputPaymentInfo(results);
      callback();
    });
  };
};

module.exports = PoolPayments;
