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

    // Establish Payment Variables
    var maxBlocksPerPayment =  Math.max(processingConfig.maxBlocksPerPayment || 3, 1);
    var fee = parseFloat(poolOptions.coin.txfee) || parseFloat(0.0004);
    var minConfPayout = Math.max((processingConfig.minConf || 10), 1);
    if (minConfPayout  < 3) {
        logger.warning(logSystem, logComponent, logComponent + ' minConf of 3 is recommended.');
    }

    // Debug Pool Configuration
    logger.debug(logSystem, logComponent, 'Current maxBlocksPerPayment: ' + maxBlocksPerPayment);

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
    var minPaymentSatoshis;
    var coinPrecision;
    var paymentInterval;

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

    // Return Unspent Balance
    function listUnspent (addr, notAddr, minConf, displayBool, callback) {
        if (addr !== null) {
            var args = [minConf, 99999999, [addr]];
        } else {
            addr = 'Payout wallet';
            var args = [minConf, 99999999];
        }
        daemon.cmd('listunspent', args, function (result) {
            if (!result || result.error || result[0].error) {
                logger.error(logSystem, logComponent, 'Error with RPC call listunspent ' + addr + ' ' + JSON.stringify(result[0].error));
                callback = function () {};
                callback(true);
            }
            else {
                var balance = parseFloat(0);
                if (result[0].response != null && result[0].response.length > 0) {
                    for (var i = 0, len = result[0].response.length; i < len; i++) {
                        if (result[0].response[i].address && result[0].response[i].address !== notAddr) {
                            balance += parseFloat(result[0].response[i].amount || 0);
                        }
                    }
                    balance = coinsRound(balance);
                }
                if (displayBool === true) {
                    logger.special(logSystem, logComponent, addr+' balance of ' + balance);
                }
                callback(null, coinsToSatoshies(balance));
            }
        });
    }

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

        // Process Main Checks
        checkInterval = setInterval(function() {
            try {
                var lastInterval = Date.now();
                processPayments("check", lastInterval);
            } catch(e) {
                throw e;
            }
        }, processingConfig.checkInterval * 1000);

        // Process Main Payment
        paymentInterval = setInterval(function() {
            try {
                var lastInterval = Date.now();
                processPayments("payment", lastInterval);
            } catch(e) {
                throw e;
            }
        }, processingConfig.paymentInterval * 1000);

        // Finalize Setup
        var lastInterval = Date.now();
        setTimeout(function() {
          processPayments("start", lastInterval)
        }, 100);
        setupFinished(true);

    });

    // Payment Functionality
    var processPayments = function(paymentMode, lastInterval) {

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
                    ['hgetall', coin + ':payments:unpaid'],
                    ['smembers', coin + ':blocks:pending']
                ]).exec(function(err, results) {
                    endRedisTimer();

                    // Handle Errors
                    if (err) {
                        logger.error(logSystem, logComponent, 'Could not get blocks from database: ' + JSON.stringify(error));
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
                        var details = JSON.parse(r);
                        return {
                            blockHash: details.blockHash,
                            txHash: details.txHash,
                            height: details.height,
                            workerAddress: details.worker,
                            soloMined: details.soloMined,
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
                                        invalidBlocks.push(['smove', coin + ':blocks:pending', coin + ':blocks:duplicate', dups[i].serialized]);
                                    }
                                    else {
                                        if (validBlocks.hasOwnProperty(dups[i].blockHash)) {
                                            logger.warning(logSystem, logComponent, 'Remove non-unique duplicate block ' + block.result.height + ' > ' + block.result.hash);
                                            invalidBlocks.push(['smove', coin + ':blocks:pending', coin + ':blocks:duplicate', dups[i].serialized]);
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
                    var addressAccount;
                    txDetails.forEach(function(tx, i) {
                        if (i === txDetails.length - 1) {
                            addressAccount = tx.result;
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

                    // Manage Immagure Rounds
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
                    callback(null, workers, rounds, addressAccount);
                });
            },

            // Update Redis Database
            function(workers, rounds, addressAccount, callback) {

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
                            var details = JSON.parse(entry);
                            if (details.soloMined === true) {
                                roundSharesSolo[details.worker] = round[entry]
                            }
                            else {
                                roundSharesShared[details.worker] = round[entry]
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
                    var performPayment = false;
                    var notAddr = null;

                    var feeSatoshi = coinsToSatoshies(fee);
                    var totalOwed = parseInt(0);
                    for (var i = 0; i < rounds.length; i++) {
                        if (rounds[i].category == 'generate') {
                            totalOwed = totalOwed + coinsToSatoshies(rounds[i].reward) - feeSatoshi;
                        }
                    }
                    for (var w in workers) {
                        var worker = workers[w];
                        totalOwed = totalOwed + (worker.balance || 0);
                    }

                    // Check For Funds before Payments Processed
                    listUnspent(null, notAddr, minConfPayout, false, function (error, balance) {
                        if (error) {
                            logger.error(logSystem, logComponent, 'Error checking pool balance before processing payments.');
                            return callback(true);
                        } else if (balance < totalOwed) {
                            logger.error(logSystem, logComponent,  'Insufficient funds (' + satoshisToCoins(balance) + ') to process payments (' + satoshisToCoins(totalOwed) + '); possibly waiting for txs.');
                            performPayment = false;
                        } else if (balance > totalOwed) {
                            performPayment = true;
                        }
                        if (totalOwed <= 0) {
                            performPayment = false;
                        }
                        if (performPayment === false) {
                            rounds = rounds.filter(function(r) {
                                switch (r.category) {
                                    case 'orphan':
                                    case 'kicked':
                                    case 'immature':
                                        return true;
                                    case 'generate':
                                        r.category = 'immature';
                                        return true;
                                    default:
                                        return false;
                                };
                            });
                        }

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
                                    if (round.soloMined === true) {

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

                                // Block Found and Confirmed
                                case 'generate':
                                    var feeSatoshi = coinsToSatoshies(fee);
                                    var reward = Math.round(coinsToSatoshies(round.reward) - feeSatoshi);
                                    var totalShares = parseFloat(0);
                                    var sharesLost = parseFloat(0);

                                    // Check if Solo Mined
                                    if (round.soloMined === true) {

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
                            callback(null, workers, rounds, addressAccount);
                        }
                        else {
                            callback(true);
                        }
                    });
                });
            },

            // Calculate Payments
            function(workers, rounds, addressAccount, callback) {

                // Check to Ensure Payments are Being Made
                if (paymentMode === "payment") {

                    // Get Worker Balances/Rewards
                    var tries = 0;
                    var trySend = function (withholdPercent) {

                        var addressAmounts = {};
                        var balanceAmounts = {};
                        var shareAmounts = {};
                        var timePeriods = {};
                        var workerTotals = {};
                        var totalSent = 0;
                        var totalShares = 0;
                        tries += 1

                        for (var w in workers) {
                            var worker = workers[w];
                            totalShares += (worker.totalShares || 0)
                            worker.balance = worker.balance || 0;
                            worker.reward = worker.reward || 0;
                            var toSendSatoshis = Math.round((worker.balance + worker.reward) * (1 - withholdPercent));
                            var address = worker.address = (worker.address || getProperAddress(w.split('.')[0])).trim();
                            if (workerTotals[address] != null && workerTotals[address] > 0) {
                                workerTotals[address] += toSendSatoshis;
                            } else {
                                workerTotals[address] = toSendSatoshis;
                            }
                        }

                        for (var w in workers) {
                            var worker = workers[w];
                            worker.balance = worker.balance || 0;
                            worker.reward = worker.reward || 0;
                            var toSendSatoshis = Math.round((worker.balance + worker.reward) * (1 - withholdPercent));
                            var address = worker.address = (worker.address || getProperAddress(w.split('.')[0])).trim();
                            if (workerTotals[address] >= minPaymentSatoshis) {
                                totalSent += toSendSatoshis;
                                worker.sent = satoshisToCoins(toSendSatoshis);
                                worker.balanceChange = Math.min(worker.balance, toSendSatoshis) * -1;
                                if (addressAmounts[address] != null && addressAmounts[address] > 0) {
                                    addressAmounts[address] = coinsRound(addressAmounts[address] + worker.sent);
                                } else {
                                    addressAmounts[address] = worker.sent;
                                }
                            }
                            else {
                                worker.sent = 0;
                                worker.balanceChange = Math.max(toSendSatoshis - worker.balance, 0);
                                if (worker.balanceChange > 0) {
                                    if (balanceAmounts[address] != null && balanceAmounts[address] > 0) {
                                        balanceAmounts[address] = coinsRound(balanceAmounts[address] + satoshisToCoins(worker.balanceChange));
                                    } else {
                                        balanceAmounts[address] = satoshisToCoins(worker.balanceChange);
                                    }
                                }
                            }

                            if (worker.totalShares > 0) {
                                if (shareAmounts[address] != null && shareAmounts[address] > 0) {
                                    shareAmounts[address] += worker.totalShares;
                                } else {
                                    shareAmounts[address] = worker.totalShares;
                                }
                            }
                        }

                        // Check if No Workers/Rounds
                        if (Object.keys(addressAmounts).length === 0) {
                            callback(null, workers, rounds);
                            return;
                        }

                        for (var a in addressAmounts) {
                            addressAmounts[a] = coinsRound(addressAmounts[a]);
                        }

                        // Send Payments Through Daemon
                        var rpccallTracking = 'sendmany "" ' + JSON.stringify(addressAmounts);
                        daemon.cmd('sendmany', [addressAccount || '', addressAmounts], function (result) {

                            // Check Payment Errors/Edge Cases
                            if (result.error && result.error.code === -6) {
                                if (result.error.message && result.error.message.includes("insufficient funds")) {
                                    if (tries < 5) {
                                        var higherPercent = withholdPercent + 0.001;
                                        logger.warning(logSystem, logComponent, 'Insufficient funds (??) for payments (' + satoshisToCoins(totalSent) + '), decreasing rewards by ' + (higherPercent * 100).toFixed(1) + '% and retrying');
                                        trySend(higherPercent);
                                    }
                                    else {
                                        logger.warning(logSystem, logComponent, rpccallTracking);
                                        logger.error(logSystem, logComponent, "Error sending payments, decreased rewards by too much!!!");
                                        callback(true);
                                    }
                                }
                                else {
                                    logger.warning(logSystem, logComponent, rpccallTracking);
                                    logger.error(logSystem, logComponent, 'Error sending payments ' + JSON.stringify(result.error));
                                    callback(true);
                                }
                                return
                            }
                            else if (result.error && result.error.code === -5) {
                                logger.warning(logSystem, logComponent, rpccallTracking);
                                logger.error(logSystem, logComponent, 'Error sending payments ' + JSON.stringify(result.error));
                                callback(true);
                                return;
                            }
                            else if (result.error && result.error.message != null) {
                                logger.warning(logSystem, logComponent, rpccallTracking);
                                logger.error(logSystem, logComponent, 'Error sending payments ' + JSON.stringify(result.error));
                                callback(true);
                                return;
                            }
                            else if (result.error) {
                                logger.error(logSystem, logComponent, 'Error sending payments ' + JSON.stringify(result.error));
                                callback(true);
                                return;
                            }
                            else {
                                var txid = null;
                                if (result.response) {
                                    txid = result.response;
                                }
                                if (txid != null) {
                                    logger.special(logSystem, logComponent, 'Sent ' + satoshisToCoins(totalSent) + ' to ' + Object.keys(addressAmounts).length + ' workers; txid: '+txid);
                                    if (withholdPercent > 0) {
                                        logger.warning(logSystem, logComponent, 'Had to withhold ' + (withholdPercent * 100)
                                            + '% of reward from workers to cover transaction fees. '
                                            + 'Fund pool wallet with coins to prevent this from happening');
                                    }
                                    var paymentBlocks = rounds.filter(function(r) { return r.category == 'generate'; }).map(function(r) {
                                        return parseInt(r.height);
                                    });
                                    var paymentsUpdate = [];
                                    var paymentsData = {
                                        time: Date.now(),
                                        txid: txid,
                                        shares: totalShares,
                                        paid: satoshisToCoins(totalSent),
                                        workers: Object.keys(addressAmounts).length,
                                        blocks: paymentBlocks,
                                        amounts: addressAmounts,
                                        unpaid: balanceAmounts,
                                        work: shareAmounts
                                    };
                                    paymentsUpdate.push(['zadd', logComponent + ':payments:payments', Date.now(), JSON.stringify(paymentsData)]);
                                    callback(null, workers, rounds, paymentsUpdate);
                                }
                                else {
                                    clearInterval(paymentInterval);
                                    logger.error(logSystem, logComponent, 'Error RPC sendmany did not return txid ' + JSON.stringify(result) + 'Disabling payment processing to prevent possible double-payouts.');
                                    callback(true);
                                    return;
                                }
                            }

                        }, true, true);
                    };

                    // Send Any Owed Payments
                    trySend(0);
                }

                else {
                    // If No Payments, Send Callback
                    callback(null, workers, rounds, []);
                }
            },

            // Manage Sent Payments
            function(workers, rounds, paymentsUpdate, callback) {

                // Establish Payment Variables
                var totalPaid = 0;
                var movePendingCommands = [];
                var orphanMergeCommands = [];
                var immatureUpdateCommands = [];
                var balanceUpdateCommands = [];
                var workerPayoutsCommand = [];
                var roundsToDelete = [];
                var confirmsUpdate = [];
                var confirmsToDelete = [];

                // Update Worker Payouts/Balances
                for (var w in workers) {
                    var worker = workers[w];

                    if (paymentMode === "payment") {
                        if (worker.balanceChange !== 0) {
                            balanceUpdateCommands.push([
                                'hincrbyfloat',
                                coin + ':payments:unpaid',
                                w,
                                satoshisToCoins(worker.balanceChange)
                            ]);
                        }
                        if ((worker.sent || 0) > 0) {
                            workerPayoutsCommand.push(['hincrbyfloat', coin + ':payments:payouts', w, coinsRound(worker.sent)]);
                            totalPaid = coinsRound(totalPaid + worker.sent);
                        }
                    }
                    else {
                        if ((worker.reward || 0) > 0) {
                            worker.reward = satoshisToCoins(worker.reward);
                            balanceUpdateCommands.push(['hset', coin + ':payments:balances', w, coinsRound(worker.reward)]);
                        }
                        else {
                            balanceUpdateCommands.push(['hset', coin + ':payments:balances', w, 0]);
                        }
                    }

                    if ((worker.immature || 0) > 0) {
                        worker.immature = satoshisToCoins(worker.immature);
                        immatureUpdateCommands.push(['hset', coin + ':payments:immature', w, coinsRound(worker.immature)]);
                    }
                    else {
                        immatureUpdateCommands.push(['hset', coin + ':payments:immature', w, 0]);
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
                            confirmsToDelete.push(['hdel', coin + ':blocks:pendingConfirms', r.blockHash]);
                            movePendingCommands.push(['smove', coin + ':blocks:pending', coin + ':blocks:kicked', r.serialized]);
                            if (r.canDeleteShares) {
                                moveSharesToCurrent(r);
                                roundsToDelete.push(coin + ':shares:round' + r.height);
                            }
                            return;
                        case 'immature':
                            confirmsUpdate.push(['hset', coin + ':blocks:pendingConfirms', r.blockHash, (r.confirmations || 0)]);
                            return;
                        case 'generate':
                            if (paymentMode === "payment") {
                                confirmsToDelete.push(['hdel', coin + ':blocks:pendingConfirms', r.blockHash]);
                                movePendingCommands.push(['smove', coin + ':blocks:pending', coin + ':blocks:confirmed', r.serialized]);
                                roundsToDelete.push(coin + ':shares:round' + r.height);
                            }
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
                if (workerPayoutsCommand.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(workerPayoutsCommand);
                if (roundsToDelete.length > 0)
                    finalRedisCommands.push(['del'].concat(roundsToDelete));
                if (confirmsUpdate.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(confirmsUpdate);
                if (confirmsToDelete.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(confirmsToDelete);
                if (paymentsUpdate.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(paymentsUpdate);
                if (totalPaid !== 0)
                    finalRedisCommands.push(['hincrbyfloat', coin + ':statistics:basic', 'totalPaid', totalPaid]);
                if ((paymentMode === "start") || (paymentMode === "payment"))
                    finalRedisCommands.push(['hset', coin + ':statistics:basic', 'lastPaid', lastInterval]);

                if (finalRedisCommands.length === 0) {
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

                    // Send Final Message
                    if (paymentMode === "payment") {
                        var paymentProcessTime = Date.now() - startPaymentProcess;
                        logger.debug(logSystem, logComponent, 'Finished sending all confirmed payments to users');
                        return;
                    }
                    else {
                        var paymentProcessTime = Date.now() - startPaymentProcess;
                        logger.debug(logSystem, logComponent, 'Finished running status checks for payment processing');
                        return;
                    }
                });

            }
        ]);
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
