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

            // Wallet Endpoint
            case 'wallet':

                // Check to Ensure URL is Formatted Properly
                var url_queries = req.query;
                var address = url_queries.address || null;
                if (address != null && address.length > 0) {

                    // Output Balance of Address
                    portalStats.getBalanceByAddress(address, function(balances) {

                        // Finalize Endpoint Information
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            address: address,
                            balance: balances.totalBalance.toFixed(8),
                            immature: balances.totalImmature.toFixed(8),
                            paid: balances.totalPaid.toFixed(8),
                            unpaid: balances.totalUnpaid.toFixed(8),
                            total: (balances.totalBalance + balances.totalImmature + balances.totalPaid + balances.totalUnpaid).toFixed(8),
                        }));
                    });
                }

                else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({result: "error"}));
                }

                return;

            // Wallet Endpoint (Extended)
            case 'walletEx':

                // Check to Ensure URL is Formatted Properly
                var url_queries = req.query;
                var address = url_queries.address || null;
                if (address != null && address.length > 0) {

                    // Output Balance of Address
                    portalStats.getBalanceByAddress(address, function(balances) {

                        // Establish Address Variables
                        var worker = []
                        var payments = []
                        var blocks = []

                        // Get Worker Information
                        for (var pool in portalStats.stats.pools) {
                            for (var w in portalStats.stats.pools[pool].workers) {
                                if (w == address) {
                                    worker.push(portalStats.stats.pools[pool].workers[w]);
                                }
                            }
                        }

                        // Get Payout Information
                        for (var pool in portalStats.stats.pools) {
                            for (var w in portalStats.stats.pools[pool].payments) {
                                for (var x in portalStats.stats.pools[pool].payments[w].amounts) {
                                    if (x == address) {
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
                                blockInformation = portalStats.stats.pools[pool].pending[w].split(':');
                                if (blockInformation[3] == address) {
                                    var blockData = {
                                        height: blockInformation[2],
                                        blockHash: blockInformation[0],
                                        worker: blockInformation[3],
                                        soloMined: blockInformation[4] == 'true',
                                        confirmed: false,
                                    }
                                    blocks.push(blockData);
                                }
                            }
                            for (var w in portalStats.stats.pools[pool].confirmed) {
                                blockInformation = portalStats.stats.pools[pool].confirmed[w].split(':');
                                if (blockInformation[3] == address) {
                                    var blockData = {
                                        height: blockInformation[2],
                                        blockHash: blockInformation[0],
                                        worker: blockInformation[3],
                                        soloMined: blockInformation[4] == 'true',
                                        confirmed: true,
                                    }
                                    blocks.push(blockData);
                                }
                            }
                        }

                        // Finalize Endpoint Information
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            address: address,
                            balance: balances.totalBalance.toFixed(8),
                            immature: balances.totalImmature.toFixed(8),
                            paid: balances.totalPaid.toFixed(8),
                            unpaid: balances.totalUnpaid.toFixed(8),
                            total: (balances.totalBalance + balances.totalImmature + balances.totalPaid + balances.totalUnpaid).toFixed(8),
                            worker: worker,
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

            // Block Endpoint
            case 'blocks':

                // Get Block Information
                var blocks = {}
                for (var pool in portalStats.stats.pools) {

                    // Establish Block Variables
                    pending = []
                    confirmed = []

                    // Get Pending Block Information
                    for (var w in portalStats.stats.pools[pool].pending) {
                        blockInformation = portalStats.stats.pools[pool].pending[w].split(':');
                        var blockData = {
                            symbol: portalStats.stats.pools[pool].symbol,
                            height: blockInformation[2],
                            blockHash: blockInformation[0],
                            worker: blockInformation[3],
                            soloMined: blockInformation[4] == 'true',
                            confirmed: false,
                        }
                        pending.push(blockData);
                    }

                    // Get Confirmed Block Information
                    for (var w in portalStats.stats.pools[pool].confirmed) {
                        blockInformation = portalStats.stats.pools[pool].confirmed[w].split(':');
                        var blockData = {
                            symbol: portalStats.stats.pools[pool].symbol,
                            height: blockInformation[2],
                            blockHash: blockInformation[0],
                            worker: blockInformation[3],
                            soloMined: blockInformation[4] == 'true',
                            confirmed: true,
                        }
                        confirmed.push(blockData);
                    }

                    // Add Block Information to Endpoint
                    blocks[portalStats.stats.pools[pool].name] = {
                        pending: pending,
                        confirmed: confirmed
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(blocks));

                }

            default:
                next();

        }
    };

};

// Export Pool API
module.exports = PoolAPI;
