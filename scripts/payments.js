/*
 *
 * PoolPayments (Updated)
 *
 */

// Import Required Modules
var fs = require('fs');
var redis = require('redis');
var async = require('async');
var util = require('stratum-pool/lib/util.js');

// Import Stratum Module
var Stratum = require('stratum-pool');

// Derive Main Address from Given
function getProperAddress(address) {
    if (address.length === 40) {
        return util.addressFromEx(poolOptions.address, address);
    }
    else return address;
};

// Setup Payments for Individual Pools
function SetupForPool(logger, poolOptions, setupFinished) {

    // Establish Payment Variables
    var coin = poolOptions.coin.name;
    var processingConfig = poolOptions.paymentProcessing;
    var logSystem = 'Payments';
    var logComponent = coin;

    // Load Coin Daemon/Database from Config
    var redisClient = redis.createClient(poolOptions.redis.port, poolOptions.redis.host);
    var daemon = new Stratum.daemon.interface([processingConfig.daemon], function(severity, message) {
        logger[severity](logSystem, logComponent, message);
    });

    // Establsh Helper Variables
    var magnitude;
    var minPaymentSatoshis;
    var coinPrecision;
    var paymentInterval;

    // Convert Satoshis to Coins
    var satoshisToCoins = function(satoshis) {
        return parseFloat((satoshis / magnitude).toFixed(coinPrecision));
    };

    // Convert Coins to Satoshis
    var coinsToSatoshies = function(coins) {
        return coins * magnitude;
    };

    // Manage Daemon Functionality
    async.parallel([

        // Validate Address from Daemon
        function(callback) {
            daemon.cmd('validateaddress', [poolOptions.address], function(result) {
                if (result.error) {
                    logger.error(logSystem, logComponent, 'Error with payment processing daemon ' + JSON.stringify(result.error));
                    callback(true);
                }
                else if (!result.response || !result.response.ismine) {
                    daemon.cmd('getaddressinfo', [poolOptions.address], function(result) {
                        if (result.error) {
                            logger.error(logSystem, logComponent, 'Error with payment processing daemon, getaddressinfo failed ... ' + JSON.stringify(result.error));
                            callback(true);
                        }
                        else if (!result.response || !result.response.ismine) {
                            logger.error(logSystem, logComponent,
                                'Daemon does not own pool address - payment processing can not be done with this daemon, '
                                + JSON.stringify(result.response));
                            callback(true);
                        }
                        else {
                            callback()
                        }
                    }, true);
                }
                else {
                    callback()
                }
            }, true);
        },

        // Validate Balance from Daemon
        function(callback) {
            daemon.cmd('getbalance', [], function(result) {
                if (result.error) {
                    callback(true);
                    return;
                }
                try {
                    var d = result.data.split('result":')[1].split(',')[0].split('.')[1];
                    magnitude = parseInt('10' + new Array(d.length).join('0'));
                    minPaymentSatoshis = parseInt(processingConfig.minimumPayment * magnitude);
                    coinPrecision = magnitude.toString().length - 1;
                    callback();
                }
                catch(e) {
                    logger.error(logSystem, logComponent, 'Error detecting number of satoshis in a coin, cannot do payment processing. Tried parsing: ' + result.data);
                    callback(true);
                }
            }, true, true);
        }

    ], function(err) {

        // Handle Errors
        if (err) {
            setupFinished(false);
            return;
        }

        // Process Main Payment
        paymentInterval = setInterval(function() {
            try {
                processPayments();
            } catch(e) {
                throw e;
            }
        }, processingConfig.paymentInterval * 1000);
        setTimeout(processPayments, 100);
        setupFinished(true);

    });

    // Payment Functionality
    var processPayments = function() {

        // Establish Timing Variables
        var timeSpentRPC = 0;
        var timeSpentRedis = 0;
        var startTimeRedis;
        var startTimeRPC;

        // Establish Database Timing Variables
        var startPaymentProcess = Date.now();
        var startRedisTimer = function() { startTimeRedis = Date.now() };
        var endRedisTimer = function() { timeSpentRedis += Date.now() - startTimeRedis };
        var startRPCTimer = function() { startTimeRPC = Date.now(); };
        var endRPCTimer = function() { timeSpentRPC += Date.now() - startTimeRedis };

        // Manage Database Functionality
        async.waterfall([

            // Validate Shares/Blocks in Database
            function(callback) {

                // Manage Redis Timer
                startRedisTimer();
                redisClient.multi([
                    ['hgetall', coin + ':balances'],
                    ['smembers', coin + ':blocksPending']
                ]).exec(function(err, results) {
                    endRedisTimer();

                    // Handle Errors
                    if (err) {
                        logger.error(logSystem, logComponent, 'Could not get Blocks from Database ' + JSON.stringify(error));
                        callback(true);
                        return;
                    }

                    // Manage Individual Workers
                    var workers = {};
                    for (var w in results[0]) {
                        workers[w] = {balance: coinsToSatoshies(parseFloat(results[0][w]))};
                    }

                    // Manage Individual Rounds
                    var rounds = results[1].map(function(r) {
                        var details = r.split(':');
                        return {
                            blockHash: details[0],
                            txHash: details[1],
                            height: details[2],
                            serialized: r
                        };
                    });

                    // Return Workers/Rounds as Callback
                    callback(null, workers, rounds);
                });
            },

            // Validate Transaction Hashes
            function(workers, rounds, callback) {

                // Get Hashes for Each Transaction
                var batchRPCcommand = rounds.map(function(r) {
                    return ['gettransaction', [r.txHash]];
                });
                batchRPCcommand.push(['getaccount', [poolOptions.address]]);

                // Manage RPC Timer
                startRPCTimer();
                daemon.batchCmd(batchRPCcommand, function(error, txDetails) {
                    endRPCTimer();

                    // Handle Errors
                    if (error || !txDetails) {
                        logger.error(logSystem, logComponent, 'Check finished - daemon rpc error with batch gettransactions '
                            + JSON.stringify(error));
                        callback(true);
                        return;
                    }

                    // Handle Individual Transactions
                    var addressAccount;
                    txDetails.forEach(function(tx, i) {
                        if (i === txDetails.length - 1) {
                            addressAccount = tx.result;
                            return;
                        }

                        // Check Daemon Edge Cases
                        var round = rounds[i];
                        if (tx.error && tx.error.code === -5) {
                            logger.warning(logSystem, logComponent, 'Daemon reports invalid transaction: ' + round.txHash);
                            round.category = 'kicked';
                            return;
                        }
                        else if (!tx.result.details || (tx.result.details && tx.result.details.length === 0)) {
                            logger.warning(logSystem, logComponent, 'Daemon reports no details for transaction: ' + round.txHash);
                            round.category = 'kicked';
                            return;
                        }
                        else if (tx.error || !tx.result) {
                            logger.error(logSystem, logComponent, 'Odd error with gettransaction ' + round.txHash + ' '
                                + JSON.stringify(tx));
                            return;
                        }

                        // Check Transaction Edge Cases
                        var generationTx = tx.result.details.filter(function(tx) {
                            return tx.address === poolOptions.address;
                        })[0];
                        if (!generationTx && tx.result.details.length === 1) {
                            generationTx = tx.result.details[0];
                        }
                        if (!generationTx) {
                            logger.error(logSystem, logComponent, 'Missing output details to pool address for transaction '
                                + round.txHash);
                            return;
                        }

                        // Update Round Category/Reward
                        round.category = generationTx.category;
                        if (round.category === 'generate') {
                            round.reward = generationTx.amount || generationTx.value;
                        }

                    });

                    // Check for Shares to Delete
                    var canDeleteShares = function(r) {
                        for (var i = 0; i < rounds.length; i++) {
                            var compareR = rounds[i];
                            if ((compareR.height === r.height)
                                && (compareR.category !== 'kicked')
                                && (compareR.category !== 'orphan')
                                && (compareR.serialized !== r.serialized)) {
                                return false;
                            }
                        }
                        return true;
                    };


                    // Manage Immagure Rounds
                    rounds = rounds.filter(function(r) {
                        switch (r.category) {
                            case 'orphan':
                            case 'kicked':
                                r.canDeleteShares = canDeleteShares(r);
                            case 'generate':
                                return true;
                            default:
                                return false;
                        }
                    });

                    // Return Workers/Rounds as Callback
                    callback(null, workers, rounds, addressAccount);
                });
            },

            // Update Redis Database
            function(workers, rounds, addressAccount, callback) {

                // Lookup Shares from Rounds
                var shareLookups = rounds.map(function(r) {
                    return ['hgetall', coin + ':shares:round' + r.height]
                });

                // Manage Redis Timer
                startRedisTimer();
                redisClient.multi(shareLookups).exec(function(err, allWorkerShares) {
                    endRedisTimer();

                    // Handle Errors
                    if (err) {
                        callback('Check finished - redis error with multi get rounds share');
                        return;
                    }

                    // Manage Shares in each Round
                    rounds.forEach(function(round, i) {
                        var workerShares = allWorkerShares[i];

                        // Check if Shares Exist in Round
                        if (!workerShares) {
                            logger.error(logSystem, logComponent, 'No worker shares for round: '
                                + round.height + ' blockHash: ' + round.blockHash);
                            return;
                        }

                        // Find Type of Block Generated
                        switch (round.category) {

                            // No Block Found
                            case 'kicked':
                            case 'orphan':
                                round.workerShares = workerShares;
                                break;

                            // Block Found and Confirmed
                            case 'generate':
                                var reward = parseInt(round.reward * magnitude);
                                var totalShares = Object.keys(workerShares).reduce(function(p, c) {
                                    return p + parseFloat(workerShares[c])
                                }, 0);

                                // Pay Each Miner who Contributed
                                for (var workerAddress in workerShares) {
                                    var percent = parseFloat(workerShares[workerAddress]) / totalShares;
                                    var workerRewardTotal = Math.floor(reward * percent);
                                    var worker = workers[workerAddress] = (workers[workerAddress] || {});
                                    worker.reward = (worker.reward || 0) + workerRewardTotal;
                                }
                                break;
                        }
                    });

                    // Return Workers/Rounds as Callback
                    callback(null, workers, rounds, addressAccount);
                });
            },

            // Calculate Payments
            function(workers, rounds, addressAccount, callback) {

                // Get Worker Balances/Rewards
                var trySend = function (withholdPercent) {
                    var addressAmounts = {};
                    var totalSent = 0;
                    for (var w in workers) {
                        var worker = workers[w];
                        worker.balance = worker.balance || 0;
                        worker.reward = worker.reward || 0;
                        var toSend = (worker.balance + worker.reward) * (1 - withholdPercent);
                        if (toSend >= minPaymentSatoshis) {
                            totalSent += toSend;
                            var address = worker.address = (worker.address || getProperAddress(w));
                            worker.sent = addressAmounts[address] = satoshisToCoins(toSend);
                            worker.balanceChange = Math.min(worker.balance, toSend) * -1;
                        }
                        else {
                            worker.balanceChange = Math.max(toSend - worker.balance, 0);
                            worker.sent = 0;
                        }
                    }

                    // Check if No Workers/Rounds
                    if (Object.keys(addressAmounts).length === 0) {
                        callback(null, workers, rounds);
                        return;
                    }

                    // Send Payments Through Daemon
                    daemon.cmd('sendmany', [addressAccount || '', addressAmounts], function (result) {

                        // Check Payment Edge Cases
                        if (result.error && result.error.code === -6) {
                            var higherPercent = withholdPercent + 0.01;
                            logger.warning(logSystem, logComponent, 'Not enough funds to cover the tx fees for sending out payments, decreasing rewards by '
                                + (higherPercent * 100) + '% and retrying');
                            trySend(higherPercent);
                        }
                        else if (result.error) {
                            logger.error(logSystem, logComponent, 'Error trying to send payments with RPC sendmany '
                                + JSON.stringify(result.error));
                            callback(true);
                        }
                        else {
                            logger.debug(logSystem, logComponent, 'Sent out a total of ' + (totalSent / magnitude)
                                + ' to ' + Object.keys(addressAmounts).length + ' workers');
                            if (withholdPercent > 0) {
                                logger.warning(logSystem, logComponent, 'Had to withhold ' + (withholdPercent * 100)
                                    + '% of reward from miners to cover transaction fees. '
                                    + 'Fund pool wallet with coins to prevent this from happening');
                            }
                            callback(null, workers, rounds);
                        }

                    }, true, true);
                };

                // Send ALL Payments
                trySend(0);
            },

            // Manage Sent Payments
            function(workers, rounds, callback) {

                // Establish Payment Variables
                var totalPaid = 0;
                var balanceUpdateCommands = [];
                var workerPayoutsCommand = [];
                var movePendingCommands = [];
                var roundsToDelete = [];
                var orphanMergeCommands = [];

                // Update Worker Payouts/Balances
                for (var w in workers) {
                    var worker = workers[w];
                    if (worker.balanceChange !== 0) {
                        balanceUpdateCommands.push([
                            'hincrbyfloat',
                            coin + ':balances',
                            w,
                            satoshisToCoins(worker.balanceChange)
                        ]);
                    }
                    if (worker.sent !== 0) {
                        workerPayoutsCommand.push(['hincrbyfloat', coin + ':payouts', w, worker.sent]);
                        totalPaid += worker.sent;
                    }
                }

                // Update Worker Shares
                var moveSharesToCurrent = function(r) {
                    var workerShares = r.workerShares;
                    Object.keys(workerShares).forEach(function(worker) {
                        orphanMergeCommands.push(['hincrby', coin + ':shares:roundCurrent',
                            worker, workerShares[worker]]);
                    });
                };

                // Update Worker Shares in Database
                rounds.forEach(function(r) {
                    switch (r.category) {
                        case 'kicked':
                            movePendingCommands.push(['smove', coin + ':blocksPending', coin + ':blocksKicked', r.serialized]);
                        case 'orphan':
                            movePendingCommands.push(['smove', coin + ':blocksPending', coin + ':blocksOrphaned', r.serialized]);
                            if (r.canDeleteShares) {
                                moveSharesToCurrent(r);
                                roundsToDelete.push(coin + ':shares:round' + r.height);
                            }
                            return;
                        case 'generate':
                            movePendingCommands.push(['smove', coin + ':blocksPending', coin + ':blocksConfirmed', r.serialized]);
                            roundsToDelete.push(coin + ':shares:round' + r.height);
                            return;
                    }
                });

                // Update Main Database
                var finalRedisCommands = [];
                if (movePendingCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(movePendingCommands);
                if (orphanMergeCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(orphanMergeCommands);
                if (balanceUpdateCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(balanceUpdateCommands);
                if (workerPayoutsCommand.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(workerPayoutsCommand);
                if (roundsToDelete.length > 0)
                    finalRedisCommands.push(['del'].concat(roundsToDelete));
                if (totalPaid !== 0)
                    finalRedisCommands.push(['hincrbyfloat', coin + ':stats', 'totalPaid', totalPaid]);
                if (finalRedisCommands.length === 0) {
                    callback();
                    return;
                }

                // Manage Redis Timer
                startRedisTimer();
                redisClient.multi(finalRedisCommands).exec(function(err, results) {
                    endRedisTimer();

                    // Handle Errors
                    if (err) {
                        clearInterval(paymentInterval);
                        logger.error(logSystem, logComponent,
                                'Payments sent but could not update redis. ' + JSON.stringify(error)
                                + ' Disabling payment processing to prevent possible double-payouts. The redis commands in '
                                + coin + '_finalRedisCommands.txt must be ran manually');
                        fs.writeFile(coin + '_finalRedisCommands.txt', JSON.stringify(finalRedisCommands), function(err) {
                            logger.error('Could not write finalRedisCommands.txt, you are fucked.');
                        });
                    }
                    callback();
                });
            }

        // Record Time of Payments
        ], function() {

            // Send Message to Pool Logger
            var paymentProcessTime = Date.now() - startPaymentProcess;
            logger.debug(logSystem, logComponent, 'Finished interval - time spent: '
                + paymentProcessTime + 'ms total, ' + timeSpentRedis + 'ms redis, '
                + timeSpentRPC + 'ms daemon RPC');

        });
    };
}

// Pool Payments Main Function
var PoolPayments = function (logger) {

    // Load Useful Data from Process
    var poolConfigs = JSON.parse(process.env.pools);
    var enabledPools = [];

    // Push Individual Configs to Main Array
    Object.keys(poolConfigs).forEach(function(coin) {
        var poolOptions = poolConfigs[coin];
        if (poolOptions.paymentProcessing &&
            poolOptions.paymentProcessing.enabled)
            enabledPools.push(coin);
    });

    // Load Payments for Individual Pools
    async.filter(enabledPools, function(coin, callback) {
        SetupForPool(logger, poolConfigs[coin], function(setupResults) {
            callback(setupResults);
        });
    }, function(coins) {
        coins.forEach(function(coin) {

            // Establish Payment Variables
            var poolOptions = poolConfigs[coin];
            var processingConfig = poolOptions.paymentProcessing;
            var logSystem = 'Payments';
            var logComponent = coin;

            // Send Message to Pool Logger
            logger.debug(logSystem, logComponent, 'Payment processing setup to run every '
                + processingConfig.paymentInterval + ' second(s) with daemon ('
                + processingConfig.daemon.user + '@' + processingConfig.daemon.host + ':' + processingConfig.daemon.port
                + ') and redis (' + poolOptions.redis.host + ':' + poolOptions.redis.port + ')');
        });
    });
};

// Export Pool Payments
module.exports = PoolPayments;
