/*
 *
 * PoolStats (Updated)
 *
 */

// Import Required Modules
var zlib = require('zlib');
var redis = require('redis');
var async = require('async');
var os = require('os');

// Import Stratum Algorithms
var algos = require('stratum-pool/lib/algoProperties.js');

// Create Client Given Redis Info
function createClient(port, host, pass) {
    var redisClient = redis.createClient(port, host);
    if (pass) {
        redisClient.auth(pass);
    }
    return client;
}

// Sort Object Properties Given Info
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
var PoolStats = function (logger, portalConfig, poolConfigs) {

    // Establsh Helper Variables
    var _this = this;
    var redisClients = [];
    var redisStats;

    // Establish Log Variables
    var logSystem = 'Stats';

    // Establish Stat Variables
    this.stats = {};
    this.statsString = '';

    // Gather Stats from Database
    var canDoStats = true;
    setupStatsRedis();

    // Iterate Through Each Coin File
    Object.keys(poolConfigs).forEach(function(coin) {

        // Check to Ensure Stats are Active
        if (!canDoStats) return;
        var poolConfig = poolConfigs[coin];
        var redisConfig = poolConfig.redis;

        // Push Configurations to Each Redis Client
        for (var i = 0; i < redisClients.length; i++) {
            var client = redisClients[i];
            if (client.client.port === redisConfig.port && client.client.host === redisConfig.host) {
                client.coins.push(coin);
                return;
            }
        }
        redisClients.push({
            coins: [coin],
            client: redis.createClient(redisConfig.port, redisConfig.host)
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

    // Connect to Redis Database
    function setupStatsRedis() {
        redisStats = redis.createClient(portalConfig.redis.port, portalConfig.redis.host);
        redisStats.on('error', function(err) {
            logger.error(logSystem, 'History', 'Redis for stats had an error ' + JSON.stringify(err));
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
    }

    // Sort All Blocks
    function sortBlocks(a, b) {
        var as = parseInt(JSON.parse(a).height);
        var bs = parseInt(JSON.parse(b).height);
        if (as > bs) return -1;
        if (as < bs) return 1;
        return 0;
    }

    this.getBalanceByAddress = function(address, callback) {
        var a = address.split(".")[0];
        var client = redisClients[0].client,
        coins = redisClients[0].coins,
        balances = [];

        var totalBalance = parseFloat(0);
        var totalImmature = parseFloat(0);
        var totalPaid = parseFloat(0);
        var totalUnpaid = parseFloat(0);

        async.each(_this.stats, function(pool, pcb) {
            var coin = String(_this.stats[pool.name].name);
            client.hscan(coin + ':payments:balances', 0, "match", a+"*", "count", 10000, function(error, bals) {
                client.hscan(coin + ':payments:immature', 0, "match", a+"*", "count", 10000, function(error, pends) {
                    client.hscan(coin + ':payments:payouts', 0, "match", a+"*", "count", 10000, function(error, pays) {
                        client.hscan(coin + ':payments:unpaid', 0, "match", a+"*", "count", 10000, function(error, unpays) {

                            var workerName = "";
                            var balanceAmount = 0;
                            var immatureAmount = 0;
                            var paidAmount = 0;
                            var unpaidAmount = 0;
                            var workers = {};

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

                            for (var w in workers) {
                                balances.push({
                                    worker: String(w),
                                    balance: workers[w].balance,
                                    immature: workers[w].immature,
                                    paid: workers[w].paid,
                                    unpaid: workers[w].unpaid,
                                });
                            }
                            pcb();
                        });
                    });
                });
            });
        }, function(err) {
            if (err) {
                callback("There was an error getting balances");
                return;
            }
            _this.stats.balances = balances;
            _this.stats.address = address;
            callback({
                totalBalance: coinsRound(totalBalance),
                totalImmature: coinsRound(totalImmature),
                totalPaid: coinsRound(totalPaid),
                totalUnpaid: coinsRound(totalUnpaid),
                balances: balances
            });
        });
    };

    this.getTotalSharesByAddress = function(address, callback) {
        var a = address.split(".")[0];
        var client = redisClients[0].client,
        coins = redisClients[0].coins,
        shares = [];

        var pindex = parseInt(0);
        var totalShares = parseFloat(0);
        async.each(_this.stats, function(pool, pcb) {
            pindex++;
            var coin = String(_this.stats[pool.name].name);
            client.hscan(coin + ':shares:roundCurrent', 0, "match", a+"*", "count", 1000, function(err, result) {
                if (err) {
                    pcb(err);
                    return;
                }
                var workerName = "";
                var shares = 0;
                for (var i in result[1]) {
                    if (Math.abs(i % 2) != 1) {
                        workerName = String(result[1][i]);
                    }
                    else {
                        shares += parseFloat(result[1][i]);
                    }
                }
                if (shares > 0) {
                    totalShares = shares;
                }
                pcb();
            });
        }, function(err) {
            if (err) {
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
                ['zremrangebyscore', ':statistics:hashrate', '-inf', '(' + windowTime],
                ['zrangebyscore', ':statistics:hashrate', windowTime, '+inf'],
                ['hgetall', ':statistics:basic'],
                ['scard', ':blocks:pending'],
                ['scard', ':blocks:confirmed'],
                ['scard', ':blocks:kicked'],
                ['smembers', ':blocks:pending'],
                ['smembers', ':blocks:confirmed'],
                ['hgetall', ':blocks:pendingConfirms'],
                ['hgetall', ':shares:roundCurrent'],
                ['zrange', ':payments', -100, -1],
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
            client.client.multi(redisCommands).exec(function(err, replies) {
                if (err) {
                    logger.error(logSystem, 'Global', 'error with getting global stats ' + JSON.stringify(err));
                    callback(err);
                }
                else {
                    for (var i = 0; i < replies.length; i += commandsPerCoin) {
                        var coinName = client.coins[i / commandsPerCoin | 0];
                        var coinStats = {
                            name: coinName,
                            symbol: poolConfigs[coinName].coin.symbol.toUpperCase(),
                            algorithm: poolConfigs[coinName].coin.algorithm,
                            hashrates: replies[i + 1],
                            poolStats: {
                                validShares: replies[i + 2] ? (replies[i + 2].validShares || 0) : 0,
                                validBlocks: replies[i + 2] ? (replies[i + 2].validBlocks || 0) : 0,
                                invalidShares: replies[i + 2] ? (replies[i + 2].invalidShares || 0) : 0,
                                lastPaid: replies[i + 2] ? (replies[i + 2].lastPaid || 0) : 0,
                                totalPaid: replies[i + 2] ? (replies[i + 2].totalPaid || 0) : 0
                            },
                            blocks: {
                                pending: replies[i + 3],
                                confirmed: replies[i + 4],
                                orphaned: replies[i + 5]
                            },
                            pending: replies[i + 6].sort(sortBlocks),
                            confirmed: replies[i + 7].sort(sortBlocks).slice(0,50),
                            pendingConfirms: replies[i + 8],
                            roundShares: (replies[i + 9] || {}),
                            payments: [],
                        };
                        for (var j = replies[i + 10].length; j > 0; j--) {
                            var jsonObj;
                            try {
                                jsonObj = JSON.parse(replies[i + 10][j - 1]);
                            }
                            catch(e) {
                                jsonObj = null;
                            }
                            if (jsonObj !== null) {
                                coinStats.payments.push(jsonObj);
                            }
                        }
                        allCoinStats[coinStats.name] = (coinStats);
                    }
                    allCoinStats = sortPools(allCoinStats);
                    callback();
                }
            });
        }, function(err) {

            // Handle Errors
            if (err) {
                logger.error(logSystem, 'Global', 'error getting all stats' + JSON.stringify(err));
                callback();
                return;
            }

            // Get Client Statistics for Each Coin
            Object.keys(allCoinStats).forEach(function(coin) {

                var coinStats = allCoinStats[coin];
                coinStats.workers = {};
                coinStats.shares = 0;
                coinStats.hashrates.forEach(function(ins) {

                    var parts = JSON.parse(ins);
                    var workerShares = parseFloat(parts.difficulty);
                    var worker = parts.worker;
                    var difficulty = Math.round(parts.difficulty);
                    var soloMining = parts.soloMined;

                    if (workerShares > 0) {
                        coinStats.shares += workerShares;
                        if (worker in coinStats.workers) {
                            coinStats.workers[worker].validShares += workerShares;
                            coinStats.workers[worker].difficulty = difficulty;
                        }
                        else {
                            coinStats.workers[worker] = {
                                difficulty: difficulty,
                                validShares: workerShares,
                                invalidShares: 0,
                                algorithm: coinStats.algorithm,
                                soloMining: soloMining,
                                hashrate: null,
                                hashrateString: null,
                            };
                        }
                    }
                    else {
                        if (worker in coinStats.workers) {
                            coinStats.workers[worker].invalidShares -= workerShares;
                            coinStats.workers[worker].difficulty = difficulty;
                        }
                        else {
                            coinStats.workers[worker] = {
                                difficulty: difficulty,
                                validShares: 0,
                                invalidShares: -workerShares,
                                algorithm: coinStats.algorithm,
                                soloMining: soloMining,
                                hashrate: null,
                                hashrateString: null,
                            };
                        }
                    }
                });

                // Finalize Client Statistics for Coins
                var shareMultiplier = Math.pow(2, 32) / algos[coinStats.algorithm].multiplier;

                coinStats.hashrate = shareMultiplier * coinStats.shares / portalConfig.stats.hashrateWindow;
                coinStats.workerCount = Object.keys(coinStats.workers).length;

                for (var worker in coinStats.roundShares) {
                    if (worker in coinStats.workers) {
                        coinStats.workers[worker].roundShares += parseFloat(coinStats.roundShares[worker]);
                    }
                }

                for (var worker in coinStats.workers) {
                    var _workerRate = shareMultiplier * coinStats.workers[worker].validShares / portalConfig.stats.hashrateWindow;
                    var _wHashRate = (_workerRate / 1000000) * 2;
                    coinStats.workers[worker].hashrate = _workerRate;
                }

                // Clean Up Information
                delete coinStats.hashrates;
                delete coinStats.shares;
            });

            // Finalize Given Data
            _this.stats = allCoinStats;
            _this.statsString = JSON.stringify(allCoinStats);
            callback();
        });
    };
};

// Export Pool Stats
module.exports = PoolStats;
