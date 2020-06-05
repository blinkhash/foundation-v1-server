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

// Pool Stats Main Function
var PoolStats = function (logger, portalConfig, poolConfigs) {

    // Establsh Helper Variables
    var _this = this;
    var redisClients = [];
    var redisStats;

    // Establish Log Variables
    var logSystem = 'Stats';

    // Establish Stat Variables
    this.statHistory = [];
    this.statPoolHistory = [];
    this.stats = {};
    this.statsString = '';

    // Gather Stats from Database
    var canDoStats = true;
    setupStatsRedis();
    gatherStatHistory();

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

    // Connect to Redis Database
    function setupStatsRedis() {
        redisStats = redis.createClient(portalConfig.redis.port, portalConfig.redis.host);
        redisStats.on('error', function(err) {
            logger.error(logSystem, 'Historics', 'Redis for stats had an error ' + JSON.stringify(err));
        });
    }

    // Get Stat History
    function gatherStatHistory() {
        var retentionTime = (((Date.now() / 1000) - portalConfig.stats.historicalRetention) | 0).toString();
        logger.debug(logSystem, 'History', 'Gathering Statistics for Website API');
        redisStats.zrangebyscore(['statHistory', retentionTime, '+inf'], function(err, replies) {
            if (err) {
                logger.error(logSystem, 'Historics', 'Error when trying to grab historical stats ' + JSON.stringify(err));
                return;
            }
            for (var i = 0; i < replies.length; i++) {
                _this.statHistory.push(JSON.parse(replies[i]));
            }
            _this.statHistory = _this.statHistory.sort(function(a, b) {
                return a.time - b.time;
            });
            _this.statHistory.forEach(function(stats) {
                addStatPoolHistory(stats);
            });
        });
    }

    // Append to Stat History
    function addStatPoolHistory(stats) {
        var data = {
            time: stats.time,
            pools: {}
        };
        for (var pool in stats.pools) {
            data.pools[pool] = {
                hashrate: stats.pools[pool].hashrate,
                workerCount: stats.pools[pool].workerCount,
                blocks: stats.pools[pool].blocks
            }
        }
        _this.statPoolHistory.push(data);
    }

    // Convert Hashrate into Readable String
    this.getReadableHashRateString = function(hashrate) {
        var i = -1;
        var byteUnits = [ ' KH', ' MH', ' GH', ' TH', ' PH' ];
        do {
            hashrate = hashrate / 1000;
			i++;
        } while (hashrate > 1000);
        return hashrate.toFixed(2) + byteUnits[i];
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
                ['zremrangebyscore', ':hashrate', '-inf', '(' + windowTime],
                ['zrangebyscore', ':hashrate', windowTime, '+inf'],
                ['hgetall', ':stats'],
                ['scard', ':blocksPending'],
                ['scard', ':blocksConfirmed'],
                ['scard', ':blocksKicked']
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
                                totalPaid: replies[i + 2] ? (replies[i + 2].totalPaid || 0) : 0
                            },
                            blocks: {
                                pending: replies[i + 3],
                                confirmed: replies[i + 4],
                                orphaned: replies[i + 5]
                            }
                        };
                        allCoinStats[coinStats.name] = (coinStats);
                    }
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

            // Establish Client Variables
            var portalStats = {
                time: statGatherTime,
                global:{
                    workers: 0,
                    hashrate: 0
                },
                algos: {},
                pools: allCoinStats
            };

            // Get Client Statistics for Each Coin
            Object.keys(allCoinStats).forEach(function(coin) {

                var coinStats = allCoinStats[coin];
                coinStats.workers = {};
                coinStats.shares = 0;
                coinStats.hashrates.forEach(function(ins) {
                    var parts = ins.split(':');
                    var workerShares = parseFloat(parts[0]);
                    var worker = parts[1];
                    if (workerShares > 0) {
                        coinStats.shares += workerShares;
                        if (worker in coinStats.workers)
                            coinStats.workers[worker].shares += workerShares;
                        else
                            coinStats.workers[worker] = {
                                shares: workerShares,
                                invalidshares: 0,
                                hashrateString: null
                            };
                    }
                    else {
                        if (worker in coinStats.workers)
                            coinStats.workers[worker].invalidshares -= workerShares; // workerShares is negative number!
                        else
                            coinStats.workers[worker] = {
                                shares: 0,
                                invalidshares: -workerShares,
                                hashrateString: null
                            };
                    }
                });

                // Finalize Client Statistics for Each Coin
                var shareMultiplier = Math.pow(2, 32) / algos[coinStats.algorithm].multiplier;
                coinStats.hashrate = shareMultiplier * coinStats.shares / portalConfig.stats.hashrateWindow;
                coinStats.workerCount = Object.keys(coinStats.workers).length;
                portalStats.global.workers += coinStats.workerCount;

                // Algorithm-Specific Statistics
                var algo = coinStats.algorithm;
                if (!portalStats.algos.hasOwnProperty(algo)) {
                    portalStats.algos[algo] = {
                        workers: 0,
                        hashrate: 0,
                        hashrateString: null
                    };
                }
                portalStats.algos[algo].hashrate += coinStats.hashrate;
                portalStats.algos[algo].workers += Object.keys(coinStats.workers).length;

                // Clean Up Information
                for (var worker in coinStats.workers) {
                    coinStats.workers[worker].hashrateString = _this.getReadableHashRateString(shareMultiplier * coinStats.workers[worker].shares / portalConfig.stats.hashrateWindow);
                }
                delete coinStats.hashrates;
                delete coinStats.shares;
                coinStats.hashrateString = _this.getReadableHashRateString(coinStats.hashrate);
            });

            // Clean Up Information
            Object.keys(portalStats.algos).forEach(function(algo) {
                var algoStats = portalStats.algos[algo];
                algoStats.hashrateString = _this.getReadableHashRateString(algoStats.hashrate);
            });

            // Set Global Statistics
            _this.stats = portalStats;
            _this.statsString = JSON.stringify(portalStats);
            _this.statHistory.push(portalStats);
            addStatPoolHistory(portalStats);

            // Remove Data Stored Past Retention Time
            var retentionTime = (((Date.now() / 1000) - portalConfig.stats.historicalRetention) | 0);
            for (var i = 0; i < _this.statHistory.length; i++) {
                if (retentionTime < _this.statHistory[i].time) {
                    if (i > 0) {
                        _this.statHistory = _this.statHistory.slice(i);
                        _this.statPoolHistory = _this.statPoolHistory.slice(i);
                    }
                    break;
                }
            }

            // Append to Stat History
            redisStats.multi([
                ['zadd', 'statHistory', statGatherTime, _this.statsString],
                ['zremrangebyscore', 'statHistory', '-inf', '(' + retentionTime]
            ]).exec(function(err, replies) {
                if (err)
                    logger.error(logSystem, 'Historics', 'Error adding stats to historics ' + JSON.stringify(err));
            });
            callback();
        });
    };

};

// Export Pool Stats
module.exports = PoolStats;
