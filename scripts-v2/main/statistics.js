// /*
//  *
//  * Statistics (Updated)
//  *
//  */
//
// const utils = require('./utils');
//
// ////////////////////////////////////////////////////////////////////////////////
//
// // Main Statistics Function
// const PoolStatistics = function (logger, client, poolConfigs, portalConfig) {
//
//     const _this = this;
//     this.client = client;
//     this.statistics = {};
//     this.poolConfigs = poolConfigs;
//     this.portalConfig = portalConfig;
//     this.forkId = process.env.forkId;
//
//     const logSystem = 'Pool';
//     const logComponent = 'Statistics';
//     const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;
//
//     _this.client.on('ready', () => {});
//     _this.client.on('error', (error) => {
//         logger.error(logSystem, logComponent, logSubCat, `Redis client had an error: ${ JSON.stringify(error) }`);
//     });
//     _this.client.on('end', () => {
//         logger.error(logSystem, logComponent, logSubCat, 'Connection to redis database has been ended');
//     });
//
//     // Manage Statistics Objects
//     this.buildStatistics = function(coin, callback) {
//
//     }
//
//     // Manage Redis Commands/Results
//     this.buildCommands = function(callback) {
//
//         const timesCommands = [];
//         const hashrateWindow = _this.portalConfig.statistics.hashrateWindow
//         const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
//         const redisTemplates = [
//             ['hgetall', ':main:blocks:counts'],
//             ['smembers', ':main:blocks:pending'],
//             ['smembers', ':main:blocks:confirmed'],
//             ['hgetall', ':rounds:current:shares:counts'],
//             ['zrangebyscore', ':rounds:current:shares:records', windowTime, '+inf'],
//             ['hgetall', ':rounds:current:shares:values'],
//             ['hgetall', ':rounds:current:times:last'],
//             ['hgetall', ':rounds:current:times:values']];
//
//         // Map Redis Templates to Commands
//         Object.keys(_this.poolConfigs).map(function(coin) {
//             redisTemplates.map(function(t) {
//                 var clonedTemplates = t.slice(0);
//                 clonedTemplates[1] = coin + clonedTemplates[1];
//                 timesCommands.push(clonedTemplates);
//             });
//         });
//
//         // Execute Times Commands
//         _this.executeCommands(timesCommands, (results) => {
//             for (var i = 0; i < results.length; i += redisTemplates.length) {
//
//             }
//         }, callback);
//     }
//
//     // Execute Redis Commands
//     this.executeCommands = function(commands, callback, handler) {
//         _this.client.multi(commands).exec((error, results) => {
//             if (error) {
//                 logger.error(logSystem, logComponent, logSubCat, `Error with redis statistics processing ${ JSON.stringify(error) }`);
//                 handler(error);
//             }
//             callback(results);
//         });
//     };
// }
//
// module.exports = PoolStatistics;
