/*
 *
 * PoolAPI (Updated)
 *
 */

// Import Required Modules
var redis = require('redis');
var async = require('async');

// Import Pool Functionality
var PoolStats = require('./stats.js');

// Pool Stats Main Function
var PoolAPI = function (logger, portalConfig, poolConfigs) {

    // Establish API Variables
    var _this = this;
    var portalStats = new PoolStats(logger, portalConfig, poolConfigs);
    this.stats = portalStats
    this.liveStatConnections = {};

    // Handle API Requests
    this.handleApiRequest = function(req, res, next) {
        switch (req.params.method) {

            // Global Statistics Endpoint
            case 'global-stats':
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(portalStats.statsString);
                return;

            // Historical Statistics Endpoint
            case 'historical-stats':
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(portalStats.statPoolHistory));
                return;

            // Block Statistics Endpoint
            case 'block-stats':
                portalStats.getBlocks(function(data) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                });
                return;

            // Payment Statistics Endpoint
            case 'payment-stats':
                var poolBlocks = [];
                for(var pool in portalStats.stats.pools) {
                    poolBlocks.push({
                        name: pool,
                        pending: portalStats.stats.pools[pool].pending,
                        payments: portalStats.stats.pools[pool].payments
                    });
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(poolBlocks));
                return;

            // Worker Statistics Endpoint
            case 'worker-stats':
                if (req.url.indexOf("?") > 0) {
                    var url_params = req.url.split("?");
                    if (url_params.length > 0) {
                        var history = {};
                        var workers = {};
                        var address = url_params[1] || null;
                        if (address != null && address.length > 0) {
                            address = address.split(".")[0];
                            portalStats.getBalanceByAddress(address, function(balances) {
                                portalStats.getTotalSharesByAddress(address, function(shares) {
                                    var totalHash = parseFloat(0.0);
                                    var totalShares = shares;
                                    for (var h in portalStats.statHistory) {
                                        for (var pool in portalStats.statHistory[h].pools) {
                                            for (var w in portalStats.statHistory[h].pools[pool].workers) {
                                                if (w.startsWith(address)) {
                                                    if (history[w] == null) {
                                                        history[w] = [];
                                                    }
                                                    if (portalStats.statHistory[h].pools[pool].workers[w].hashrate) {
                                                        history[w].push({
                                                            time: portalStats.statHistory[h].time,
                                                            hashrate: portalStats.statHistory[h].pools[pool].workers[w].hashrate
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    for (var pool in portalStats.stats.pools) {
                                        for(var w in portalStats.stats.pools[pool].workers) {
                                            if (w.startsWith(address)) {
                                                workers[w] = portalStats.stats.pools[pool].workers[w];
                                                for (var b in balances.balances) {
                                                    if (w == balances.balances[b].worker) {
                                                        workers[w].paid = balances.balances[b].paid;
                                                        workers[w].balance = balances.balances[b].balance;
                                                    }
                                                }
                                                workers[w].balance = (workers[w].balance || 0);
                                                workers[w].paid = (workers[w].paid || 0);
                                                totalHash += portalStats.stats.pools[pool].workers[w].hashrate;
                                            }
                                        }
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        miner: address,
                                        totalHash: totalHash,
                                        totalShares: totalShares,
                                        immature: balances.totalImmature,
                                        balance: balances.totalHeld,
                                        paid: balances.totalPaid,
                                        workers: workers,
                                        history: history
                                    }));
                                });
                            });
                        }
                        else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({result: "error"}));
                        }
                    }
                    else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({result: "error"}));
                    }
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({result: "error"}));
                }
                return;

            default:
                next();

        }
    };

};

// Export Pool API
module.exports = PoolAPI;
