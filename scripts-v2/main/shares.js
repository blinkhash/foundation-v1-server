/*
 *
 * Shares (Updated)
 *
 */

const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Shares Function
const PoolShares = function (logger, client, poolConfig, portalConfig) {

    const _this = this;
    this.coin = poolConfig.coin.name;
    this.client = client;
    this.poolConfig = poolConfig;
    this.portalConfig = portalConfig;
    this.forkId = process.env.forkId;

    const logSystem = 'Pool';
    const logComponent = _this.coin;
    const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

    _this.client.on('ready', () => {});
    _this.client.on('error', (error) => {
        logger.error(logSystem, logComponent, logSubCat, `Redis client had an error: ${ JSON.stringify(error) }`);
    });
    _this.client.on('end', () => {
        logger.error(logSystem, logComponent, logSubCat, 'Connection to redis database has been ended');
    });

    // Manage Worker Times
    this.buildTimesCommands = function(results, shareData, blockValid) {

        const commands = [];
        const dateNow = Date.now();
        const workerAddress = shareData.worker;
        const lastShareTimes = results[0] || {};

        // Check if Worker Recently Joined
        if (!lastShareTimes[workerAddress]) {
            lastShareTimes[workerAddress] = dateNow;
        }

        // Get Last Known Worker Time
        const lastShareTime = lastShareTimes[workerAddress];

        // Check for Continous Mining
        const timeChangeSec = utils.roundTo(Math.max(dateNow - lastShareTime, 0) / 1000, 4);
        if (timeChangeSec < 900) {
            commands.push(['hincrbyfloat', `${ _this.coin }:rounds:current:times:values`, workerAddress, timeChangeSec]);
        }

        // Ensure Block Hasn't Been Found
        if (!blockValid) {
            commands.push(['hset', `${ _this.coin }:rounds:current:times:last`, workerAddress, dateNow]);
        }

        return commands;
    };

    // Manage Worker Shares
    this.buildSharesCommands = function(results, shareData, shareValid, blockValid) {

        let commands = [];
        const dateNow = Date.now();
        const workerAddress = shareData.worker;
        const isSoloMining = utils.checkSoloMining(_this.poolConfig, shareData);

        // Build Output Share
        const outputShare = {
            time: dateNow,
            worker: workerAddress,
            solo: isSoloMining
        };

        // Handle Valid/Invalid Shares
        if (shareValid) {
            commands = commands.concat(_this.buildTimesCommands(results, shareData, blockValid));
            commands.push(['hincrby', `${ _this.coin }:rounds:current:shares:values`, workerAddress, shareData.difficulty]);
            commands.push(['hincrby', `${ _this.coin }:rounds:current:shares:counts`, 'validShares', 1]);
            outputShare.difficulty = shareData.difficulty;
            commands.push(['zadd', `${ _this.coin }:rounds:current:shares:records`, dateNow / 1000 | 0, JSON.stringify(outputShare)]);
        }
        else {
            commands.push(['hincrby', `${ _this.coin }:rounds:current:shares:counts`, 'invalidShares', 1]);
            outputShare.difficulty = -shareData.difficulty;
            commands.push(['zadd', `${ _this.coin }:rounds:current:shares:records`, dateNow / 1000 | 0, JSON.stringify(outputShare)]);
        }

        return commands;
    };

    // Manage Worker Blocks
    this.buildBlocksCommands = function(shareData, shareValid, blockValid) {

        const commands = [];
        const dateNow = Date.now();
        const difficulty = (shareValid ? shareData.difficulty : -shareData.difficulty);
        const isSoloMining = utils.checkSoloMining(_this.poolConfig, shareData);

        // Build Output Block
        const outputBlock = {
            time: dateNow,
            height: shareData.height,
            hash: shareData.hash,
            reward: shareData.reward,
            transaction: shareData.transaction,
            difficulty: difficulty,
            worker: shareData.worker,
            solo: isSoloMining,
        };

        // Handle Valid/Invalid Blocks
        if (blockValid) {
            commands.push(['rename', `${ _this.coin }:rounds:current:times:last`, `${ _this.coin }:rounds:round-${ shareData.height }:times:last`]);
            commands.push(['rename', `${ _this.coin }:rounds:current:times:values`, `${ _this.coin }:rounds:round-${ shareData.height }:times:values`]);
            commands.push(['rename', `${ _this.coin }:rounds:current:shares:values`, `${ _this.coin }:rounds:round-${ shareData.height }:shares:values`]);
            commands.push(['rename', `${ _this.coin }:rounds:current:shares:counts`, `${ _this.coin }:rounds:round-${ shareData.height }:shares:counts`]);
            commands.push(['rename', `${ _this.coin }:rounds:current:shares:records`, `${ _this.coin }:rounds:round-${ shareData.height }:shares:records`]);
            commands.push(['zadd', `${ _this.coin }:main:blocks:pending`, shareData.height, JSON.stringify(outputBlock)]);
            commands.push(['hincrby', `${ _this.coin }:main:blocks:counts`, 'validBlocks', 1]);
        }
        else if (shareData.hash) {
            commands.push(['hincrby', `${ _this.coin }:main:blocks:counts`, 'invalidBlocks', 1]);
        }

        return commands;
    };

    // Build Redis Commands
    this.buildCommands = function(results, shareData, shareValid, blockValid, callback, handler) {
        let commands = [];
        commands = commands.concat(_this.buildSharesCommands(results, shareData, shareValid, blockValid));
        commands = commands.concat(_this.buildBlocksCommands(shareData, shareValid, blockValid));
        this.executeCommands(commands, callback, handler);
        return commands;
    };

    // Execute Redis Commands
    this.executeCommands = function(commands, callback, handler) {
        _this.client.multi(commands).exec((error, results) => {
            if (error) {
                logger.error(logSystem, logComponent, logSubCat, `Error with redis share processing ${ JSON.stringify(error) }`);
                handler(error);
            }
            callback(results);
        });
    };

    // Handle Share Submissions
    this.handleShares = function(shareData, shareValid, blockValid, callback, handler) {
        const shareLookups = [['hgetall', `${ _this.coin }:rounds:current:times:last`]];
        this.executeCommands(shareLookups, (results) => {
            _this.buildCommands(results, shareData, shareValid, blockValid, callback, handler);
        }, handler);
    };
};

module.exports = PoolShares;
