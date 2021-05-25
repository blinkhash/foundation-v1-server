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
        return;
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
  this.handleOrphans = function(commands, round, coin, callback) {
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
        commands.push(['hincrby', `${ coin }:rounds:current:shares:counts`, 'validShares', 1]);
        commands.push(['hincrby', `${ coin }:rounds:current:shares:values`, JSON.stringify(outputShare), round.orphanShares[address]]);
        commands.push(['zadd', `${ coin }:rounds:current:shares:records`, dateNow / 1000 | 0, JSON.stringify(outputShare)]);
      });

      // Move Orphaned Times to Following Round
      Object.keys(round.orphanTimes).forEach((address) => {
        commands.push(['hincrbyfloat', `${ coin }:rounds:current:times:values`, address, round.orphanTimes[address]]);
      });
    }

    callback(null, [commands]);
  }

  // Calculate Unspent Balance in Daemon
  this.handleUnspent = function(daemon, config, category, coin, callback) {
    const args = [config.payments.minConfirmations, 99999999];
    daemon.cmd('listunspent', args, (result) => {
      if (!result || result.error || result[0].error) {
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
        if (category === "start") {
          logger.special('Payments', coin, `Payment wallet has a balance of ${ balance } ${ config.coin.symbol }`);
        }
        callback(null, [utils.coinsToSatoshis(balance, config.payments.magnitude)]);
      }
    });
  }

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
            invalidBlocks.push(['smove', `${ coin }:main:blocks:pending`, `${ coin }:main:blocks:duplicate`, duplicates[idx].serialized]);
          } else if (Object.prototype.hasOwnProperty.call(validBlocks, duplicates[idx].hash)) {
            invalidBlocks.push(['smove', `${ coin }:main:blocks:pending`, `${ coin }:main:blocks:duplicate`, duplicates[idx].serialized]);
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
      worker.shares = worker.shares || {}
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
        worker.shares = worker.shares || {}
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
  }

  // Handle Workers for Generate Blocks
  this.handleGenerate = function(config, round, workers, times, maxTime, solo, shared, callback) {

    let totalShares = parseFloat(0);
    const feeSatoshi = utils.coinsToSatoshis(config.payments.processingFee, config.payments.magnitude);
    const generate = Math.round(utils.coinsToSatoshis(round.reward, config.payments.magnitude)) - feeSatoshi;

    // Handle Solo Rounds
    if (round.solo) {
      const worker = workers[round.worker] || {};
      worker.shares = worker.shares || {}
      const shares = parseFloat(solo[round.worker] || 1);
      const total = Math.round(generate);
      worker.records = worker.records || {};
      worker.records[round.height] = {
        amounts: utils.satoshisToCoins(total, config.payments.magnitude, config.payments.coinPrecision),
        shares: shares,
        times: 1,
      }
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
        worker.shares = worker.shares || {}
        worker.records = worker.records || {};
        worker.records[round.height] = {};
        if (times[address] != null && parseFloat(times[address]) > 0) {
          const timePeriod = utils.roundTo((parseFloat(times[address]) / maxTime), 2);
          worker.records[round.height].times = timePeriod;
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
  }

  // Check Blocks for Duplicates/Issues
  this.handleBlocks = function(daemon, config, callback) {

    // Load Blocks from Database
    const coin = config.coin.name;
    const commands = [['zrangebyscore', `${ coin }:main:blocks:pending`, '-inf', 'inf']];
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
        callback(null, [rounds]);
      }
    });
  };

  // Check Workers for Unpaid Balances
  this.handleWorkers = function(config, data, callback) {

    // Load Unpaid Workers from Database
    const coin = config.coin.name;
    const commands = [['hgetall', `${ coin }:main:payments:unpaid`]];
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        logger.error('Payments', coin, `Could not get workers from database: ${ JSON.stringify(error) }`);
        callback(true, []);
        return;
      }

      // Manage Individual Workers
      const workers = {};
      const magnitude = config.payments.magnitude;
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
          round.delete = _this.checkShares(rounds, round);
          return false;
        case 'immature':
        case 'generate':
          return true;
        default:
          return false;
        }
      });

      // Return Rounds as Callback
      callback(null, [rounds, data[1]]);
    });
  };

  // Calculate Scores from Round Data
  this.handleTimes = function(config, data, callback) {

    const times = [];
    const coin = config.coin.name;
    const commands = data[0].map((round) => {
      return [['hgetall', `${ coin }:rounds:round-${ round.height }:times:values`]];
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
      callback(null, [data[0], data[1], times]);
    });
  };

  // Calculate Shares from Round Data
  this.handleShares = function(config, data, callback) {

    const solo = [];
    const shared = [];
    const coin = config.coin.name;
    const commands = data[0].map((round) => {
      return [['hgetall', `${ coin }:rounds:round-${ round.height }:shares:values`]];
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
      callback(null, [data[0], data[1], data[2], solo, shared]);
    });
  };

  // Calculate Amount Owed to Workers
  this.handleOwed = function(daemon, config, category, data, callback) {

    let sendPayments = false;
    let totalOwed = parseInt(0);
    let rounds = data[0];

    const coin = config.coin.name;
    const feeSatoshi = utils.coinsToSatoshis(config.payments.processingFee, config.payments.magnitude);

    // Add to Total Owed from Rounds
    rounds.forEach((round) => {
      if (round.category === 'generate') {
        totalOwed += utils.coinsToSatoshis(round.reward, config.payments.magnitude) - feeSatoshi;
      }
    })

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
        sendPayments = false;
      } else if (balance > totalOwed) {
        sendPayments = true;
      }

      // Payments Aren't Necessary
      if (totalOwed <= 0 || category !== "payments") {
        sendPayments = false;
      }

      // Ensure Payments Aren't Sent Out
      // If Payments Aren't Necessary
      if (!sendPayments) {
        rounds = rounds.filter((r) => {
          switch (r.category) {
          case 'orphan':
          case 'kicked':
          case 'immature':
            return true;
          case 'generate':
            return true;
          default:
            return false;
          }
        });
      }

      // Return Payment Data as Callback
      callback(null, [rounds, data[1], data[2], data[3], data[4]]);
    });
  }

  // Calculate Scores Given Times/Shares
  this.handleRewards = function(config, data, callback) {

    let errors = null;
    const rounds = data[0];
    let workers = data[1];
    const coin = config.coin.name;

    // Manage Shares in each Round
    rounds.forEach((round, i) => {

      let maxTime = 0;
      const times = data[2][i]
      const solo = data[3][i];
      const shared = data[4][i];
      const workerTimes = {};

      // Check if Shares Exist in Round
      if ((Object.keys(solo).length <= 0) && (Object.keys(shared).length <= 0)) {
          _this.client.smove(`${ coin }:main:blocks:pending`, `${coin  }:main:blocks:manual`, round.serialized);
          logger.error('Payments', coin, `No worker shares for round: ${ round.height }, hash: ${ round.hash }. Manual payout required.`);
          callback(true, []);
          return;
      }

      // Find Max Time in ALL Shares
      Object.keys(shared).forEach((address) => {
        const workerTime = parseFloat(shared[address]);
        if (maxTime < workerTime) {
          maxTime = workerTime;
        }
        if (!(address in workerTimes)) {
          workerTimes[address] = workerTime;
        } else {
          const currentTime = workerTimes[address];
          if (currentTime < workerTime) {
            workerTimes[address] = (currentTime * 0.5) + workerTime;
          } else {
            workerTimes[address] = currentTime + (workerTime * 0.5);
          }
          if (currentTime > maxTime) {
            workerTimes[address] = maxTime;
          }
        }
      });

      // Manage Block Generated
      switch (round.category) {
      case 'kicked':
      case 'orphan':
        round.orphanShares = shared;
        round.orphanTimes = times;
        break;
      case 'immature':
        _this.handleImmature(config, round, workers, times, maxTime, solo, shared, (error, results) => {
          if (error) {
            logger.error('Payments', coin, `Error handling immature block for round: ${ round }`);
            callback(true, []);
            return;
          }
          workers = results[0];
        });
        break;
      case 'generate':
        _this.handleGenerate(config, round, workers, times, maxTime, solo, shared, (error, results) => {
          if (error) {
            logger.error('Payments', coin, `Error handling generate block for round: ${ round }`);
            callback(true, []);
            return;
          }
          workers = results[0];
        });
        break;
      }
    });

    // Return Updated Rounds/Workers as Callback
    callback(null, [rounds, workers]);
  }

  // Structure and Apply Redis Updates
  this.handleUpdates = function(config, category, interval, data, callback) {

    let commands = [];
    const totalPaid = 0;
    const rounds = data[0];
    const workers = data[1];
    const coin = config.coin.name;

    // Update Worker Payouts/Balances
    Object.keys(workers).forEach((address) => {
      const worker = workers[address];

      // Manage Worker Commands [1]
      if (category === "payments") {
        if (worker.change !== 0) {
          const change = utils.satoshisToCoins(worker.change, config.payments.magnitude, config.payments.coinPrecision);
          commands.push(['hincrbyfloat', `${ coin }:main:payments:unpaid`, address, change]);
        }
        if ((worker.sent || 0) > 0) {
          const sent = utils.coinsRound(worker.sent, config.payments.coinPrecision);
          totalPaid = utils.coinsRound(totalPaid + worker.sent, config.payments.coinPrecision);
          commands.push(['hincrbyfloat', `${ coin }:main:payments:payouts`, address, sent]);
        }
      }

      // Manage Worker Commands [2]
      if ((worker.immature || 0) > 0) {
        worker.immature = utils.satoshisToCoins(worker.immature, config.payments.magnitude, config.payments.coinPrecision);
        const immature = utils.coinsRound(worker.immature, config.payments.coinPrecision);
        commands.push(['hset', `${ coin }:main:payments:immature`, address, immature]);
      } else {
        commands.push(['hset', `${ coin }:main:payments:immature`, address, 0]);
      }

      // Manage Worker Commands [3]
      if ((worker.generate || 0) > 0) {
        worker.generate = utils.satoshisToCoins(worker.generate, config.payments.magnitude, config.payments.coinPrecision);
        const generate = utils.coinsRound(worker.generate, config.payments.coinPrecision);
        commands.push(['hset', `${ coin }:main:payments:balance`, address, generate])
      } else {
        commands.push(['hset', `${ coin }:main:payments:balance`, address, 0]);
      }
    });

    // Update Worker Shares
    const deleteCurrent = function(coin, round) {
      return [
        commands.push(['del', `${ coin }:rounds:round-${ round.height }:shares:counts`]),
        commands.push(['del', `${ coin }:rounds:round-${ round.height }:shares:records`]),
        commands.push(['del', `${ coin }:rounds:round-${ round.height }:shares:values`]),
        commands.push(['del', `${ coin }:rounds:round-${ round.height }:times:last`]),
        commands.push(['del', `${ coin }:rounds:round-${ round.height }:times:values`])];
    };

    // Update Round Shares/Times
    rounds.forEach((round) => {
      switch (round.category) {
      case 'kicked':
      case 'orphan':
        commands.push(['hdel', `${ coin }:main:blocks:confirmations`, round.hash]);
        commands.push(['smove', `${ coin }:main:blocks:pending`, `${ coin }:main:blocks:kicked`, round.serialized]);
        if (round.delete) {
          _this.handleOrphans(commands, round, coin, (error, results) => {
            commands = commands.concat(results[0]);
            commands = commands.concat(deleteCurrent(coin, round));
          });
        }
        break;
      case 'immature':
        commands.push(['hset', `${ coin }:main:blocks:confirmations`, round.hash, (round.confirmations || 0)]);
        break;
      case 'generate':
        if (category === "payments") {
          commands.push(['hdel', `${ coin }:main:blocks:confirmations`, round.hash]);
          commands.push(['smove', `${ coin }:main:blocks:pending`, `${ coin }:main:blocks:confirmed`, round.serialized]);
          commands = commands.concat(deleteCurrent(coin, round));
        }
        break;
      }
    })

    // Update Miscellaneous Statistics
    if ((category === "start") || (category === "payments")) {
      commands.push(['hincrbyfloat', `${ coin }:main:payments:counts`, 'totalPaid', totalPaid]);
      commands.push(['hset', `${ coin }:main:payments:counts`, 'lastPaid', interval]);
    }

    // Manage Redis Commands
    _this.client.multi(commands).exec(function(error, results) {
      if (error) {
        logger.error('Payments', coin, `Payments sent but could not update redis: ${
          JSON.stringify(error) }. Disabling payment processing to prevent double-payouts. The commands in ${
          coin }_commands.txt must be ran manually`);
        fs.writeFile(`${ coin }_commands.txt`, JSON.stringify(commands), (error) => {
          logger.error('Could not write output commands.txt, stop the program immediately.');
        });
        callback(true, []);
        return;
      }
    });

    // Finish Up Payment Pipeline
    callback(null, []);
  }

  // Process Main Payment Checks
  /* istanbul ignore next */
  this.processChecks = function(daemon, config, category, interval, callbackMain) {

    // Process Checks Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, callback),
      (data, callback) => _this.handleWorkers(config, data, callback),
      (data, callback) => _this.handleTransactions(daemon, config, data, callback),
      (data, callback) => _this.handleTimes(config, data, callback),
      (data, callback) => _this.handleShares(config, data, callback),
      (data, callback) => _this.handleOwed(daemon, config, category, data, callback),
      (data, callback) => _this.handleRewards(config, data, callback),
      (data, callback) => _this.handleUpdates(config, category, interval, data, callback),
    ]);

    const coin = config.coin.name;
    logger.debug('Payments', coin, 'Finished payment processing checks and database maintenance.');
    callbackMain();
  };

  // Process Main Payment Functionality
  /* istanbul ignore next */
  this.processPayments = function(daemon, config, category, interval, callbackMain) {

    // Process Payments Incrementally
    async.waterfall([
      (callback) => _this.handleBlocks(daemon, config, callback),
      (data, callback) => _this.handleWorkers(config, data, callback),
      (data, callback) => _this.handleTransactions(daemon, config, data, callback),
      (data, callback) => _this.handleTimes(config, data, callback),
      (data, callback) => _this.handleShares(config, data, callback),
      (data, callback) => _this.handleOwed(daemon, config, category, data, callback),
      (data, callback) => _this.handleRewards(config, data, callback),
      (data, callback) => _this.handleUpdates(config, category, interval, data, callback),
    ]);

    const coin = config.coin.name;
    logger.debug('Payments', coin, 'Finished payment processing checks and attempted to send out payments.');
    callbackMain();
  };

  // Start Payment Interval Management
  /* istanbul ignore next */
  this.handleIntervals = function(daemon, config, callback) {

    // Handle Main Payment Checks
    const checkInterval = setInterval(() => {
      try {
        const category = "checks";
        const lastInterval = Date.now();
        _this.processChecks(daemon, config, category, lastInterval, () => {});
      } catch(e) {
        clearInterval(checkInterval);
        throw new Error(e);
      }
    }, config.payments.checkInterval * 1000);

    // Handle Main Payment Functionality
    const paymentInterval = setInterval(() => {
      try {
        const category = "payments";
        const lastInterval = Date.now();
        _this.processPayments(daemon, config, category, lastInterval, () => {});
      } catch(e) {
        clearInterval(paymentInterval);
        throw new Error(e);
      }
    }, config.payments.paymentInterval * 1000);

    // Start Payment Functionality with Initial Check
    setTimeout(() => {
      try {
        const category = "start";
        const lastInterval = Date.now();
        _this.processChecks(daemon, config, category, lastInterval, () => callback(null, true));
      } catch(e) {
        throw new Error(e);
      }
    }, 100);
  };

  // Handle Payment Processing for Enabled Pools
  /* istanbul ignore next */
  this.handlePayments = function(coin, callback) {

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
