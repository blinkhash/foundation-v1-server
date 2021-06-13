/*
 *
 * Payments (Updated)
 *
 */

const fs = require('fs');
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
        callback(null);
      }
    }, true);
  };

  // Ensure Payment Address is Valid for Daemon
  this.handleAddress = function(daemon, address, coin, callback) {
    _this.checkAddress(daemon, address, coin, 'validateaddress', (error,) => {
      if (error) {
        _this.checkAddress(daemon, address, coin, 'getaddressinfo', (error, results) => {
          if (error) {
            logger.error('Payments', coin, `Error with payment processing daemon: ${ results }`);
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
  this.handleBalance = function(daemon, config, coin, callback) {
    const processingConfig = config.payments;
    daemon.cmd('getbalance', [], (result) => {
      if (result.error) {
        logger.error('Payments', coin, `Error with payment processing daemon: ${ JSON.stringify(result.error) }`);
        callback(true, []);
      }
      try {
        const data = result.data.split('result":')[1].split(',')[0].split('.')[1];
        const magnitude = parseInt(`10${ new Array(data.length).join('0') }`);
        const minSatoshis = parseInt(processingConfig.minPayment * magnitude);
        const coinPrecision = magnitude.toString().length - 1;
        callback(null, [magnitude, minSatoshis, coinPrecision]);
      } catch(e) {
        logger.error('Payments', coin, `Error detecting number of satoshis in a coin. Tried parsing: ${ result.data }`);
        callback(true, []);
      }
    }, true, true);
  };

  // Handle Shares of Orphan Blocks
  this.handleOrphans = function(round, coin, callback) {
    const commands = [];
    const dateNow = Date.now();
    if (typeof round.orphanShares !== 'undefined') {
      logger.warning('Payments', coin, `Moving shares/times from orphaned block ${ round.height } to current round.`);

      // Move Orphaned Shares to Following Round
      Object.keys(round.orphanShares).forEach((address) => {
        const outputShare = {
          time: dateNow,
          worker: address,
          solo: false,
          difficulty: round.orphanShares[address],
        };
        commands.push(['hincrby', `${ coin }:rounds:current:counts`, 'valid', 1]);
        commands.push(['hincrby', `${ coin }:rounds:current:shares`, JSON.stringify(outputShare), round.orphanShares[address]]);
      });

      // Move Orphaned Times to Following Round
      Object.keys(round.orphanTimes).forEach((address) => {
        commands.push(['hincrbyfloat', `${ coin }:rounds:current:times`, address, round.orphanTimes[address]]);
      });
    }

    callback(null, commands);
  };

  // Calculate Unspent Balance in Daemon
  this.handleUnspent = function(daemon, config, category, coin, callback) {
    const args = [config.payments.minConfirmations, 99999999];
    daemon.cmd('listunspent', args, (result) => {
      if (!result || result[0].error) {
        logger.error('Payments', coin, `Error with payment processing daemon: ${ JSON.stringify(result[0].error) }`);
        callback(true, []);
      } else {
        let balance = parseFloat(0);
        if (result[0].response != null && result[0].response.length > 0) {
          result[0].response.forEach((instance) => {
            if (instance.address && instance.address !== null) {
              balance += parseFloat(instance.amount || 0);
            }
          });
          balance = utils.coinsRound(balance, config.payments.coinPrecision);
        }
        if (category === 'start') {
          logger.special('Payments', coin, `Payment wallet has a balance of ${ balance } ${ config.coin.symbol }`);
        }
        callback(null, [utils.coinsToSatoshis(balance, config.payments.magnitude)]);
      }
    });
  };

  // Handle Duplicate Blocks/Rounds
  /* istanbul ignore next */
  this.handleDuplicates = function(daemon, coin, rounds, callback) {

    const validBlocks = {};
    const invalidBlocks = [];

    const duplicates = rounds.filter((round) => round.duplicate);
    const commands = duplicates.map((round) => ['getblock', [round.hash]]);
    rounds = rounds.filter((round) => !round.duplicate);

    // Query Daemon Regarding Duplicate Blocks
    daemon.batchCmd(commands, (error, blocks) => {
      if (error || !blocks) {
        logger.error('Payments', coin, `Could not get blocks from daemon: ${ JSON.stringify(error) }`);
        callback(true, []);
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
            callback(true, []);
            return;
          }
          callback(null, [rounds]);
        });
      } else {
        callback(null, [rounds]);
      }
    }, true, true);
  };

  // Handle Workers for Immature Blocks
  this.handleImmature = function(config, round, workers, times, maxTime, solo, shared, callback) {

    let totalShares = parseFloat(0);
    const feeSatoshi = utils.coinsToSatoshis(config.payments.processingFee, config.payments.magnitude);
    const immature = Math.round(utils.coinsToSatoshis(round.reward, config.payments.magnitude)) - feeSatoshi;

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
  this.handleGenerate = function(config, round, workers, times, maxTime, solo, shared, callback) {

    let totalShares = parseFloat(0);
    const feeSatoshi = utils.coinsToSatoshis(config.payments.processingFee, config.payments.magnitude);
    const generate = Math.round(utils.coinsToSatoshis(round.reward, config.payments.magnitude)) - feeSatoshi;

    // Handle Solo Rounds
    if (round.solo) {
      const worker = workers[round.worker] || {};
      worker.shares = worker.shares || {};
      const shares = parseFloat(solo[round.worker] || 1);
      const total = Math.round(generate);
      worker.records = worker.records || {};
      worker.records[round.height] = {
        amounts: utils.satoshisToCoins(total, config.payments.magnitude, config.payments.coinPrecision),
        shares: shares,
        times: 1,
      };
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
        worker.records = worker.records || {};
        worker.records[round.height] = {};
        if (times[address] != null && parseFloat(times[address]) > 0) {
          const timePeriod = utils.roundTo((parseFloat(times[address]) / maxTime), 2);
          worker.records[round.height].times = parseFloat(times[address]);
          if (timePeriod > 0 && timePeriod < 0.51) {
            const lost = shares * (1 - timePeriod);
            shares = utils.roundTo(Math.max(shares - lost, 0), 2);
          }
        }
        totalShares += shares;
        worker.shares.round = shares;
        worker.shares.total = parseFloat(worker.shares.total || 0) + shares;
        worker.records[round.height].times = worker.records[round.height].times || 1;
        worker.records[round.height].shares = shares;
        workers[address] = worker;
      });

      // Calculate Final Block Rewards
      Object.keys(shared).forEach((address) => {
        const worker = workers[address];
        const percent = parseFloat(worker.shares.round) / totalShares;
        const total = Math.round(generate * percent);
        worker.records[round.height].amounts = utils.satoshisToCoins(total, config.payments.magnitude, config.payments.coinPrecision);
        worker.generate = (worker.generate || 0) + total;
        workers[address] = worker;
      });
    }

    // Return Updated Workers as Callback
    callback(null, [workers]);
  };

  // Check Blocks for Duplicates/Issues
  /* istanbul ignore next */
  this.handleBlocks = function(daemon, config, callback) {

    // Load Blocks from Database
    const coin = config.coin.name;
    const commands = [['smembers', `${ coin }:blocks:pending`]];
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not get blocks from database: ${ JSON.stringify(error) }`);
        callback(true, []);
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
      rounds.forEach((round) => {
        if (utils.countOccurences(roundHeights, round.height) > 1) {
          round.duplicate = true;
          duplicateFound = true;
        }
      });

      // Handle Duplicate Blocks
      if (duplicateFound) {
        _this.handleDuplicates(daemon, coin, rounds, callback);
      } else {
        callback(null, [rounds, {}]);
      }
    });
  };

  // Validate Transaction Hashes
  this.handleTransactions = function(daemon, config, data, callback) {

    // Get Hashes for Each Transaction
    let rounds = data[0];
    const coin = config.coin.name;
    const commands = rounds.map((round) => ['gettransaction', [round.transaction]]);

    // Query Daemon Regarding Transactions
    daemon.batchCmd(commands, (error, transactions) => {
      if (error || !transactions) {
        logger.error('Payments', coin, `Could not get transactions from daemon: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Handle Individual Transactions
      transactions.forEach((tx, idx) => {

        // Check Daemon Edge Cases
        const round = rounds[idx];
        if (tx.error && tx.error.code === -5) {
          logger.warning('Payments', coin, `Daemon reports invalid transaction: ${ round.transaction }`);
          round.category = 'kicked';
          return;
        } else if (tx.error || !tx.result) {
          logger.error('Payments', coin, `Unable to load transaction: ${ round.transaction } ${ JSON.stringify(tx)}`);
          return;
        } else if (!tx.result.details || (tx.result.details && tx.result.details.length === 0)) {
          logger.warning('Payments', coin, `Daemon reports no details for transaction: ${ round.transaction }`);
          round.category = 'kicked';
          return;
        }

        // Load Transaction Details
        let generationTx = tx.result.details.filter((tx) => {
          let txAddr = tx.address;
          if (txAddr.indexOf(':') > -1) {
            txAddr = txAddr.split(':')[1];
          }
          return txAddr === config.address;
        })[0];

        // Check Transaction Edge Cases
        if (!generationTx && tx.result.details.length === 1) {
          generationTx = tx.result.details[0];
        }
        if (!generationTx) {
          logger.error('Payments', coin, `Unable to load pool address details: ${ round.transaction }`);
          return;
        }

        // Update Round Details
        round.category = generationTx.category;
        round.confirmations = parseInt(tx.result.confirmations);
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

  // Calculate Scores from Round Data
  /* istanbul ignore next */
  this.handleTimes = function(config, data, callback) {

    const times = [];
    const coin = config.coin.name;
    const commands = data[0].map((round) => {
      return ['hgetall', `${ coin }:rounds:round-${ round.height }:times`];
    });

    // Build Commands from Rounds
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not load times data from database: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Build Worker Times Data w/ Results
      results.forEach((round) => {
        const timesRound = {};
        Object.keys(round).forEach((entry) => {
          const addr = entry.split(".")[0];
          if (addr in timesRound) {
            if (parseFloat(round[entry]) >= timesRound[addr]) {
              timesRound[addr] = parseFloat(round[entry]);              
            }
          } else {
            timesRound[addr] = parseFloat(round[entry]);
          }
        });
        times.push(timesRound);
      });

      // Return Times Data as Callback
      callback(null, [data[0], data[1], times]);
    });
  };

  // Calculate Shares from Round Data
  /* istanbul ignore next */
  this.handleShares = function(config, data, callback) {

    const solo = [];
    const shared = [];
    const coin = config.coin.name;
    const commands = data[0].map((round) => {
      return ['hgetall', `${ coin }:rounds:round-${ round.height }:shares`];
    });

    // Build Commands from Rounds
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not load shares data from database: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Build Worker Shares Data w/ Results
      results.forEach((round) => {
        const soloRound = {};
        const sharedRound = {};
        Object.keys(round).forEach((entry) => {
          const details = JSON.parse(entry);
          const addr = details.worker.split(".")[0];
          if (details.solo) {
            if (addr in soloRound) {
              soloRound[addr] += parseFloat(round[entry]);
            } else {
              soloRound[addr] = parseFloat(round[entry]);
            }
          } else {
            if (addr in sharedRound) {
              sharedRound[addr] += parseFloat(round[entry]);
            } else {
              sharedRound[addr] = parseFloat(round[entry]);
            }
          }
        });
        solo.push(soloRound);
        shared.push(sharedRound);
      });

      // Return Times Data as Callback
      callback(null, [data[0], data[1], data[2], solo, shared]);
    });
  };

  // Calculate Amount Owed to Workers
  this.handleOwed = function(daemon, config, category, data, callback) {

    let totalOwed = parseInt(0);
    const rounds = data[0];
    const coin = config.coin.name;
    const feeSatoshi = utils.coinsToSatoshis(config.payments.processingFee, config.payments.magnitude);

    // Add to Total Owed from Rounds
    rounds.forEach((round) => {
      if (round.category === 'generate') {
        totalOwed += utils.coinsToSatoshis(round.reward, config.payments.magnitude) - feeSatoshi;
      }
    });

    // Add to Total Owed from Unpaid
    Object.keys(data[1]).forEach((worker) => {
      totalOwed += worker.balance || 0;
    });

    // Check Unspent Balance
    _this.handleUnspent(daemon, config, category, coin, (error, balance) => {
      if (error) {
        logger.error('Payments', coin, 'Error checking pool balance before processing payments.');
        callback(true, []);
        return;
      }

      // Check Balance for Payments
      if (balance[0] < totalOwed) {
        const currentBalance = utils.satoshisToCoins(balance[0], config.payments.magnitude, config.payments.coinPrecision);
        const owedBalance = utils.satoshisToCoins(totalOwed, config.payments.magnitude, config.payments.coinPrecision);
        logger.error('Payments', coin, `Insufficient funds (${ currentBalance }) to process payments (${ owedBalance }), possibly waiting for transactions.`);
      }

      // Return Payment Data as Callback
      callback(null, [rounds, data[1], data[2], data[3], data[4]]);
    });
  };

  // Calculate Scores Given Times/Shares
  this.handleRewards = function(config, data, callback) {

    let workers = data[1];
    const rounds = data[0];
    const coin = config.coin.name;

    // Manage Shares in each Round
    rounds.forEach((round, i) => {

      let maxTime = 0;
      const times = data[2][i];
      const solo = data[3][i];
      const shared = data[4][i];

      // Check if Shares Exist in Round
      if ((Object.keys(solo).length <= 0) && (Object.keys(shared).length <= 0)) {
        _this.client.smove(`${ coin }:blocks:pending`, `${coin }:blocks:manual`, round.serialized);
        logger.error('Payments', coin, `No worker shares for round: ${ round.height }, hash: ${ round.hash }. Manual payout required.`);
        return;
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
        _this.handleImmature(config, round, workers, times, maxTime, solo, shared, (error, results) => {
          workers = results[0];
        });
        break;
      case 'generate':
        _this.handleGenerate(config, round, workers, times, maxTime, solo, shared, (error, results) => {
          workers = results[0];
        });
        break;
      }
    });

    // Return Updated Rounds/Workers as Callback
    callback(null, [rounds, workers]);
  };

  // Send Payments if Applicable
  this.handleSending = function(daemon, config, data, callback) {

    let totalSent = 0;
    const amounts = {};
    const records = {};
    const commands = [];

    const rounds = data[0];
    const workers = data[1];
    const coin = config.coin.name;

    // Calculate Amount to Send to Workers
    Object.keys(workers).forEach((address) => {
      const worker = workers[address];
      const amount = Math.round(worker.balance || 0 + worker.generate || 0);

      // Determine Amounts Given Mininum Payment
      if (amount >= config.payments.minPaymentSatoshis) {
        worker.sent = utils.satoshisToCoins(amount, config.payments.magnitude, config.payments.coinPrecision);
        amounts[address] = utils.coinsRound(worker.sent, config.payments.coinPrecision);
        totalSent += worker.sent;
      }
      workers[address] = worker;
    });

    // Check if No Workers/Rounds
    if (Object.keys(amounts).length === 0) {
      callback(null, [rounds, workers]);
      return;
    }

    // Generate Records for Each Round Paid
    const roundsPaid = rounds.filter((round) => round.category === 'generate');
    roundsPaid.forEach((round) => {
      const roundRecords = {};
      Object.keys(workers).forEach((address) => {
        const worker = workers[address];
        if (worker.records && round.height in worker.records) {
          roundRecords[address] = worker.records[round.height];
        }
      });
      records[round.height] = roundRecords;
    });

    // Send Payments to Workers Through Daemon
    const rpcTracking = `sendmany "" ${ JSON.stringify(amounts)}`;
    daemon.cmd('sendmany', ['', amounts], (result) => {

      // Check Error Edge Cases
      const output = result[0];
      if (output.error && output.error.code === -5) {
        logger.warning('Payments', coin, rpcTracking);
        logger.error('Payments', coin, `Error sending payments ${ JSON.stringify(output.error)}`);
        callback(true, []);
        return;
      } else if (output.error && output.error.code === -6) {
        logger.warning('Payments', coin, rpcTracking);
        logger.error('Payments', coin, `Insufficient funds for payments: ${ JSON.stringify(output.error)}`);
        callback(true, []);
        return;
      } else if (output.error && output.error.message != null) {
        logger.warning('Payments', coin, rpcTracking);
        logger.error('Payments', coin, `Error sending payments ${ JSON.stringify(output.error)}`);
        callback(true, []);
        return;
      } else if (output.error) {
        logger.warning('Payments', coin, rpcTracking);
        logger.error('Payments', coin, `Error sending payments ${ JSON.stringify(output.error)}`);
        callback(true, []);
        return;
      }

      // Handle Returned Transaction ID
      if (output.response) {
        const transaction = output.response;
        const currentDate = Date.now();
        const payments = {
          time: currentDate,
          paid: totalSent,
          transaction: transaction,
          records: records,
        };

        // Update Redis Database with Payment Record
        logger.special('Payments', coin, `Sent ${ totalSent } ${ config.coin.symbol } to ${ Object.keys(amounts).length } workers, txid: ${ transaction }`);
        commands.push(['zadd', `${ coin }:payments:records`, Date.now(), JSON.stringify(payments)]);
        callback(null, [rounds, workers, commands]);
        return;

      // Invalid/No Transaction ID
      } else {
        logger.error('Payments', coin, 'RPC command did not return txid. Disabling payments to prevent possible double-payouts');
        callback(true, []);
        return;
      }
    });
  };

  // Structure and Apply Redis Updates
  /* istanbul ignore next */
  this.handleUpdates = function(config, category, interval, data, callback) {

    let commands = data[2] || [];
    let totalPaid = 0;
    const rounds = data[0];
    const workers = data[1];
    const coin = config.coin.name;

    // Update Worker Payouts/Balances
    Object.keys(workers).forEach((address) => {
      const worker = workers[address];

      // Manage Worker Commands [1]
      if (category === 'payments') {
        if (worker.sent > 0) {
          const sent = utils.coinsRound(worker.sent, config.payments.coinPrecision);
          totalPaid = utils.coinsRound(totalPaid + worker.sent, config.payments.coinPrecision);
          commands.push(['hincrbyfloat', `${ coin }:payments:paid`, address, sent]);
          commands.push(['hset', `${ coin }:payments:generate`, address, 0]);
        }
      } else {
        if (worker.generate > 0) {
          worker.generate = utils.satoshisToCoins(worker.generate, config.payments.magnitude, config.payments.coinPrecision);
          const generate = utils.coinsRound(worker.generate, config.payments.coinPrecision);
          commands.push(['hset', `${ coin }:payments:generate`, address, generate]);
        } else {
          commands.push(['hset', `${ coin }:payments:generate`, address, 0]);
        }
      }

      // Manage Worker Commands [2]
      if (worker.immature > 0) {
        worker.immature = utils.satoshisToCoins(worker.immature, config.payments.magnitude, config.payments.coinPrecision);
        const immature = utils.coinsRound(worker.immature, config.payments.coinPrecision);
        commands.push(['hset', `${ coin }:payments:immature`, address, immature]);
      } else {
        commands.push(['hset', `${ coin }:payments:immature`, address, 0]);
      }
    });

    // Update Worker Shares
    const deleteCurrent = function(coin, round) {
      return [
        ['del', `${ coin }:rounds:round-${ round.height }:counts`],
        ['del', `${ coin }:rounds:round-${ round.height }:shares`],
        ['del', `${ coin }:rounds:round-${ round.height }:submissions`],
        ['del', `${ coin }:rounds:round-${ round.height }:times`]];
    };

    // Update Round Shares/Times
    rounds.forEach((round) => {
      switch (round.category) {
      case 'kicked':
      case 'orphan':
        commands.push(['smove', `${ coin }:blocks:pending`, `${ coin }:blocks:kicked`, round.serialized]);
        if (round.delete) {
          _this.handleOrphans(round, coin, (error, results) => {
            commands = commands.concat(results);
            commands = commands.concat(deleteCurrent(coin, round));
          });
        }
        break;
      case 'immature':
        break;
      case 'generate':
        if (category === 'payments') {
          commands.push(['smove', `${ coin }:blocks:pending`, `${ coin }:blocks:confirmed`, round.serialized]);
          commands = commands.concat(deleteCurrent(coin, round));
        }
        break;
      }
    });

    // Update Miscellaneous Statistics
    if ((category === 'start') || (category === 'payments')) {
      commands.push(['hincrbyfloat', `${ coin }:payments:counts`, 'totalPaid', totalPaid]);
      commands.push(['hset', `${ coin }:payments:counts`, 'lastPaid', interval]);
    }

    // Manage Redis Commands
    _this.client.multi(commands).exec((error,) => {
      if (error) {
        logger.error('Payments', coin, `Payments sent but could not update redis: ${
          JSON.stringify(error) }. Disabling payment processing to prevent double-payouts. The commands in ${
          coin.toLowerCase() }_commands.txt must be ran manually`);
        fs.writeFile(`${ coin.toLowerCase() }_commands.txt`, JSON.stringify(commands), () => {
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
  this.processChecks = function(daemon, config, category, interval, callbackMain) {

    // Process Checks Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, callback),
      (data, callback) => _this.handleTransactions(daemon, config, data, callback),
      (data, callback) => _this.handleTimes(config, data, callback),
      (data, callback) => _this.handleShares(config, data, callback),
      (data, callback) => _this.handleOwed(daemon, config, category, data, callback),
      (data, callback) => _this.handleRewards(config, data, callback),
      (data, callback) => _this.handleUpdates(config, category, interval, data, callback),
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
  this.processPayments = function(daemon, config, category, interval, callbackMain) {

    // Process Payments Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, callback),
      (data, callback) => _this.handleTransactions(daemon, config, data, callback),
      (data, callback) => _this.handleTimes(config, data, callback),
      (data, callback) => _this.handleShares(config, data, callback),
      (data, callback) => _this.handleOwed(daemon, config, category, data, callback),
      (data, callback) => _this.handleRewards(config, data, callback),
      (data, callback) => _this.handleSending(daemon, config, data, callback),
      (data, callback) => _this.handleUpdates(config, category, interval, data, callback),
    ], (error) => {
      if (error) {
        callbackMain(null, false);
        return;
      }
      const coin = config.coin.name;
      logger.debug('Payments', coin, 'Finished payment processing management and attempted to send out payments.');
      callbackMain(null, true);
    });
  };

  // Start Payment Interval Management
  /* istanbul ignore next */
  this.handleIntervals = function(daemon, config, callback) {

    // Handle Main Payment Checks
    const checkInterval = setInterval(() => {
      _this.processChecks(daemon, config, 'checks', Date.now(), (error) => {
        if (error) {
          clearInterval(checkInterval);
          throw new Error(error);
        }
      });
    }, config.payments.checkInterval * 1000);

    // Handle Main Payment Functionality
    const paymentInterval = setInterval(() => {
      _this.processPayments(daemon, config, 'payments', Date.now(), (error) => {
        if (error) {
          clearInterval(paymentInterval);
          throw new Error(error);
        }
      });
    }, config.payments.paymentInterval * 1000);

    // Start Payment Functionality with Initial Check
    setTimeout(() => {
      _this.processChecks(daemon, config, 'start', Date.now(), (error, results) => {
        if (error) {
          callback(error, results);
          return;
        }
        callback(error, results);
      });
    }, 100);
  };

  // Handle Payment Processing for Enabled Pools
  /* istanbul ignore next */
  this.handlePayments = function(coin, callbackMain) {

    const poolConfig = _this.poolConfigs[coin];
    poolConfig.payments.processingFee = parseFloat(poolConfig.coin.txfee) || parseFloat(0.0004);
    poolConfig.payments.minConfirmations = Math.max((poolConfig.payments.minConfirmations || 10), 1);
    const daemon = new Stratum.daemon([poolConfig.payments.daemon], (severity, results) => {
      logger[severity]('Payments', coin, results);
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
        callbackMain(null, false);
      } else {
        poolConfig.payments.magnitude = results[1][0];
        poolConfig.payments.minPaymentSatoshis = results[1][1];
        poolConfig.payments.coinPrecision = results[1][2];
        _this.handleIntervals(daemon, poolConfig, callbackMain);
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
  /* istanbul ignore next */
  this.setupPayments = function(callback) {
    _this.checkEnabled();
    async.filter(_this.coins, _this.handlePayments, (error, results) => {
      _this.outputPaymentInfo(results);
      callback();
    });
  };
};

module.exports = PoolPayments;
