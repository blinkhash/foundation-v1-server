/*
 *
 * PoolShares (Updated)
 *
 */

// Import Required Modules
var redis = require('redis');

// Import Stratum Module
var Stratum = require('stratum-pool');

// Pool Payments Main Function
var PoolShares = function (logger, poolConfig) {

    // Establish Shares Variables
    var redisConfig = poolConfig.redis;
    var coin = poolConfig.coin.name;
    var forkId = process.env.forkId;

    // Establish Log Variables
    var logSystem = 'Pool';
    var logComponent = coin;
    var logSubCat = 'Thread ' + (parseInt(forkId) + 1);

    // Load Database from Config
    var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
    if (redisConfig.password) {
        redisClient.auth(redisConfig.password);
    }

    // Manage Ready Endpoint
    redisClient.on('ready', function() {
        logger.debug(logSystem, logComponent, logSubCat, 'Share processing setup with redis (' + redisConfig.host +
            ':' + redisConfig.port  + ')');
    });

    // Manage Error Endpoint
    redisClient.on('error', function(err) {
        logger.error(logSystem, logComponent, logSubCat, 'Redis client had an error: ' + JSON.stringify(err))
    });

    // Manage End Endpoint
    redisClient.on('end', function() {
        logger.error(logSystem, logComponent, logSubCat, 'Connection to redis database has been ended');
    });

    // Manage Information Endpoint
    redisClient.info(function(err, response) {

        // Handle Errors
        if (err) {
            logger.error(logSystem, logComponent, logSubCat, 'Redis version check failed');
            return;
        }
        // Establish Connection Version
        var parts = response.split('\r\n');
        var version;
        var versionString;
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf(':') !== -1) {
                var valParts = parts[i].split(':');
                if (valParts[0] === 'redis_version') {
                    versionString = valParts[1];
                    version = parseFloat(versionString);
                    break;
                }
            }
        }

        // Check if Version is Unidentified
        if (!version) {
            logger.error(logSystem, logComponent, logSubCat, 'Could not detect redis version - but be super old or broken');
        }

        // Check if Version < 2.6
        else if (version < 2.6) {
            logger.error(logSystem, logComponent, logSubCat, "You're using redis version " + versionString + " the minimum required version is 2.6. Follow the damn usage instructions...");
        }

    });

    // Manage Individual Shares
    this.handleShare = function(isValidShare, isValidBlock, shareData) {

        // Check to see if Solo Mining
        var isSoloMining = false;
        if (poolConfig.ports[shareData.port].soloMining === true) {
            isSoloMining = true;
        }

        // Establish Redis Variables
        var dateNow = Date.now();
        var redisCommands = [];

        // Push Share Data to Main Array
        if (isValidShare) {
            var combinedShare = {
                time: dateNow,
                worker: shareData.worker,
                soloMined: isSoloMining,
            }
            redisCommands.push(['hincrby', coin + ':shares:roundCurrent', JSON.stringify(combinedShare), shareData.difficulty]);
            redisCommands.push(['hincrby', coin + ':statistics:basic', 'validShares', 1]);
        }
        else {
            redisCommands.push(['hincrby', coin + ':statistics:basic', 'invalidShares', 1]);
        }

        // Push Hashrate Data to Database
        var difficulty = (isValidShare ? shareData.difficulty : -shareData.difficulty)
        var hashrateData = {
            time: dateNow,
            difficulty: difficulty,
            worker: shareData.worker,
            soloMined: isSoloMining,
        }
        redisCommands.push(['zadd', coin + ':statistics:hashrate', dateNow / 1000 | 0, JSON.stringify(hashrateData)])

        // Push Block Data to Main Array
        if (isValidBlock) {
            var blockData = {
                time: dateNow,
                blockHash: shareData.blockHash,
                txHash: shareData.txHash,
                height: shareData.height,
                worker: shareData.worker,
                soloMined: isSoloMining,
            }
            redisCommands.push(['rename', coin + ':shares:roundCurrent', coin + ':shares:round' + shareData.height]);
            redisCommands.push(['sadd', coin + ':blocks:pending', JSON.stringify(blockData)])
            redisCommands.push(['hincrby', coin + ':statistics:basic', 'validBlocks', 1]);
        }
        else if (shareData.blockHash) {
            redisCommands.push(['hincrby', coin + ':statistics:basic', 'invalidBlocks', 1]);
        }

        // Write Share Information to Redis Database
        redisClient.multi(redisCommands).exec(function(err, replies) {
            if (err) {
                logger.error(logSystem, logComponent, logSubCat, 'Error with share processor multi ' + JSON.stringify(err));
            }
        });
    };

};

// Export Pool Shares
module.exports = PoolShares;
