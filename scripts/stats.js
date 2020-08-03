/*
 *
 * PoolStats (Updated)
 *
 */

// Import Required Modules
var redis = require('redis');
var async = require('async');
var RedisClustr = require('redis-clustr');

// Import Stratum Algorithms
var algos = require('stratum-pool/lib/algoProperties.js');

// Sort Object Properties Given Info
/* eslint-disable no-prototype-builtins */
function sortProperties(obj, sortedBy, isNumericSort, reverse) {
    sortedBy = sortedBy || 1;
    isNumericSort = isNumericSort || false;
    reverse = reverse || false;
    var reversed = (reverse) ? -1 : 1;
    var sortable = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            sortable.push([key, obj[key]]);
        }
    }
    if (isNumericSort) {
        sortable.sort(function (a, b) {
            return reversed * (a[1][sortedBy] - b[1][sortedBy]);
        });
    }
    else {
        sortable.sort(function (a, b) {
            var x = a[1][sortedBy].toLowerCase(),
            y = b[1][sortedBy].toLowerCase();
            return x < y ? reversed * -1 : x > y ? reversed : 0;
        });
    }
    return sortable;
}

// Pool Stats Main Function
var PoolStats = function (logger, poolConfigs, portalConfig) {

    // Establsh Helper Variables
    var _this = this;
    var redisClients = [];
    var redisStats;

    // Establish Log Variables
    var logSystem = 'Stats';

    // Establish Stat Variables
    this.stats = {};

    // Gather Stats from Database
    setupStatsRedis();
    var canDoStats = true;

    // Iterate Through Each Coin File
    Object.keys(poolConfigs).forEach(function(coin) {

        // Check to Ensure Stats are Active
        if (!canDoStats) return;
        var poolConfig = poolConfigs[coin];
        var redisConfig = portalConfig.redis;

        // Push Configurations to Each Redis Client
        for (var i = 0; i < redisClients.length; i++) {
            var client = redisClients[i];
            if (client.client.port === redisConfig.port && client.client.host === redisConfig.host) {
                client.coins.push(coin);
                return;
            }
        }

        // Establish Redis Client
        var redisClient;
        if (redisConfig.cluster) {
            redisClient = new RedisClustr({
                servers: [{
                    host: redisConfig.host,
                    port: redisConfig.port,
                }],
                createClient: function(port, host) {
                    return redis.createClient(port, host);
                }
            });
        }
        else {
            redisClient = redis.createClient(
                redisConfig.port,
                redisConfig.host
            );
        }

        redisClients.push({
            coins: [coin],
            client: redisClient,
        });
    });

    var magnitude = 100000000;
    var coinPrecision = magnitude.toString().length - 1;

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

    // Round Coins to Nearest Value Given Precision
    function coinsRound(number) {
        return roundTo(number, coinPrecision);
    }

    // Connect to Redis Database
    function setupStatsRedis() {
        var redisStats;
        if (portalConfig.redis.cluster) {
            redisStats = new RedisClustr({
                servers: [{
                    host: portalConfig.redis.host,
                    port: portalConfig.redis.port,
                }],
                createClient: function(port, host) {
                    return redis.createClient(port, host);
                }
            });
        }
        else {
            redisStats = redis.createClient(
                portalConfig.redis.port,
                portalConfig.redis.host
            );
        }
        redisStats.on('error', function(error) {
            logger.error(logSystem, 'History', `Redis for stats had an error ${  JSON.stringify(error)}`);
        });
    }

    // Sort All Pools
    function sortPools(objects) {
        var newObject = {};
        var sortedArray = sortProperties(objects, 'name', false, false);
        for (var i = 0; i < sortedArray.length; i++) {
            var key = sortedArray[i][0];
            var value = sortedArray[i][1];
            newObject[key] = value;
        }
        return newObject;
    }/* eslint-disable no-prototype-builtins */

    // Sort All Blocks
    function sortBlocks(a, b) {
        var as = parseInt(JSON.parse(a).height);
        var bs = parseInt(JSON.parse(b).height);
        if (as > bs) return -1;
        if (as < bs) return 1;
        return 0;
    }

    // Get Balance From Address
    this.getBalanceByAddress = function(address, callback) {
        var client = redisClients[0].client;
        var totalBalance = parseFloat(0);
        var totalImmature = parseFloat(0);
        var totalPaid = parseFloat(0);
        var totalUnpaid = parseFloat(0);

        // Load Statistics from All Pools
        async.each(_this.stats, function(pool, pcb) {
            var coin = String(_this.stats[pool.name].name);
            client.hscan(`${coin}:payments:balances`, 0, "match", `${address}*`, "count", 10000, function(error, bals) {
                client.hscan(`${coin}:payments:immature`, 0, "match", `${address}*`, "count", 10000, function(error, pends) {
                    client.hscan(`${coin}:payments:payouts`, 0, "match", `${address}*`, "count", 10000, function(error, pays) {
                        client.hscan(`${coin}:payments:unpaid`, 0, "match", `${address}*`, "count", 10000, function(error, unpays) {

                            var workerName = "";
                            var balanceAmount = 0;
                            var immatureAmount = 0;
                            var paidAmount = 0;
                            var unpaidAmount = 0;
                            var workers = {};

                            // Update Balances
                            for (var b in bals[1]) {
                                if (Math.abs(b % 2) != 1) {
                                    workerName = String(bals[1][b]);
                                    workers[workerName] = (workers[workerName] || {});
                                }
                                else {
                                    balanceAmount = parseFloat(bals[1][b]);
                                    workers[workerName].balance = coinsRound(balanceAmount);
                                    totalBalance += balanceAmount;
                                }
                            }

                            // Update Immature
                            for (var b in pends[1]) {
                                if (Math.abs(b % 2) != 1) {
                                    workerName = String(pends[1][b]);
                                    workers[workerName] = (workers[workerName] || {});
                                }
                                else {
                                    immatureAmount = parseFloat(pends[1][b]);
                                    workers[workerName].immature = coinsRound(immatureAmount);
                                    totalImmature += immatureAmount;
                                }
                            }

                            // Update Payouts
                            for (var i in pays[1]) {
                                if (Math.abs(i % 2) != 1) {
                                    workerName = String(pays[1][i]);
                                    workers[workerName] = (workers[workerName] || {});
                                }
                                else {
                                    paidAmount = parseFloat(pays[1][i]);
                                    workers[workerName].paid = coinsRound(paidAmount);
                                    totalPaid += paidAmount;
                                }
                            }

                            // Update Unpaid
                            for (var i in unpays[1]) {
                                if (Math.abs(i % 2) != 1) {
                                    workerName = String(unpays[1][i]);
                                    workers[workerName] = (workers[workerName] || {});
                                }
                                else {
                                    unpaidAmount = parseFloat(unpays[1][i]);
                                    workers[workerName].unpaid = coinsRound(unpaidAmount);
                                    totalUnpaid += unpaidAmount;
                                }
                            }

                            pcb();
                        });
                    });
                });
            });
        }, function(error) {
            if (error) {
                callback("There was an error getting balances");
                return;
            }
            callback({
                totalBalance: coinsRound(totalBalance),
                totalImmature: coinsRound(totalImmature),
                totalPaid: coinsRound(totalPaid),
                totalUnpaid: coinsRound(totalUnpaid),
            });
        });
    };

    // Get Shares From Address
    this.getTotalSharesByAddress = function(address, callback) {
        var client = redisClients[0].client;
        var pindex = parseInt(0);
        var totalShares = parseFloat(0);

        // Load Statistics from All Pools
        async.each(_this.stats, function(pool, pcb) {
            pindex++;
            var coin = String(_this.stats[pool.name].name);
            client.hscan(`${coin  }:shares:roundCurrent`, 0, "match", `${address}*`, "count", 1000, function(error, result) {
                if (error) {
                    pcb(error);
                    return;
                }
                var shares = 0;
                for (var i in result[1]) {
                    if (Math.abs(i % 2) == 1) {
                        shares += parseFloat(result[1][i]);
                    }
                }
                if (shares > 0) {
                    totalShares = shares;
                }
                pcb();
            });
        }, function(error) {
            if (error) {
                callback(0);
                return;
            }
            if (totalShares > 0 || (pindex >= Object.keys(_this.stats).length)) {
                callback(totalShares);
                return;
            }
        });
    };

    // Get ALL Stats from Pool/Database
    this.getGlobalStats = function(callback) {

        var allCoinStats = {};
        var statGatherTime = Date.now() / 1000 | 0;
        async.each(redisClients, function(client, callback) {

            // Establish Redis Variables
            var windowTime = (((Date.now() / 1000) - portalConfig.stats.hashrateWindow) | 0).toString();
            var redisCommands = [];
            var redisCommandTemplates = [
                ['zrangebyscore', ':statistics:hashrate', windowTime, '+inf'],
                ['hgetall', ':statistics:history'],
                ['hgetall', ':statistics:basic'],
                ['scard', ':blocks:pending'],
                ['scard', ':blocks:confirmed'],
                ['scard', ':blocks:kicked'],
                ['smembers', ':blocks:pending'],
                ['smembers', ':blocks:confirmed'],
                ['hgetall', ':blocks:pendingConfirms'],
                ['hgetall', ':shares:roundCurrent'],
                ['hgetall', ':times:timesCurrent'],
                ['zrange', ':payments:payments', -100, -1],
            ];

            // Get Templates for Each Coin
            var commandsPerCoin = redisCommandTemplates.length;
            client.coins.map(function(coin) {
                redisCommandTemplates.map(function(t) {
                    var clonedTemplates = t.slice(0);
                    clonedTemplates[1] = coin + clonedTemplates[1];
                    redisCommands.push(clonedTemplates);
                });
            });


            // Get Global Statistics for Each Coin
            client.client.multi(redisCommands).exec(function(error, replies) {
                if (error) {
                    logger.error(logSystem, 'Global', `error with getting global stats ${  JSON.stringify(error)}`);
                    callback(error);
                }

                // Establish Initial Statistics for Coins
                for (var i = 0; i < replies.length; i += commandsPerCoin) {
                    var coinName = client.coins[i / commandsPerCoin | 0];
                    var coinStats = {
                        name: coinName,
                        symbol: poolConfigs[coinName].coin.symbol.toUpperCase(),
                        algorithm: poolConfigs[coinName].coin.algorithm,
                        featured: poolConfigs[coinName].featured,
                        fees: poolConfigs[coinName].fees,
                        ports: poolConfigs[coinName].ports,
                        blocks: {
                            pending: replies[i + 6].sort(sortBlocks),
                            confirmed: replies[i + 7].sort(sortBlocks),
                            confirmations: replies[i + 8],
                            pendingCount: replies[i + 3],
                            confirmedCount: replies[i + 4],
                            orphanedCount: replies[i + 5],
                        },
                        hashrate: {
                            hashrate: 0,
                            hashrateShared: 0,
                            hashrateSolo: 0,
                            hashrates: replies[i + 0],
                        },
                        history: [],
                        shares: {
                            shares: 0,
                            roundShares: (replies[i + 9] || {}),
                            roundTimes: (replies[i + 10] || {}),
                        },
                        statistics: {
                            validShares: replies[i + 2] ? (replies[i + 2].validShares || 0) : 0,
                            validBlocks: replies[i + 2] ? (replies[i + 2].validBlocks || 0) : 0,
                            invalidShares: replies[i + 2] ? (replies[i + 2].invalidShares || 0) : 0,
                            lastPaid: replies[i + 2] ? (replies[i + 2].lastPaid || 0) : 0,
                            totalPaid: replies[i + 2] ? (replies[i + 2].totalPaid || 0) : 0,
                            paymentTime: poolConfigs[coinName].paymentProcessing.paymentInterval,
                            paymentMinimum: poolConfigs[coinName].paymentProcessing.minimumPayment
                        },
                        payments: [],
                        workers: {
                            workers: {},
                            workersShared: {},
                            workersSolo: {},
                            workersCount: 0,
                            workersSharedCount: 0,
                            workersSoloCount: 0,
                        },
                    };

                    // Calculate Historical Data
                    var jsonObj = null;
                    try {
                        jsonObj = JSON.parse(replies[i + 1].history);
                    }
                    /* eslint-disable-next-line no-empty */
                    catch(e) {}
                    if (jsonObj !== null) {
                        coinStats.history = jsonObj;
                    }

                    // Calculate Payment Data
                    for (var j = replies[i + 11].length; j > 0; j--) {
                        var jsonObj = null;
                        try {
                            jsonObj = JSON.parse(replies[i + 11][j - 1]);
                        }
                        /* eslint-disable-next-line no-empty */
                        catch(e) {}
                        if (jsonObj !== null) {
                            coinStats.payments.push(jsonObj);
                        }
                    }
                    allCoinStats[coinStats.name] = (coinStats);
                }

                // Calculate Specific Statistics for Coins
                allCoinStats = sortPools(allCoinStats);
                Object.keys(allCoinStats).forEach(function(coin) {
                    var coinStats = allCoinStats[coin];

                    // Calculate Hashrate Data
                    coinStats.hashrate.hashrates.forEach(function(ins) {

                        var parts = JSON.parse(ins);
                        var workerShares = parseFloat(parts.difficulty);
                        var worker = parts.worker;
                        var difficulty = Math.round(parts.difficulty);
                        var soloMining = parts.soloMined;

                        if (workerShares > 0) {
                            coinStats.shares.shares += workerShares;
                            if (worker in coinStats.workers) {
                                coinStats.workers.workers[worker].validShares += workerShares;
                                coinStats.workers.workers[worker].difficulty = difficulty;
                            }
                            else {
                                coinStats.workers.workers[worker] = {
                                    difficulty: difficulty,
                                    validShares: workerShares,
                                    invalidShares: 0,
                                    hashrate: null,
                                    soloMining: soloMining,
                                };
                            }
                        }
                        else {
                            if (worker in coinStats.workers.workers) {
                                coinStats.workers.workers[worker].invalidShares -= workerShares;
                                coinStats.workers.workers[worker].difficulty = difficulty;
                            }
                            else {
                                coinStats.workers.workers[worker] = {
                                    difficulty: difficulty,
                                    validShares: 0,
                                    invalidShares: -workerShares,
                                    hashrate: null,
                                    soloMining: soloMining,
                                };
                            }
                        }
                    });

                    // Calculate Worker Data
                    for (var worker in coinStats.shares.roundShares) {
                        if (worker in coinStats.workers.workers) {
                            coinStats.workers.workers[worker].roundShares += parseFloat(coinStats.shares.roundShares[worker]);
                        }
                    }
                    for (var worker in coinStats.workers.workers) {
                        var shareMultiplier = Math.pow(2, 32) / algos[coinStats.algorithm].multiplier;
                        var _workerRate = shareMultiplier * coinStats.workers.workers[worker].validShares / portalConfig.stats.hashrateWindow;
                        coinStats.workers.workers[worker].hashrate = _workerRate;
                        if (!coinStats.workers.workers[worker].soloMining) {
                            coinStats.workers.workersShared[worker] = coinStats.workers.workers[worker]
                            coinStats.hashrate.hashrateShared += _workerRate
                            coinStats.hashrate.hashrate += _workerRate
                        }
                        else {
                            coinStats.workers.workersSolo[worker] = coinStats.workers.workers[worker]
                            coinStats.hashrate.hashrateSolo += _workerRate
                            coinStats.hashrate.hashrate += _workerRate
                        }
                    }

                    // Calculate WorkerCounts Data
                    coinStats.workers.workersCount = Object.keys(coinStats.workers.workers).length;
                    coinStats.workers.workersSharedCount = Object.keys(coinStats.workers.workersShared).length;
                    coinStats.workers.workersSoloCount = Object.keys(coinStats.workers.workersSolo).length;

                    // Calculate Current Historical Data
                    var currentData = {
                        time: statGatherTime,
                        hashrateSolo: coinStats.hashrate.hashrateSolo,
                        hashrateShared: coinStats.hashrate.hashrateShared,
                        workersSolo: coinStats.workers.workersSoloCount,
                        workersShared: coinStats.workers.workersSharedCount,
                    }

                    // Update Historical Data
                    coinStats.history.push(currentData);
                    var historicalInterval = (((Date.now() / 1000) - portalConfig.stats.historicalInterval) | 0);
                    var retentionTime = (((Date.now() / 1000) - portalConfig.stats.historicalRetention) | 0);

                    // Remove Data Past Retention Time
                    var historicalData = coinStats.history.filter(function(history) {
                        return history.time > retentionTime;
                    });

                    // Write Updated Data to Redis
                    var historicalDataString = JSON.stringify(historicalData);
                    if (historicalData.length <= 1) {
                        client.client.hset(`${String(coinStats.name)  }:statistics:history`, "history", historicalDataString);
                    }
                    else if (historicalInterval > historicalData[historicalData.length - 2].time) {
                        client.client.hset(`${String(coinStats.name)  }:statistics:history`, "history", historicalDataString);
                    }

                    // Clean Up Information
                    delete coinStats.hashrate.hashrates;
                    delete coinStats.hashrate.shares;
                });


                // Finalize Statistics
                _this.stats = allCoinStats;

                // Trigger Callback
                callback();
            });

        }, function(error) {
            if (error) {
                logger.error(logSystem, 'Global', `error getting all stats${  JSON.stringify(error)}`);
                callback();
                return;
            }

            // Trigger Callback
            callback();
        });
    };
};

// Export Pool Stats
module.exports = PoolStats;
