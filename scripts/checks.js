/*
 *
 * PoolChecks (Updated)
 *
 */

// Import Required Modules
var fs = require('fs');
var redis = require('redis');
var async = require('async');
var util = require('stratum-pool/lib/util.js');

// Import Stratum Module
var Stratum = require('stratum-pool');

// Setup Checks for Individual Pools
function SetupForPool(logger, poolOptions, setupFinished) {

    // Establish Checks Variables
    var coin = poolOptions.coin.name;
    var processingConfig = poolOptions.paymentProcessing;
    var logSystem = 'Checks';
    var logComponent = coin;

    // Establish Payment Variables
    var maxBlocksPerPayment =  Math.max(processingConfig.maxBlocksPerPayment || 3, 1);
    var fee = parseFloat(poolOptions.coin.txfee) || parseFloat(0.0004);

    // Load Coin Daemon from Config
    var daemon = new Stratum.daemon.interface([processingConfig.daemon], function(severity, message) {
        logger[severity](logSystem, logComponent, message);
    });

    // Load Database from Config
    var redisClient = redis.createClient(poolOptions.redis.port, poolOptions.redis.host);
    if (poolOptions.redis.password) {
        redisClient.auth(poolOptions.redis.password);
    }

    // Establsh Helper Variables
    var magnitude;
    var coinPrecision;
    var checkInterval;

    // Round to # of Digits Given
    function roundTo(n, digits) {
        if (digits === undefined) {
            digits = 0;
        }
        var multiplicator = Math.pow(10, digits);
        n = parseFloat((n * multiplicator).toFixed(11));
        var test =(Math.round(n) / multiplicator);
        return +(test.toFixed(digits));
    }

    // Convert Satoshis to Coins
    var satoshisToCoins = function(satoshis) {
        return roundTo((satoshis / magnitude), coinPrecision);
    };

    // Convert Coins to Satoshis
    var coinsToSatoshies = function(coins) {
        return Math.round(coins * magnitude);
    };

    // Round Coins to Nearest Value Given Precision
    function coinsRound(number) {
        return roundTo(number, coinPrecision);
    }

    // Check for Block Duplicates
    function checkForDuplicateBlockHeight(rounds, height) {
        var count = 0;
        for (var i = 0; i < rounds.length; i++) {
            if (rounds[i].height == height)
                count++;
        }
        return count > 1;
    }

    // Manage Daemon Functionality
    async.waterfall([

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
                    coinPrecision = magnitude.toString().length - 1;
                    callback();
                }
                catch(e) {
                    logger.error(logSystem, logComponent, 'Error detecting number of satoshis in a coin, cannot run payment checks. Tried parsing: ' + result.data);
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

        // Process Main Checks
        checkInterval = setInterval(function() {
            try {
                processChecks();
            } catch(e) {
                throw e;
            }
        }, processingConfig.checkInterval * 1000);

        // Finalize Setup
        setTimeout(processChecks, 100);
        setupFinished(true);

    });

    // Balance Functionality
    var processChecks = function() {

        // Establish Timing Variables
        var timeSpentRPC = 0;
        var timeSpentRedis = 0;
        var startTimeRedis;
        var startTimeRPC;

        // Establish Database Timing Variables
        var startCheckProcess = Date.now();
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
                    ['hgetall', coin + ':unpaid'],
                    ['smembers', coin + ':blocks:pending']
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
                        workers[w] = {
                            balance: coinsToSatoshies(parseFloat(results[0][w]))
                        };
                    }

                    // Manage Individual Rounds
                    var rounds = results[1].map(function(r) {
                        var details = r.split(':');
                        return {
                            blockHash: details[0],
                            txHash: details[1],
                            height: details[2],
                            workerAddress: details[3],
                            soloMining: details[4],
                            duplicate: false,
                            serialized: r
                        };
                    });

                    // Sort Rounds by Block Height
                    rounds.sort(function(a, b) {
                        return a.height - b.height;
                    });

                    // Check for Block Duplicates
                    var duplicateFound = false;
                    for (var i = 0; i < rounds.length; i++) {
                        if (checkForDuplicateBlockHeight(rounds, rounds[i].height) === true) {
                            rounds[i].duplicate = true;
                            duplicateFound = true;
                        }
                    }

                    // Manage ANY Duplicate Blocks Found
                    if (duplicateFound) {
                        var dups = rounds.filter(function(round) { return round.duplicate; });
                        logger.warning(logSystem, logComponent, 'Duplicate pending blocks found: ' + JSON.stringify(dups));
                        var rpcDupCheck = dups.map(function(r) {
                            return ['getblock', [r.blockHash]];
                        });
                        startRPCTimer();
                        daemon.batchCmd(rpcDupCheck, function(error, blocks) {
                            endRPCTimer();
                            if (error || !blocks) {
                                logger.error(logSystem, logComponent, 'Error with duplicate block check rpc call getblock ' + JSON.stringify(error));
                                return;
                            }
                            var validBlocks = {};
                            var invalidBlocks = [];
                            blocks.forEach(function(block, i) {
                                if (block && block.result) {
                                    if (block.result.confirmations < 0) {
                                        logger.warning(logSystem, logComponent, 'Remove invalid duplicate block ' + block.result.height + ' > ' + block.result.hash);
                                        invalidBlocks.push(['smove', coin + ':blocks:pending', coin + ':blocksDuplicate', dups[i].serialized]);
                                    }
                                    else {
                                        if (validBlocks.hasOwnProperty(dups[i].blockHash)) {
                                            logger.warning(logSystem, logComponent, 'Remove non-unique duplicate block ' + block.result.height + ' > ' + block.result.hash);
                                            invalidBlocks.push(['smove', coin + ':blocks:pending', coin + ':blocksDuplicate', dups[i].serialized]);
                                        }
                                        else {
                                            validBlocks[dups[i].blockHash] = dups[i].serialized;
                                            logger.debug(logSystem, logComponent, 'Keep valid duplicate block ' + block.result.height + ' > ' + block.result.hash);
                                        }
                                    }
                                }
                            });
                            rounds = rounds.filter(function(round) { return !round.duplicate; });
                            if (invalidBlocks.length > 0) {
                                startRedisTimer();
                                redisClient.multi(invalidBlocks).exec(function(error, kicked) {
                                    endRedisTimer();
                                    if (error) {
                                        logger.error(logSystem, logComponent, 'Error could not move invalid duplicate blocks in redis ' + JSON.stringify(error));
                                    }
                                    callback(null, workers, rounds);
                                });
                            }
                            else {
                                logger.error(logSystem, logComponent, 'Unable to detect invalid duplicate blocks, duplicate block payments on hold.');
                                callback(null, workers, rounds);
                            }
                        });
                    }
                    else {
                        callback(null, workers, rounds);
                    }
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
                    txDetails.forEach(function(tx, i) {
                        if (i === txDetails.length - 1) {
                            return;
                        }

                        // Update Confirmations
                        var round = rounds[i];
                        if (tx && tx.result)
                            round.confirmations = parseInt((tx.result.confirmations || 0));

                        // Check Daemon Edge Cases
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
                        if ((round.category === 'generate') || (round.category === "immature")) {
                            round.reward = coinsRound(parseFloat(generationTx.amount || generationTx.value));
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

                    // Check to Ensure Doesn't Exceed Max Blocks
                    var payingBlocks = 0;
                    rounds = rounds.filter(function(r) {
                        switch (r.category) {
                            case 'orphan':
                            case 'kicked':
                                r.canDeleteShares = canDeleteShares(r);
                            case 'immature':
                                return true;
                            case 'generate':
                                payingBlocks += 1;
                                if (payingBlocks > maxBlocksPerPayment) {
                                  r.category == "immature";
                                }
                                return true;
                            default:
                                return false;
                        }
                    });

                    // Return Workers/Rounds as Callback
                    callback(null, workers, rounds);
                });
            },

            // Update Redis Database
            function(workers, rounds, callback) {

                // Lookup Shares from Rounds
                var shareLookups = rounds.map(function(r) {
                    return ['hgetall', coin + ':shares:round' + r.height]
                });

                startRedisTimer();
                redisClient.multi(shareLookups).exec(function(err, results) {
                    endRedisTimer();

                    var allWorkerSharesSolo = []
                    var allWorkerSharesShared = []
                    results.forEach(function(round) {
                        var roundSharesSolo = {}
                        var roundSharesShared = {}
                        Object.keys(round).forEach(function(entry) {
                            var details = entry.split(':');
                            if (details[1] === 'true') {
                                roundSharesSolo[details[0]] = round[entry]
                            }
                            else {
                                roundSharesShared[details[0]] = round[entry]
                            }
                        });
                        allWorkerSharesSolo.push(roundSharesSolo)
                        allWorkerSharesShared.push(roundSharesShared)
                    });

                    // Handle Errors
                    if (err) {
                        callback('Check finished - redis error with multi get rounds share');
                        return;
                    }

                    var errors = null;
                    var notAddr = null;

                    // Manage Shares in each Round
                    rounds.forEach(function(round, i) {
                        var workerSharesSolo = allWorkerSharesSolo[i];
                        var workerSharesShared = allWorkerSharesShared[i];

                        // Check if Shares Exist in Round
                        if (!workerSharesSolo && !workerSharesShared) {
                            logger.error(logSystem, logComponent, 'No worker shares for round: ' + round.height + ' blockHash: ' + round.blockHash);
                            return;
                        }

                        // Find Type of Block Generated
                        switch (round.category) {

                            // No Block Found
                            case 'kicked':
                            case 'orphan':
                                break;

                            // Block is Immature
                            case 'immature':
                                var feeSatoshi = coinsToSatoshies(fee);
                                var immature = coinsToSatoshies(round.reward);
                                var totalShares = parseFloat(0);
                                var sharesLost = parseFloat(0);

                                // Check if Solo Mined
                                if (round.soloMining === 'true') {

                                    immature = Math.round(immature - feeSatoshi);
                                    var worker = workers[round.workerAddress] = (workers[round.workerAddress] || {});
                                    var shares = parseFloat((workerSharesSolo[round.workerAddress] || 0));
                                    worker.roundShares = shares;

                                    var totalAmount = 0;
                                    var workerImmatureTotal = Math.round(immature);
                                    worker.immature = (worker.immature || 0) + workerImmatureTotal;
                                    totalAmount += workerImmatureTotal;

                                }

                                // Otherwise, Payout Shared
                                else {

                                    immature = Math.round(immature - feeSatoshi);
                                    for (var workerAddress in workerSharesShared) {
                                        var worker = workers[workerAddress] = (workers[workerAddress] || {});
                                        var shares = parseFloat((workerSharesShared[workerAddress] || 0));
                                        worker.roundShares = shares;
                                        totalShares += shares;
                                    }

                                    var totalAmount = 0;
                                    for (var workerAddress in workerSharesShared) {
                                        var worker = workers[workerAddress] = (workers[workerAddress] || {});
                                        var percent = parseFloat(worker.roundShares) / totalShares;
                                        var workerImmatureTotal = Math.round(immature * percent);
                                        worker.immature = (worker.immature || 0) + workerImmatureTotal;
                                        totalAmount += workerImmatureTotal;
                                    }

                                }
                                break;

                            // Block is Mature
                            case 'generate':
                                var feeSatoshi = coinsToSatoshies(fee);
                                var reward = Math.round(coinsToSatoshies(round.reward) - feeSatoshi);
                                var totalShares = parseFloat(0);
                                var sharesLost = parseFloat(0);

                                // Check if Solo Mined
                                if (round.soloMining === 'true') {

                                    var worker = workers[round.workerAddress] = (workers[round.workerAddress] || {});
                                    var shares = parseFloat((workerSharesSolo[round.workerAddress] || 0));
                                    worker.roundShares = shares;
                                    worker.totalShares = parseFloat(worker.totalShares || 0) + shares;

                                    var totalAmount = 0;
                                    var workerRewardTotal = Math.round(reward);
                                    worker.reward = (worker.reward || 0) + workerRewardTotal;
                                    totalAmount += workerRewardTotal;

                                }

                                // Otherwise, Payout Shared
                                else {

                                    for (var workerAddress in workerSharesShared) {
                                        var worker = workers[workerAddress] = (workers[workerAddress] || {});
                                        var shares = parseFloat((workerSharesShared[workerAddress] || 0));
                                        worker.roundShares = shares;
                                        worker.totalShares = parseFloat(worker.totalShares || 0) + shares;
                                        totalShares += shares;
                                    }

                                    var totalAmount = 0;
                                    for (var workerAddress in workerSharesShared) {
                                        var worker = workers[workerAddress] = (workers[workerAddress] || {});
                                        var percent = parseFloat(worker.roundShares) / totalShares;
                                        if (percent > 1.0) {
                                            errors = true;
                                            logger.error(logSystem, logComponent, 'Share percent is greater than 1.0 for '+workerAddress+' round:' + round.height + ' blockHash:' + round.blockHash);
                                            return;
                                        }
                                        var workerRewardTotal = Math.round(reward * percent);
                                        worker.reward = (worker.reward || 0) + workerRewardTotal;
                                        totalAmount += workerRewardTotal;
                                    }

                                }
                                break;

                        }
                    });

                    if (errors == null) {
                        callback(null, workers, rounds);
                    }
                    else {
                        callback(true);
                    }

                });
            },

            // Finalize Redis Updates
            function(workers, rounds, callback) {

                // Establish Checks Variables
                var movePendingCommands = [];
                var orphanMergeCommands = [];
                var immatureUpdateCommands = [];
                var balanceUpdateCommands = [];
                var roundsToDelete = [];
                var confirmsUpdate = [];
                var confirmsToDelete = [];

                // Update Immature/Balances in Database
                for (var w in workers) {
                    var worker = workers[w];
                    if ((worker.immature || 0) > 0) {
                        worker.immature = satoshisToCoins(worker.immature);
                        immatureUpdateCommands.push(['hset', coin + ':immature', w, coinsRound(worker.immature)]);
                    } else {
                        immatureUpdateCommands.push(['hset', coin + ':immature', w, 0]);
                    }
                    if ((worker.reward || 0) > 0) {
                        worker.reward = satoshisToCoins(worker.reward);
                        balanceUpdateCommands.push(['hset', coin + ':balances', w, coinsRound(worker.reward)]);
                    } else {
                        balanceUpdateCommands.push(['hset', coin + ':balances', w, 0]);
                    }
                }

                // Update Worker Shares
                var moveSharesToCurrent = function(r) {
                    var workerShares = r.workerShares;
                    if (workerShares != null) {
                        logger.warning(logSystem, logComponent, 'Moving shares from orphaned block '+r.height+' to current round.');
                        Object.keys(workerShares).forEach(function(worker) {
                            orphanMergeCommands.push(['hincrby', coin + ':shares:roundCurrent',
                                worker, workerShares[worker]]);
                        });
                    }
                };

                // Update Worker Shares in Database
                rounds.forEach(function(r) {
                    switch (r.category) {
                        case 'kicked':
                        case 'orphan':
                            movePendingCommands.push(['smove', coin + ':blocks:pending', coin + ':blocksKicked', r.serialized]);
                            if (r.canDeleteShares) {
                                moveSharesToCurrent(r);
                                roundsToDelete.push(coin + ':shares:round' + r.height);
                            }
                            return;
                        case 'immature':
                        case 'generate':
                            return;
                    }
                });

                // Update Main Database
                var finalRedisCommands = [];
                if (movePendingCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(movePendingCommands);
                if (orphanMergeCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(orphanMergeCommands);
                if (immatureUpdateCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(immatureUpdateCommands);
                if (balanceUpdateCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(balanceUpdateCommands);
                if (roundsToDelete.length > 0)
                    finalRedisCommands.push(['del'].concat(roundsToDelete));
                if (confirmsUpdate.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(confirmsUpdate);
                if (confirmsToDelete.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(confirmsToDelete);

                if (finalRedisCommands.length === 0) {
                    return;
                }

                // Manage Redis Timer
                startRedisTimer();
                redisClient.multi(finalRedisCommands).exec(function(err, results) {
                    endRedisTimer();

                    // Handle Errors
                    if (err) {
                        clearInterval(checkInterval);
                    }
                    var checkProcessTime = Date.now() - startCheckProcess;
                    logger.debug(logSystem, logComponent, 'Finished running status checks for payment processing');
                    return;
                });
            }
        ]);
    }
}

// Pool Checks Main Function
var PoolChecks = function (logger) {

    // Load Useful Data from Process
    var poolConfigs = JSON.parse(process.env.pools);
    var enabledPools = [];

    // Push Individual Configs to Main Array
    Object.keys(poolConfigs).forEach(function(coin) {
        enabledPools.push(coin);
    });

    // Load Checks for Individual Pools
    async.filter(enabledPools, function(coin, callback) {
        SetupForPool(logger, poolConfigs[coin], function(setupResults) {
            callback(setupResults);
        });
    }, function(coins) {
        coins.forEach(function(coin) {

            // Establish Payment Variables
            var poolOptions = poolConfigs[coin];
            var processingConfig = poolOptions.paymentProcessing;
            var logSystem = 'Checks';
            var logComponent = coin;

            // Send Message to Pool Logger
            logger.debug(logSystem, logComponent, 'Database checks setup to run every '
                + processingConfig.checkInterval + ' second(s) with daemon ('
                + processingConfig.daemon.user + '@' + processingConfig.daemon.host + ':' + processingConfig.daemon.port
                + ') and redis (' + poolOptions.redis.host + ':' + poolOptions.redis.port + ')');
        });
    });
};

// Export Pool Checks
module.exports = PoolChecks;
