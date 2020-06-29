/*
 *
 * PoolAPI (Updated)
 *
 */

// Import Required Modules
var redis = require('redis');
var async = require('async');
var url = require('url');

// Import Pool Functionality
var PoolStats = require('./stats.js');

// Pool Stats Main Function
var PoolAPI = function (logger, portalConfig, poolConfigs) {

    // Establish API Variables
    var _this = this;
    var portalStats = new PoolStats(logger, portalConfig, poolConfigs);
    this.stats = portalStats
    this.liveStatConnections = {};

    // Convert Hashrate into Readable String
    this.getReadableHashRateString = function(hashrate) {
        var i = -1;
        var byteUnits = [ ' KH', ' MH', ' GH', ' TH', ' PH', ' EH' ];
        do {
            hashrate = hashrate / 1000;
            i++;
        } while (hashrate > 1000);
        return hashrate.toFixed(2) + byteUnits[i];
    };

    // Handle API Requests
    this.handleApiRequest = function(req, res, next) {
        switch (req.params.method) {

            // Block Endpoint
            case 'blocks':

                // Check to Ensure URL is Formatted Properly
                var urlQueries = req.query;
                var poolQuery = urlQueries.pool || null;
                var workerQuery = urlQueries.worker || null;

                var blocks = {}
                var recent = []

                // Get Block Information
                for (var pool in portalStats.stats.pools) {

                    var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                    var currentPool = portalStats.stats.pools[pool].name.toLowerCase()
                    if ((formattedPool === null) || (formattedPool === currentPool)) {

                        // Establish Block Variables
                        var pending = []
                        var confirmed = []

                        // Get Pending Block Information
                        for (var w in portalStats.stats.pools[pool].pending) {
                            blockInformation = JSON.parse(portalStats.stats.pools[pool].pending[w]);
                            blockConfirms = portalStats.stats.pools[pool].pendingConfirms;
                            var blockData = {
                                pool: portalStats.stats.pools[pool].name,
                                symbol: portalStats.stats.pools[pool].symbol,
                                time: blockInformation.time,
                                height: blockInformation.height,
                                blockHash: blockInformation.blockHash,
                                txHash: blockInformation.txHash,
                                worker: blockInformation.worker,
                                soloMined: blockInformation.soloMined,
                                confirmed: false,
                                confirmations: blockConfirms[blockInformation.blockHash],
                            }
                            pending.push(blockData);
                            recent.push(blockData);
                        }

                        // Get Confirmed Block Information
                        for (var w in portalStats.stats.pools[pool].confirmed) {
                            blockInformation = JSON.parse(portalStats.stats.pools[pool].confirmed[w]);
                            var blockData = {
                                pool: portalStats.stats.pools[pool].name,
                                symbol: portalStats.stats.pools[pool].symbol,
                                time: blockInformation.time,
                                height: blockInformation.height,
                                blockHash: blockInformation.blockHash,
                                txHash: blockInformation.txHash,
                                worker: blockInformation.worker,
                                soloMined: blockInformation.soloMined,
                                confirmed: true,
                                confirmations: 100,
                            }
                            confirmed.push(blockData);
                            recent.push(blockData);
                        }

                        // Filter for Provided Pool Worker
                        if (workerQuery != null && workerQuery.length > 0) {
                            pending = pending.filter(function(block) {
                                return block.worker === workerQuery;
                            });
                            confirmed = confirmed.filter(function(block) {
                                return block.worker === workerQuery;
                            })
                            recent = recent.filter(function(block) {
                                return block.worker === workerQuery;
                            });
                        }

                        // Add Block Information to Endpoint
                        blocks[portalStats.stats.pools[pool].name] = {
                            pending: pending,
                            confirmed: confirmed,
                        }
                    }
                }

                // Finalize Endpoint Information
                recent = recent.sort(function(a, b) { return b.time - a.time }).slice(0, 10);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    pools: blocks,
                    recent: recent,
                }));

                return;

            // Currency Endpoint
            case 'currencies':

                return;

            // Payment Endpoint
            case 'payments':

                return;

            // Pools Endpoint
            case 'pools':

                return;

            // Ports Endpoint
            case 'ports':

                return;

            // Wallet Endpoint
            case 'wallet':

                // Check to Ensure URL is Formatted Properly
                var urlQueries = req.query;
                var addressQuery = urlQueries.address || null;
                if (addressQuery != null && addressQuery.length > 0) {

                    // Output Balance of Address
                    portalStats.getBalanceByAddress(addressQuery, function(balances) {

                        // Establish Address Variables
                        var workers = []
                        var payments = []
                        var blocks = []

                        // Get Worker Information
                        for (var pool in portalStats.stats.pools) {
                            for (var w in portalStats.stats.pools[pool].workers) {
                                console.log(w);
                                if (w == addressQuery) {
                                    workers.push(portalStats.stats.pools[pool].workers[w]);
                                }
                            }
                        }

                        // Get Payout Information
                        for (var pool in portalStats.stats.pools) {
                            for (var w in portalStats.stats.pools[pool].payments) {
                                for (var x in portalStats.stats.pools[pool].payments[w].amounts) {
                                    if (x == addressQuery) {
                                        var paymentData = {
                                            time: portalStats.stats.pools[pool].payments[w].time,
                                            amount: portalStats.stats.pools[pool].payments[w].amounts[x],
                                            txid: portalStats.stats.pools[pool].payments[w].txid
                                        }
                                        payments.push(paymentData)
                                    }
                                }
                            }
                        }

                        // Get Block Information
                        for (var pool in portalStats.stats.pools) {
                            for (var w in portalStats.stats.pools[pool].pending) {
                                blockInformation = JSON.parse(portalStats.stats.pools[pool].pending[w]);
                                blockConfirms = portalStats.stats.pools[pool].pendingConfirms;
                                if (blockInformation.worker == addressQuery) {
                                    var blockData = {
                                        pool: portalStats.stats.pools[pool].name,
                                        symbol: portalStats.stats.pools[pool].symbol,
                                        time: blockInformation.time,
                                        height: blockInformation.height,
                                        blockHash: blockInformation.blockHash,
                                        txHash: blockInformation.txHash,
                                        worker: blockInformation.worker,
                                        soloMined: blockInformation.soloMined,
                                        confirmed: false,
                                        confirmations: blockConfirms[blockInformation.blockHash],
                                    }
                                    blocks.push(blockData);
                                }
                            }
                            for (var w in portalStats.stats.pools[pool].confirmed) {
                                blockInformation = JSON.parse(portalStats.stats.pools[pool].confirmed[w]);
                                if (blockInformation.worker == addressQuery) {
                                    var blockData = {
                                        pool: portalStats.stats.pools[pool].name,
                                        symbol: portalStats.stats.pools[pool].symbol,
                                        time: blockInformation.time,
                                        height: blockInformation.height,
                                        blockHash: blockInformation.blockHash,
                                        txHash: blockInformation.txHash,
                                        worker: blockInformation.worker,
                                        soloMined: blockInformation.soloMined,
                                        confirmed: true,
                                        confirmations: 100,
                                    }
                                    blocks.push(blockData);
                                }
                            }
                        }

                        // Finalize Endpoint Information
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            address: addressQuery,
                            balance: balances.totalBalance.toFixed(8),
                            immature: balances.totalImmature.toFixed(8),
                            paid: balances.totalPaid.toFixed(8),
                            unpaid: balances.totalUnpaid.toFixed(8),
                            total: (balances.totalBalance + balances.totalImmature + balances.totalPaid + balances.totalUnpaid).toFixed(8),
                            workers: workers,
                            payments: payments,
                            blocks: blocks,
                        }));
                    });
                }

                else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({result: "error"}));
                }

                return;

            // Worker Endpoint
            case 'workers':

                return;

            default:
                next();

        }
    };

};

// Export Pool API
module.exports = PoolAPI;
