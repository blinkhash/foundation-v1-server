/*
 *
 * PoolWorker (Updated)
 *
 */

// Import Required Modules
var redis = require('redis');
var net = require('net');

// Import Stratum/PoolShares Modules
var PoolShares = require('./shares.js');
var Stratum = require('stratum-pool');

// Pool Worker Main Function
var PoolWorker = function (logger) {

    // Load Useful Data from Process
    var forkId = process.env.forkId;
    var poolConfigs = JSON.parse(process.env.pools);
    var portalConfig = JSON.parse(process.env.portalConfig);
    var redisClient = redis.createClient(portalConfig.redis.port, portalConfig.redis.host);

    // Establsh Helper Variables
    var _this = this;
    var pools = {};

    // Handle IPC Messages
    process.on('message', function(message) {
        switch (message.type) {

            // Handle IP Banning
            case 'banIP':
                for (var p in pools) {
                    if (pools[p].stratumServer)
                        pools[p].stratumServer.addBannedIP(message.ip);
                }
                break;

        }
    });

    // Manage Pool Configs for Each Coin
    Object.keys(poolConfigs).forEach(function(coin) {

        // Establish Log Variables
        var logSystem = 'Pool';
        var logComponent = coin;
        var logSubCat = 'Thread ' + (parseInt(forkId) + 1);

        // Establish Pool Variables
        var poolOptions = poolConfigs[coin];
        var sharesProcessor = new PoolShares(logger, poolOptions);
        var handlers = {
            auth: function() {},
            share: function() {},
            diff: function() {}
        };

        // Establish Worker Authentication
        handlers.auth = function(port, workerName, password, authCallback) {
            if (poolOptions.validateWorkerUsername !== true)
                authCallback(true);
            else {
                if (workerName.length === 40) {
                    try {
                        new Buffer(workerName, 'hex');
                        authCallback(true);
                    }
                    catch (e) {
                        authCallback(false);
                    }
                }
                else {
                    pool.daemon.cmd('validateaddress', [workerName], function (results) {
                        var isValid = results.filter(function (r) {
                            return r.response.isvalid
                        }).length > 0;
                        authCallback(isValid);
                    });
                }
            }
        };

        // Establish Worker Share Handling
        handlers.share = function(isValidShare, isValidBlock, data) {
            sharesProcessor.handleShare(isValidShare, isValidBlock, data);
        };

        // Authenticate Worker
        var authorizeFN = function (ip, port, workerName, password, callback) {
            handlers.auth(port, workerName, password, function(authorized) {
                var authString = authorized ? 'Authorized' : 'Unauthorized ';
                logger.debug(logSystem, logComponent, logSubCat, authString + ' ' + workerName + ':' + password + ' [' + ip + ']');
                callback({
                    error: null,
                    authorized: authorized,
                    disconnect: false
                });
            });
        };

        // Establish Pool Share Handling
        var pool = Stratum.createPool(poolOptions, authorizeFN, logger);
        pool.on('share', function(isValidShare, isValidBlock, data) {

            // Checks for Block Data
            var shareData = JSON.stringify(data);
            if (data.blockHash && !isValidBlock)
                logger.debug(logSystem, logComponent, logSubCat, 'We thought a block was found but it was rejected by the daemon, share data: ' + shareData);
            else if (isValidBlock)
                logger.debug(logSystem, logComponent, logSubCat, 'Block found: ' + data.blockHash + ' by ' + data.worker);

            // Checks for Share Data
            if (isValidShare) {
                if (data.shareDiff > 1000000000)
                    logger.debug(logSystem, logComponent, logSubCat, 'Share was found with diff higher than 1.000.000.000!');
                else if (data.shareDiff > 1000000)
                    logger.debug(logSystem, logComponent, logSubCat, 'Share was found with diff higher than 1.000.000!');
                logger.debug(logSystem, logComponent, logSubCat, 'Share accepted at diff ' + data.difficulty + '/' + data.shareDiff + ' by ' + data.worker + ' [' + data.ip + ']' );
            } else if (!isValidShare)
                logger.debug(logSystem, logComponent, logSubCat, 'Share rejected: ' + shareData);

            // Manage Share Data
            handlers.share(isValidShare, isValidBlock, data)

        // Establish Pool Functionality
        }).on('difficultyUpdate', function(workerName, diff) {
            logger.debug(logSystem, logComponent, logSubCat, 'Difficulty update to diff ' + diff + ' workerName=' + JSON.stringify(workerName));
            handlers.diff(workerName, diff);
        }).on('log', function(severity, text) {
            logger[severity](logSystem, logComponent, logSubCat, text);
        }).on('banIP', function(ip, worker) {
            process.send({type: 'banIP', ip: ip});
        });

        // Start Pool from Server
        pool.start();
        pools[poolOptions.coin.name] = pool;
    });

};

// Export Pool Worker
module.exports = PoolWorker;
