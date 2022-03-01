/*
 *
 * Payments (Updated)
 *
 */

const fs = require('fs');
const async = require('async');
const utils = require('./utils');
const Stratum = require('foundation-stratum');

////////////////////////////////////////////////////////////////////////////////

// Main Payments Function
const PoolPayments = function (logger, client) {

  const _this = this;
  process.setMaxListeners(0);

  this.pools = [];
  this.client = client;
  this.poolConfigs = JSON.parse(process.env.poolConfigs);
  this.portalConfig = JSON.parse(process.env.portalConfig);
  this.forkId = process.env.forkId;

  // Check for Enabled Configs
  this.checkEnabled = function() {
    Object.keys(_this.poolConfigs).forEach((pool) => {
      const poolConfig = _this.poolConfigs[pool];
      if (poolConfig.primary.payments && poolConfig.primary.payments.enabled) {
        _this.pools.push(pool);
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
  this.checkAddress = function(daemon, address, command, callback) {
    daemon.cmd(command, [address], true, (result) => {
      if (result.error) {
        callback(true, JSON.stringify(result.error));
      } else if (!result.response || !result.response.ismine) {
        callback(true, 'The daemon does not own the pool address listed');
      } else {
        callback(null);
      }
    });
  };

  // Ensure Payment Address is Valid for Daemon
  this.handleAddress = function(daemon, address, pool, callback) {
    _this.checkAddress(daemon, address, 'validateaddress', (error,) => {
      if (error) {
        _this.checkAddress(daemon, address, 'getaddressinfo', (error, results) => {
          if (error) {
            logger.error('Payments', pool, `Error with payment processing daemon: ${ results }`);
            callback(true, []);
          } else {
            callback(null, []);
          }
        });
      } else {
        callback(null, []);
      }
    });
  };

  // Calculate Current Balance in Daemon
  this.handleBalance = function(daemon, config, pool, blockType, callback) {
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    daemon.cmd('getbalance', [], true, (result) => {
      if (result.error) {
        logger.error('Payments', pool, `Error with payment processing daemon: ${ JSON.stringify(result.error) }`);
        callback(true, []);
        return;
      }
      try {
        const data = result.response.toString().split('.')[1];
        const magnitude = parseInt(`10${ new Array(data.length).join('0') }`);
        const minSatoshis = parseInt(processingConfig.payments.minPayment * magnitude);
        const coinPrecision = magnitude.toString().length - 1;
        callback(null, [magnitude, minSatoshis, coinPrecision]);
      } catch(e) {
        logger.error('Payments', pool, `Error detecting number of satoshis in a coin. Tried parsing: ${ result.data }`);
        callback(true, []);
      }
    });
  };

  // Calculate Unspent Balance in Daemon
  this.handleUnspent = function(daemon, config, category, pool, blockType, callback) {
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    const args = [processingConfig.payments.minConfirmations, 99999999];
    daemon.cmd('listunspent', args, true, (result) => {
      if (!result || result.error) {
        logger.error('Payments', pool, `Error with payment processing daemon: ${ JSON.stringify(result.error) }`);
        callback(true, []);
      } else {
        let balance = parseFloat(0);
        if (result.response != null && result.response.length > 0) {
          result.response.forEach((instance) => {
            if (instance.address && instance.address !== null) {
              balance += parseFloat(instance.amount || 0);
            }
          });
          balance = utils.coinsRound(balance, processingConfig.payments.coinPrecision);
        }
        if (category === 'start') {
          logger.special('Payments', pool, `${ processingConfig.coin.name } wallet has a balance of ${ balance } ${ processingConfig.coin.symbol }`);
        }
        callback(null, [utils.coinsToSatoshis(balance, processingConfig.payments.magnitude)]);
      }
    });
  };

  // Handle Shares of Orphan Blocks
  this.handleOrphans = function(round, pool, blockType, callback) {

    const commands = [];
    const dateNow = Date.now();

    if (typeof round.orphanShares !== 'undefined') {
      logger.warning('Payments', pool, `Moving shares from orphaned block ${ round.height } to current round.`);

      // Move Orphaned Shares to Following Round
      Object.keys(round.orphanShares).forEach((address) => {
        const outputShare = {
          time: dateNow,
          effort: 0,
          identifier: null,
          round: 'orphan',
          solo: false,
          times: round.orphanTimes[address] || 0,
          types: { valid: 1, invalid: 0, stale: 0 },
          work: round.orphanShares[address],
          worker: address,
        };
        commands.push(['hincrby', `${ pool }:rounds:${ blockType }:current:shared:counts`, 'valid', 1]);
        commands.push(['hset', `${ pool }:rounds:${ blockType }:current:shared:shares`, address, JSON.stringify(outputShare)]);
      });
    }

    // Return Commands as Callback
    callback(null, commands);
  };

  // Handle Duplicate Blocks/Rounds
  /* istanbul ignore next */
  this.handleDuplicates = function(daemon, rounds, pool, blockType, callback) {

    const validBlocks = {};
    const invalidBlocks = [];

    const duplicates = rounds.filter((round) => round.duplicate);
    const commands = duplicates.map((round) => ['getblock', [round.hash]]);
    rounds = rounds.filter((round) => !round.duplicate);

    // Query Daemon Regarding Duplicate Blocks
    daemon.batchCmd(commands, (error, blocks) => {
      if (error || !blocks) {
        logger.error('Payments', pool, `Could not get blocks from daemon: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Build Duplicate Updates
      blocks.forEach((block, idx) => {
        if (block && block.result) {
          if (block.result.confirmations < 0) {
            invalidBlocks.push(['smove', `${ pool }:blocks:${ blockType }:pending`, `${ pool }:blocks:${ blockType }:duplicate`, duplicates[idx].serialized]);
          } else if (Object.prototype.hasOwnProperty.call(validBlocks, duplicates[idx].hash)) {
            invalidBlocks.push(['smove', `${ pool }:blocks:${ blockType }:pending`, `${ pool }:blocks:${ blockType }:duplicate`, duplicates[idx].serialized]);
          } else {
            validBlocks[duplicates[idx].hash] = duplicates[idx].serialized;
          }
        }
      });

      // Update Redis Database w/ Duplicates
      if (invalidBlocks.length > 0) {
        _this.client.multi(invalidBlocks).exec((error,) => {
          if (error) {
            logger.error('Payments', pool, `Error could not move invalid duplicate blocks ${ JSON.stringify(error) }`);
            callback(true, []);
            return;
          }
          callback(null, [rounds]);
        });
      } else {
        callback(null, [rounds]);
      }
    });
  };

  // Handle Workers for Immature Blocks
  this.handleImmature = function(config, round, workers, times, maxTime, solo, shared, blockType, callback) {

    let totalShares = parseFloat(0);
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    const feeSatoshi = utils.coinsToSatoshis(processingConfig.payments.processingFee, processingConfig.payments.magnitude);
    const immature = Math.round(utils.coinsToSatoshis(round.reward, processingConfig.payments.magnitude)) - feeSatoshi;

    // Handle Solo Rounds
    if (round.solo) {
      const worker = workers[round.worker] || {};
      worker.shares = worker.shares || {};
      const shares = parseFloat(solo[round.worker] || 1);
      const total = Math.round(immature);
      worker.shares.round = shares;
      worker.immature = (worker.immature || 0) + total;
      workers[round.worker] = worker;

    // Handle Shared Rounds
    } else {

      // Handle PPLNT Share Reduction
      Object.keys(shared).forEach((address) => {
        let shares = parseFloat(shared[address]);
        const worker = workers[address] || {};
        worker.shares = worker.shares || {};
        if (times[address] != null && parseFloat(times[address]) > 0) {
          const timePeriod = utils.roundTo((parseFloat(times[address]) / maxTime), 2);
          if (timePeriod > 0 && timePeriod < 0.51) {
            const lost = shares * (1 - timePeriod);
            shares = utils.roundTo(Math.max(shares - lost, 0), 2);
          }
        }
        totalShares += shares;
        worker.shares.round = shares;
        workers[address] = worker;
      });

      // Calculate Final Block Rewards
      Object.keys(shared).forEach((address) => {
        const worker = workers[address];
        const percent = parseFloat(worker.shares.round) / totalShares;
        const total = Math.round(immature * percent);
        worker.immature = (worker.immature || 0) + total;
        workers[address] = worker;
      });
    }

    // Return Updated Workers as Callback
    callback(null, [workers]);
  };

  // Handle Workers for Generate Blocks
  this.handleGenerate = function(config, round, workers, times, maxTime, solo, shared, blockType, callback) {

    let totalShares = parseFloat(0);
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    const feeSatoshi = utils.coinsToSatoshis(processingConfig.payments.processingFee, processingConfig.payments.magnitude);
    const generate = Math.round(utils.coinsToSatoshis(round.reward, processingConfig.payments.magnitude)) - feeSatoshi;

    // Handle Solo Rounds
    if (round.solo) {
      const worker = workers[round.worker] || {};
      worker.shares = worker.shares || {};
      const shares = parseFloat(solo[round.worker] || 1);
      const total = Math.round(generate);
      worker.shares.round = shares;
      worker.shares.total = parseFloat(worker.shares.total || 0) + shares;
      worker.generate = (worker.generate || 0) + total;
      workers[round.worker] = worker;

    // Handle Shared Rounds
    } else {

      // Handle PPLNT Share Reduction
      Object.keys(shared).forEach((address) => {
        let shares = parseFloat(shared[address]);
        const worker = workers[address] || {};
        worker.shares = worker.shares || {};
        if (times[address] != null && parseFloat(times[address]) > 0) {
          const timePeriod = utils.roundTo((parseFloat(times[address]) / maxTime), 2);
          if (timePeriod > 0 && timePeriod < 0.51) {
            const lost = shares * (1 - timePeriod);
            shares = utils.roundTo(Math.max(shares - lost, 0), 2);
          }
        }
        totalShares += shares;
        worker.shares.round = shares;
        worker.shares.total = parseFloat(worker.shares.total || 0) + shares;
        workers[address] = worker;
      });

      // Calculate Final Block Rewards
      Object.keys(shared).forEach((address) => {
        const worker = workers[address];
        const percent = parseFloat(worker.shares.round) / totalShares;
        const total = Math.round(generate * percent);
        worker.generate = (worker.generate || 0) + total;
        workers[address] = worker;
      });
    }

    // Return Updated Workers as Callback
    callback(null, [workers]);
  };

  // Check Blocks for Duplicates/Issues
  /* istanbul ignore next */
  this.handleBlocks = function(daemon, config, blockType, callback) {

    // Load Blocks from Database
    const pool = config.name;
    const commands = [
      ['smembers', `${ pool }:blocks:${ blockType }:pending`],
      ['smembers', `${ pool }:blocks:${ blockType }:confirmed`]];
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', pool, `Could not get blocks from database: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Manage Individual Rounds
      let rounds = results[0].map((r) => {
        const details = JSON.parse(r);
        return {
          time: details.time,
          height: details.height,
          hash: details.hash,
          reward: details.reward,
          transaction: details.transaction,
          difficulty: details.difficulty,
          worker: details.worker ? details.worker.split('.')[0] : '',
          solo: details.solo,
          duplicate: false,
          serialized: r
        };
      });

      // Check for Block Duplicates
      let duplicateFound = false;
      rounds = rounds.sort((a, b) => a.height - b.height);
      const roundHeights = rounds.flatMap(round => round.height);
      rounds.forEach((round) => {
        if (utils.countOccurences(roundHeights, round.height) > 1) {
          round.duplicate = true;
          duplicateFound = true;
        }
      });

      // Handle Duplicate Blocks
      if (duplicateFound) {
        _this.handleDuplicates(daemon, rounds, pool, blockType, callback);
      } else {
        callback(null, [rounds]);
      }
    });
  };

  // Check Workers for Unpaid Balances
  /* istanbul ignore next */
  this.handleWorkers = function(config, blockType, data, callback) {

    // Load Unpaid Workers from Database
    const pool = config.name;
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    const commands = [['hgetall', `${ pool }:payments:${ blockType }:balances`]];
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', pool, `Could not get workers from database: ${ JSON.stringify(error) }`);
        callback(true, []);
      }

      // Manage Individual Workers
      const workers = {};
      const magnitude = processingConfig.payments.magnitude;
      Object.keys(results[0] || {}).forEach((worker) => {
        workers[worker] = {
          balance: utils.coinsToSatoshis(parseFloat(results[0][worker]), magnitude)
        };
      });

      // Return Workers as Callback
      callback(null, [data[0], workers]);
    });
  };

  // Validate Transaction Hashes
  /* istanbul ignore next */
  this.handleTransactions = function(daemon, config, blockType, data, callback) {

    // Get Hashes for Each Transaction
    let rounds = data[0];
    const pool = config.name;
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    const commands = rounds.map((round) => ['gettransaction', [round.transaction]]);

    // Query Daemon Regarding Transactions
    daemon.batchCmd(commands, (error, transactions) => {
      if (error || !transactions) {
        logger.error('Payments', pool, `Could not get transactions from daemon: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Handle Individual Transactions
      transactions.forEach((tx, idx) => {

        // Check Daemon Edge Cases
        const round = rounds[idx];
        if (tx.error && tx.error.code === -5) {
          logger.warning('Payments', pool, `Daemon reports invalid transaction: ${ round.transaction }`);
          round.category = 'kicked';
          return;
        } else if (tx.error || !tx.result) {
          logger.error('Payments', pool, `Unable to load transaction: ${ round.transaction } ${ JSON.stringify(tx)}`);
          return;
        } else if (!tx.result.details || (tx.result.details && tx.result.details.length === 0)) {
          logger.warning('Payments', pool, `Daemon reports no details for transaction: ${ round.transaction }`);
          round.category = 'kicked';
          return;
        }

        // Filter Transactions by Address
        const transactions = tx.result.details.filter((tx) => {
          let txAddress = tx.address;
          if (txAddress.indexOf(':') > -1) {
            txAddress = txAddress.split(':')[1];
          }
          if (blockType === 'primary') {
            return txAddress === config.primary.address;
          }
        });

        // Find Generation Transaction
        let generationTx = null;
        if (transactions.length >= 1) {
          generationTx = transactions[0];
        } else if (tx.result.details.length > 1){
          const sorted = tx.result.details.sort((a, b) => a.vout - b.vout);
          generationTx = sorted[0];
        } else if (tx.result.details.length === 1) {
          generationTx = tx.result.details[0];
        }

        // Update Round Details
        round.category = generationTx.category;
        round.confirmations = parseInt(tx.result.confirmations);
        if ((round.category === 'generate') || (round.category === 'immature')) {
          const reward = parseFloat(generationTx.amount || generationTx.value);
          round.reward = utils.coinsRound(reward, processingConfig.payments.coinPrecision);
          return;
        }
      });

      // Manage Immature Rounds
      rounds = rounds.filter((round) => {
        switch (round.category) {
        case 'orphan':
        case 'kicked':
          round.delete = _this.checkShares(rounds, round);
          return true;
        case 'immature':
        case 'generate':
          return true;
        }
      });

      // Return Rounds as Callback
      callback(null, [rounds, data[1]]);
    });
  };

  // Calculate Shares from Round Data
  /* istanbul ignore next */
  this.handleShares = function(config, blockType, data, callback) {

    const times = [];
    const solo = [];
    const shared = [];
    const pool = config.name;

    // Map Commands from Individual Rounds
    const commands = data[0].map((round) => {
      return ['hgetall', `${ pool }:rounds:${ blockType }:round-${ round.height }:shares`];
    });

    // Build Commands from Rounds
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', pool, `Could not load shares data from database: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Build Worker Shares Data w/ Results
      results.forEach((round) => {
        const timesRound = {};
        const soloRound = {};
        const sharedRound = {};

        // Iterate Through Each Round
        Object.keys(round || {}).forEach((entry) => {

          // Calculate Round Values
          const details = JSON.parse(round[entry]);
          const address = entry.split('.')[0];
          const timesValue = /^-?\d*(\.\d+)?$/.test(details.times) ? parseFloat(details.times) : 0;
          const workValue = /^-?\d*(\.\d+)?$/.test(details.work) ? parseFloat(details.work) : 0;

          // Process Round Times Data
          if (address in timesRound) {
            if (timesValue >= timesRound[address]) {
              timesRound[address] = timesValue;
            }
          } else {
            timesRound[address] = timesValue;
          }

          // Process Round Share Data
          if (details.solo) {
            if (address in soloRound) {
              soloRound[address] += parseFloat(workValue);
            } else {
              soloRound[address] = parseFloat(workValue);
            }
          } else {
            if (address in sharedRound) {
              sharedRound[address] += parseFloat(workValue);
            } else {
              sharedRound[address] = parseFloat(workValue);
            }
          }
        });

        // Push Round Data to Main
        times.push(timesRound);
        solo.push(soloRound);
        shared.push(sharedRound);
      });

      // Return Share Data as Callback
      callback(null, [data[0], data[1], times, solo, shared]);
    });
  };

  // Calculate Amount Owed to Workers
  this.handleOwed = function(daemon, config, category, blockType, data, callback) {

    let totalOwed = parseInt(0);
    const rounds = data[0];
    const pool = config.name;

    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;
    const feeSatoshi = utils.coinsToSatoshis(processingConfig.payments.processingFee, processingConfig.payments.magnitude);

    // Add to Total Owed from Rounds
    rounds.forEach((round) => {
      if (round.category === 'generate') {
        totalOwed += utils.coinsToSatoshis(round.reward, processingConfig.payments.magnitude) - feeSatoshi;
      }
    });

    // Add to Total Owed from Unpaid
    Object.keys(data[1]).forEach((worker) => {
      totalOwed += worker.balance || 0;
    });

    // Check Unspent Balance
    _this.handleUnspent(daemon, config, category, pool, blockType, (error, balance) => {
      if (error) {
        logger.error('Payments', pool, 'Error checking pool balance before processing payments.');
        callback(true, []);
        return;
      }

      // Check Balance for Payments
      if ((balance[0] < totalOwed) && (category === 'payments')) {
        const currentBalance = utils.satoshisToCoins(balance[0], processingConfig.payments.magnitude, processingConfig.payments.coinPrecision);
        const owedBalance = utils.satoshisToCoins(totalOwed, processingConfig.payments.magnitude, processingConfig.payments.coinPrecision);
        logger.warning('Payments', pool, `Insufficient funds (${ currentBalance }) to process payments (${ owedBalance }), possibly waiting for transactions.`);
      }

      // Return Payment Data as Callback
      callback(null, [rounds, data[1], data[2], data[3], data[4]]);
    });
  };

  // Calculate Scores Given Times/Shares
  this.handleRewards = function(config, category, blockType, data, callback) {

    let workers = data[1];
    const rounds = data[0];
    const pool = config.name;

    // Manage Shares in each Round
    rounds.forEach((round, i) => {

      let maxTime = 0;
      const times = data[2][i];
      const solo = data[3][i];
      const shared = data[4][i];

      // Check if Shares Exist in Round
      if (Object.keys(solo).length <= 0 && Object.keys(shared).length <= 0) {
        if (category === 'payments') {
          _this.client.smove(`${ pool }:blocks:${ blockType }:pending`, `${ pool }:blocks:${ blockType }:manual`, round.serialized);
          logger.error('Payments', pool, `No worker shares for round: ${ round.height }, hash: ${ round.hash }. Manual payout required.`);
          return;
        }
      }

      // Find Max Time in ALL Shares
      const workerTimes = {};
      Object.keys(times).forEach((address) => {
        const workerTime = parseFloat(times[address]);
        if (maxTime < workerTime) {
          maxTime = workerTime;
        }
        workerTimes[address] = workerTime;
      });

      // Manage Block Generated
      switch (round.category) {
      case 'orphan':
      case 'kicked':
        round.orphanShares = shared;
        round.orphanTimes = times;
        break;
      case 'immature':
        _this.handleImmature(config, round, workers, times, maxTime, solo, shared, blockType, (error, results) => {
          workers = results[0];
        });
        break;
      case 'generate':
        _this.handleGenerate(config, round, workers, times, maxTime, solo, shared, blockType, (error, results) => {
          workers = results[0];
        });
        break;
      }
    });

    // Return Updated Rounds/Workers as Callback
    callback(null, [rounds, workers]);
  };

  // Send Payments if Applicable
  this.handleSending = function(daemon, config, blockType, data, callback) {

    let totalSent = 0;
    const amounts = {};
    const commands = [];
    const dateNow = Date.now();

    const rounds = data[0];
    const workers = data[1];
    const pool = config.name;
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;

    // Calculate Amount to Send to Workers
    Object.keys(workers).forEach((address) => {
      const worker = workers[address];
      const amount = Math.round((worker.balance || 0) + (worker.generate || 0));

      // Determine Amounts Given Mininum Payment
      if (amount >= processingConfig.payments.minPaymentSatoshis) {
        worker.sent = utils.satoshisToCoins(amount, processingConfig.payments.magnitude, processingConfig.payments.coinPrecision);
        amounts[address] = utils.coinsRound(worker.sent, processingConfig.payments.coinPrecision);
        totalSent += worker.sent;
      } else {
        worker.sent = 0;
        worker.change = amount;
      }

      workers[address] = worker;
    });

    // Check if No Workers/Rounds
    if (Object.keys(amounts).length === 0) {
      callback(null, [rounds, workers]);
      return;
    }

    // Send Payments to Workers Through Daemon
    const rpcTracking = `sendmany "" ${ JSON.stringify(amounts) }`;
    daemon.cmd('sendmany', ['', amounts], true, (result) => {

      // Check Error Edge Cases
      if (result.error && result.error.code === -5) {
        logger.warning('Payments', pool, rpcTracking);
        logger.error('Payments', pool, `Error sending payments ${ JSON.stringify(result.error)}`);
        callback(true, []);
        return;
      } else if (result.error && result.error.code === -6) {
        logger.warning('Payments', pool, rpcTracking);
        logger.error('Payments', pool, `Insufficient funds for payments: ${ JSON.stringify(result.error)}`);
        callback(true, []);
        return;
      } else if (result.error && result.error.message != null) {
        logger.warning('Payments', pool, rpcTracking);
        logger.error('Payments', pool, `Error sending payments ${ JSON.stringify(result.error)}`);
        callback(true, []);
        return;
      } else if (result.error) {
        logger.warning('Payments', pool, rpcTracking);
        logger.error('Payments', pool, `Error sending payments ${ JSON.stringify(result.error)}`);
        callback(true, []);
        return;
      }

      // Handle Returned Transaction ID
      if (result.response) {
        const transaction = result.response;
        const currentDate = Date.now();
        const payments = {
          time: currentDate,
          paid: totalSent,
          miners: Object.keys(amounts).length,
          transaction: transaction,
        };

        // Update Redis Database with Payment Record
        logger.special('Payments', pool, `Sent ${ totalSent } ${ processingConfig.coin.symbol } to ${ Object.keys(amounts).length } workers, txid: ${ transaction }`);
        commands.push(['zadd', `${ pool }:payments:${ blockType }:records`, dateNow / 1000 | 0, JSON.stringify(payments)]);
        callback(null, [rounds, workers, commands]);
        return;

      // Invalid/No Transaction ID
      } else {
        logger.error('Payments', pool, 'RPC command did not return txid. Disabling payments to prevent possible double-payouts');
        callback(true, []);
        return;
      }
    });
  };

  // Structure and Apply Redis Updates
  /* istanbul ignore next */
  this.handleUpdates = function(config, category, blockType, interval, data, callback) {

    let totalPaid = 0;
    let commands = data[2] || [];

    const rounds = data[0];
    const workers = data[1];
    const pool = config.name;
    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;

    // Update Worker Payouts/Balances
    Object.keys(workers).forEach((address) => {
      const worker = workers[address];

      // Manage Worker Commands [1]
      if (category === 'payments') {
        if (worker.sent > 0) {
          const sent = utils.coinsRound(worker.sent, processingConfig.payments.coinPrecision);
          totalPaid = utils.coinsRound(totalPaid + worker.sent, processingConfig.payments.coinPrecision);
          commands.push(['hincrbyfloat', `${ pool }:payments:${ blockType }:paid`, address, sent]);
          commands.push(['hset', `${ pool }:payments:${ blockType }:balances`, address, 0]);
          commands.push(['hset', `${ pool }:payments:${ blockType }:generate`, address, 0]);
        } else if (worker.change > 0) {
          worker.change = utils.satoshisToCoins(worker.change, processingConfig.payments.magnitude, processingConfig.payments.coinPrecision);
          const change = utils.coinsRound(worker.change, processingConfig.payments.coinPrecision);
          commands.push(['hset', `${ pool }:payments:${ blockType }:balances`, address, change]);
          commands.push(['hset', `${ pool }:payments:${ blockType }:generate`, address, 0]);
        }
      } else {
        if (worker.generate > 0) {
          worker.generate = utils.satoshisToCoins(worker.generate, processingConfig.payments.magnitude, processingConfig.payments.coinPrecision);
          const generate = utils.coinsRound(worker.generate, processingConfig.payments.coinPrecision);
          commands.push(['hset', `${ pool }:payments:${ blockType }:generate`, address, generate]);
        } else {
          commands.push(['hset', `${ pool }:payments:${ blockType }:generate`, address, 0]);
        }
      }

      // Manage Worker Commands [2]
      if (worker.immature > 0) {
        worker.immature = utils.satoshisToCoins(worker.immature, processingConfig.payments.magnitude, processingConfig.payments.coinPrecision);
        const immature = utils.coinsRound(worker.immature, processingConfig.payments.coinPrecision);
        commands.push(['hset', `${ pool }:payments:${ blockType }:immature`, address, immature]);
      } else {
        commands.push(['hset', `${ pool }:payments:${ blockType }:immature`, address, 0]);
      }
    });

    // Update Worker Shares
    const deleteCurrent = function(round, pool, blockType) {
      return [
        ['del', `${ pool }:rounds:${ blockType }:round-${ round.height }:counts`],
        ['del', `${ pool }:rounds:${ blockType }:round-${ round.height }:shares`]];
    };

    // Update Round Shares/Times
    rounds.forEach((round) => {
      switch (round.category) {
      case 'kicked':
      case 'orphan':
        commands.push(['smove', `${ pool }:blocks:${ blockType }:pending`, `${ pool }:blocks:${ blockType }:kicked`, round.serialized]);
        if (round.delete) {
          _this.handleOrphans(round, pool, blockType, (error, results) => {
            commands = commands.concat(results);
            commands = commands.concat(deleteCurrent(round, pool, blockType));
          });
        }
        break;
      case 'immature':
        break;
      case 'generate':
        if (category === 'payments') {
          commands.push(['smove', `${ pool }:blocks:${ blockType }:pending`, `${ pool }:blocks:${ blockType }:confirmed`, round.serialized]);
          commands = commands.concat(deleteCurrent(round, pool, blockType));
        }
        break;
      }
    });

    // Update Miscellaneous Statistics
    if ((category === 'start') || (category === 'payments')) {
      const nextInterval = interval + (processingConfig.payments.paymentInterval * 1000);
      commands.push(['hincrbyfloat', `${ pool }:payments:${ blockType }:counts`, 'total', totalPaid]);
      commands.push(['hset', `${ pool }:payments:${ blockType }:counts`, 'last', interval]);
      commands.push(['hset', `${ pool }:payments:${ blockType }:counts`, 'next', nextInterval]);
    }

    // Manage Redis Commands
    _this.client.multi(commands).exec((error,) => {
      if (error) {
        logger.error('Payments', pool, `Payments sent but could not update redis: ${
          JSON.stringify(error) }. Disabling payment processing to prevent double-payouts. The commands in ${
          pool.toLowerCase() }_commands.txt must be ran manually`);
        fs.writeFile(`${ pool.toLowerCase() }_commands.txt`, JSON.stringify(commands), () => {
          logger.error('Could not write output commands.txt, stop the program immediately.');
        });
        callback(true, []);
        return;
      }
      callback(null, commands);
    });
  };

  // Process Main Payment Checks
  /* istanbul ignore next */
  this.processChecks = function(daemon, config, category, blockType, interval, callbackMain) {

    // Process Checks Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, blockType, callback),
      (data, callback) => _this.handleWorkers(config, blockType, data, callback),
      (data, callback) => _this.handleTransactions(daemon, config, blockType, data, callback),
      (data, callback) => _this.handleShares(config, blockType, data, callback),
      (data, callback) => _this.handleRewards(config, category, blockType, data, callback),
      (data, callback) => _this.handleUpdates(config, category, blockType, interval, data, callback),
    ], (error) => {
      if (error) {
        callbackMain(null, false);
        return;
      }
      callbackMain(null, true);
    });
  };

  // Process Main Payment Functionality
  /* istanbul ignore next */
  this.processPayments = function(daemon, config, category, blockType, interval, callbackMain) {

    // Process Payments Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, blockType, callback),
      (data, callback) => _this.handleWorkers(config, blockType, data, callback),
      (data, callback) => _this.handleTransactions(daemon, config, blockType, data, callback),
      (data, callback) => _this.handleShares(config, blockType, data, callback),
      (data, callback) => _this.handleOwed(daemon, config, category, blockType, data, callback),
      (data, callback) => _this.handleRewards(config, category, blockType, data, callback),
      (data, callback) => _this.handleSending(daemon, config, blockType, data, callback),
      (data, callback) => _this.handleUpdates(config, category, blockType, interval, data, callback),
    ], (error) => {
      if (error) {
        callbackMain(null, false);
        return;
      }
      const pool = config.name;
      logger.debug('Payments', pool, 'Finished payment processing management and attempted to send out payments.');
      callbackMain(null, true);
    });
  };

  // Start Interval Initialization
  /* istanbul ignore next */
  this.handleIntervals = function(daemon, config, blockType) {

    const processingConfig = blockType === 'primary' ? config.primary : config.auxiliary;

    // Handle Main Payment Checks
    const checkInterval = setInterval(() => {
      _this.processChecks(daemon, config, 'checks', blockType, Date.now(), (error) => {
        if (error) {
          clearInterval(checkInterval);
          throw new Error(error);
        }
      });
    }, processingConfig.payments.checkInterval * 1000);

    // Handle Main Payment Functionality
    const paymentInterval = setInterval(() => {
      _this.processPayments(daemon, config, 'payments', blockType, Date.now(), (error) => {
        if (error) {
          clearInterval(paymentInterval);
          throw new Error(error);
        }
      });
    }, processingConfig.payments.paymentInterval * 1000);

    // Start Payment Functionality with Initial Check
    setTimeout(() => {
      _this.processChecks(daemon, config, 'start', blockType, Date.now(), (error) => {
        if (error) {
          throw new Error(error);
        }
      });
    }, 100);
  };

  // Start Payment Interval Management
  /* istanbul ignore next */
  this.handleManagement = function(data) {

    const daemons = data[0];
    const config = data[1];

    // Setup Intervals for Individual Chains
    if (daemons && daemons.length >= 1) {
      _this.handleIntervals(daemons[0], config, 'primary');
      if (config.auxiliary && config.auxiliary.payments && config.auxiliary.payments.enabled && daemons.length > 1) {
        _this.handleIntervals(daemons[1], config, 'auxiliary');
      }
    }
  };

  // Handle Primary Payment Processing
  /* istanbul ignore next */
  this.handlePrimary = function(pool, callbackMain) {

    const config = _this.poolConfigs[pool];
    config.primary.payments.processingFee = parseFloat(config.primary.payments.transactionFee) || parseFloat(0.0004);
    config.primary.payments.minConfirmations = Math.max((config.primary.payments.minConfirmations || 10), 1);

    // Build Primary Daemon
    const handler = (severity, results) => logger[severity]('Payments', pool, results);
    const daemon = new Stratum.daemon([config.primary.payments.daemon], handler);

    // Warn if < Recommended Config
    if (config.primary.payments.minConfirmations < 3) {
      logger.warning('Payments', pool, 'The recommended number of confirmations (primary) is >= 3.');
    }

    // Handle Initial Validation
    async.parallel([
      (callback) => _this.handleAddress(daemon, config.primary.address, pool, callback),
      (callback) => _this.handleBalance(daemon, config, pool, 'primary', callback),
    ], (error, results) => {
      if (error) {
        callbackMain(null, false);
      } else {
        config.primary.payments.magnitude = results[1][0];
        config.primary.payments.minPaymentSatoshis = results[1][1];
        config.primary.payments.coinPrecision = results[1][2];
        callbackMain(null, [[daemon], config]);
      }
    });
  };

  // Handle Auxiliary Payment Processing
  /* istanbul ignore next */
  this.handleAuxiliary = function(pool, data, callbackMain) {

    const config = data[1];
    if (config && config.auxiliary && config.auxiliary.enabled) {
      config.auxiliary.payments.processingFee = parseFloat(config.auxiliary.payments.transactionFee) || parseFloat(0.0004);
      config.auxiliary.payments.minConfirmations = Math.max((config.auxiliary.payments.minConfirmations || 10), 1);

      // Build Auxiliary Daemon
      const handler = (severity, results) => logger[severity]('Payments', pool, results);
      const daemon = new Stratum.daemon([config.auxiliary.payments.daemon], handler);

      // Warn if < Recommended Config
      if (config.auxiliary.payments.minConfirmations < 3) {
        logger.warning('Payments', pool, 'The recommended number of confirmations (auxiliary) is >= 3.');
      }

      // Handle Initial Validation
      async.parallel([
        (callback) => _this.handleBalance(daemon, config, pool, 'auxiliary', callback),
      ], (error, results) => {
        if (error) {
          callbackMain(null, [data[0], config]);
        } else {
          data[0].push(daemon);
          config.auxiliary.payments.magnitude = results[0][0];
          config.auxiliary.payments.minPaymentSatoshis = results[0][1];
          config.auxiliary.payments.coinPrecision = results[0][2];
          callbackMain(null, [data[0], config]);
        }
      });
    } else {
      callbackMain(null, [data[0], config]);
    }
  };

  // Handle Payment Processing for Enabled Pools
  /* istanbul ignore next */
  this.handlePayments = function(pool, callbackMain) {
    async.waterfall([
      (callback) => _this.handlePrimary(pool, callback),
      (data, callback) => _this.handleAuxiliary(pool, data, callback)
    ], (error, results) => {
      if (error) {
        callbackMain(null, false);
      } else {
        _this.handleManagement(results);
      }
    });
  };

  // Output Derived Payment Information
  this.outputPaymentInfo = function(pools) {
    pools.forEach((pool) => {
      const poolOptions = _this.poolConfigs[pool];
      const processingConfig = poolOptions.primary.payments;
      logger.debug('Payments', pool, `Payment processing setup to run every ${
        processingConfig.paymentInterval } second(s) with daemon (${
        processingConfig.daemon.username }@${ processingConfig.daemon.host }:${
        processingConfig.daemon.port }) and redis (${ _this.portalConfig.redis.host }:${
        _this.portalConfig.redis.port })`
      );
    });
  };

  // Start Worker Capabilities
  /* istanbul ignore next */
  this.setupPayments = function(callback) {
    _this.checkEnabled();
    async.filter(_this.pools, _this.handlePayments, (error, results) => {
      _this.outputPaymentInfo(results);
      callback();
    });
  };
};

module.exports = PoolPayments;
