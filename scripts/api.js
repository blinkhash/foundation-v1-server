/*
 *
 * PoolAPI (Updated)
 *
 */

// Import Pool Functionality
var PoolStats = require('./stats.js');

// Pool Stats Main Function
var PoolAPI = function (logger, portalConfig, poolConfigs) {

    // Establish API Variables
    var portalStats = new PoolStats(logger, portalConfig, poolConfigs);
    this.stats = portalStats
    this.liveStatConnections = {};

    // Manage API Error Messages
    const messages = {
        invalid: "The server was unable to handle your request. Verify your input and try again.",
        parameters: "Your request is missing parameters. Verify your input and try again."
    }

    // Handle API Requests
    this.handleApiRequest = function(req, res, next) {
        switch (req.params.method) {

            // Blocks Endpoint (Done)
            case 'blocks':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;
                    var workerQuery = urlQueries.worker || null;

                    // Define Individual Variables
                    var blocks = {}

                    // Get Block Information
                    for (var pool in portalStats.stats) {

                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {

                            // Establish Block Variables
                            var pending = []
                            var confirmed = []

                            // Get Pending Block Information
                            for (var w in portalStats.stats[pool].blocks.pending) {
                                var blockInformation = JSON.parse(portalStats.stats[pool].blocks.pending[w]);
                                var blockConfirms = portalStats.stats[pool].blocks.confirmations;
                                var blockData = {
                                    pool: portalStats.stats[pool].name,
                                    symbol: portalStats.stats[pool].symbol,
                                    algorithm: portalStats.stats[pool].algorithm,
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
                            }

                            // Get Confirmed Block Information
                            for (var w in portalStats.stats[pool].blocks.confirmed) {
                                var blockInformation = JSON.parse(portalStats.stats[pool].blocks.confirmed[w]);
                                var blockData = {
                                    pool: portalStats.stats[pool].name,
                                    symbol: portalStats.stats[pool].symbol,
                                    algorithm: portalStats.stats[pool].algorithm,
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
                            }

                            // Filter for Provided Pool Worker
                            if (workerQuery != null && workerQuery.length > 0) {
                                pending = pending.filter(function(block) {
                                    return block.worker === workerQuery;
                                });
                                confirmed = confirmed.filter(function(block) {
                                    return block.worker === workerQuery;
                                })
                            }

                            // Add Block Information to Endpoint
                            blocks[portalStats.stats[pool].name] = {
                                pending: pending,
                                confirmed: confirmed,
                            }
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        status: 200,
                        errors: "",
                        endpoint: "blocks",
                        data: blocks,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        status: 400,
                        errors: messages["invalid"],
                        endpoint: "blocks",
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Pools Endpoint (Done)
            case 'pools':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;

                    // Define Individual Variables
                    var pools = {}

                    // Get Pool Information
                    for (var pool in portalStats.stats) {

                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {

                            var currencyData = {
                                pool: portalStats.stats[pool].name,
                                symbol: portalStats.stats[pool].symbol,
                                algorithm: portalStats.stats[pool].algorithm,
                                ports: portalStats.stats[pool].ports,
                                hashrate: {
                                    hashrate: portalStats.stats[pool].hashrate.hashrate,
                                    hashrateShared: portalStats.stats[pool].hashrate.hashrateShared,
                                    hashrateSolo: portalStats.stats[pool].hashrate.hashrateSolo,
                                },
                                payments: portalStats.stats[pool].payments,
                                statistics: {
                                    validShares: portalStats.stats[pool].statistics.validShares,
                                    validBlocks: portalStats.stats[pool].statistics.validBlocks,
                                    invalidShares: portalStats.stats[pool].statistics.invalidShares,
                                    lastPaid: portalStats.stats[pool].statistics.lastPaid,
                                    totalPaid: portalStats.stats[pool].statistics.totalPaid,
                                },
                                workers: {
                                    workers: portalStats.stats[pool].workers.workersCount,
                                    workersShared: portalStats.stats[pool].workers.workersSharedCount,
                                    workersSolo: portalStats.stats[pool].workers.workersSoloCount,
                                }
                            }
                            pools[pool] = currencyData;
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        status: 200,
                        errors: "",
                        endpoint: "pools",
                        data: pools,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        status: 400,
                        errors: messages["invalid"],
                        endpoint: "pools",
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Recent Endpoint (Done)
            case 'recent':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;

                    // Define Individual Variables
                    var recent = []

                    // Get Block Information
                    for (var pool in portalStats.stats) {

                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {

                            // Get Pending Block Information
                            for (var w in portalStats.stats[pool].blocks.pending) {
                                blockInformation = JSON.parse(portalStats.stats[pool].blocks.pending[w]);
                                blockConfirms = portalStats.stats[pool].blocks.confirmations;
                                var blockData = {
                                    pool: portalStats.stats[pool].name,
                                    symbol: portalStats.stats[pool].symbol,
                                    algorithm: portalStats.stats[pool].algorithm,
                                    time: blockInformation.time,
                                    height: blockInformation.height,
                                    blockHash: blockInformation.blockHash,
                                    txHash: blockInformation.txHash,
                                    worker: blockInformation.worker,
                                    soloMined: blockInformation.soloMined,
                                    confirmed: false,
                                    confirmations: blockConfirms[blockInformation.blockHash],
                                }
                                recent.push(blockData);
                            }

                            // Get Confirmed Block Information
                            for (var w in portalStats.stats[pool].blocks.confirmed) {
                                blockInformation = JSON.parse(portalStats.stats[pool].blocks.confirmed[w]);
                                var blockData = {
                                    pool: portalStats.stats[pool].name,
                                    symbol: portalStats.stats[pool].symbol,
                                    algorithm: portalStats.stats[pool].algorithm,
                                    time: blockInformation.time,
                                    height: blockInformation.height,
                                    blockHash: blockInformation.blockHash,
                                    txHash: blockInformation.txHash,
                                    worker: blockInformation.worker,
                                    soloMined: blockInformation.soloMined,
                                    confirmed: true,
                                    confirmations: 100,
                                }
                                recent.push(blockData);
                            }
                        }
                    }

                    // Sort Recent Block Data
                    recent = recent.sort(function(a, b) { return b.time - a.time }).slice(0, 10);

                    // Finalize Payload
                    var payload = {
                        status: 200,
                        errors: "",
                        endpoint: "recent",
                        data: recent,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        status: 400,
                        errors: messages["invalid"],
                        endpoint: "recent",
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Wallet Endpoint (Done)
            case 'wallets':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var addressQuery = urlQueries.address || null;
                    if (addressQuery != null && addressQuery.length > 0) {

                        // Output Balance of Address
                        portalStats.getBalanceByAddress(addressQuery, function(balances) {

                            // Establish Address Variables
                            var blocks = []
                            var payments = []
                            var workers = []

                            // Get Block Information
                            for (var pool in portalStats.stats) {

                                // Get Pending Block Information
                                for (var w in portalStats.stats[pool].blocks.pending) {
                                    blockInformation = JSON.parse(portalStats.stats[pool].blocks.pending[w]);
                                    blockConfirms = portalStats.stats[pool].blocks.confirmations;
                                    if (blockInformation.worker == addressQuery) {
                                        var blockData = {
                                            pool: portalStats.stats[pool].name,
                                            symbol: portalStats.stats[pool].symbol,
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

                                // Get Confirmed Block Information
                                for (var w in portalStats.stats[pool].blocks.confirmed) {
                                    blockInformation = JSON.parse(portalStats.stats[pool].blocks.confirmed[w]);
                                    if (blockInformation.worker == addressQuery) {
                                        var blockData = {
                                            pool: portalStats.stats[pool].name,
                                            symbol: portalStats.stats[pool].symbol,
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

                                // Get Payout Information
                                for (var pool in portalStats.stats) {
                                    for (var w in portalStats.stats[pool].payments) {
                                        for (var x in portalStats.stats[pool].payments[w].amounts) {
                                            if (x == addressQuery) {
                                                var paymentData = {
                                                    time: portalStats.stats[pool].payments[w].time,
                                                    amount: portalStats.stats[pool].payments[w].amounts[x],
                                                    txid: portalStats.stats[pool].payments[w].txid
                                                }
                                                payments.push(paymentData)
                                            }
                                        }
                                    }
                                }

                                // Get Worker Information
                                for (var pool in portalStats.stats) {
                                    for (var w in portalStats.stats[pool].workers.workers) {
                                        if (w == addressQuery) {
                                            workers.push(portalStats.stats[pool].workers.workers[w]);
                                        }
                                    }
                                }
                            }

                            // Structure Wallet Output
                            const wallets = {
                                address: addressQuery,
                                balance: balances.totalBalance.toFixed(8),
                                immature: balances.totalImmature.toFixed(8),
                                paid: balances.totalPaid.toFixed(8),
                                unpaid: balances.totalUnpaid.toFixed(8),
                                total: (balances.totalBalance + balances.totalImmature + balances.totalPaid + balances.totalUnpaid).toFixed(8),
                                blocks: blocks,
                                payments: payments,
                                workers: workers,
                            }

                            // Finalize Payload
                            var payload = {
                                status: 200,
                                errors: "",
                                endpoint: "wallets",
                                data: wallets,
                            }

                            // Finalize Endpoint Information
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(payload));
                        });
                    }

                    else {

                        // Finalize Payload
                        var payload = {
                            status: 400,
                            errors: messages["parameters"],
                            endpoint: "wallets",
                            data: {},
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(payload));
                    }

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        status: 400,
                        errors: messages["invalid"],
                        endpoint: "wallets",
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Workers Endpoint (Done)
            case 'workers':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;

                    // Define Individual Variables
                    var workers = {}

                    // Get Block Information
                    for (var pool in portalStats.stats) {

                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {

                          // Establish Worker Variables
                            var shared = []
                            var solo = []

                            // Get Shared Worker Information
                            for (var w in portalStats.stats[pool].workers.workersShared) {
                                var workerInformation = portalStats.stats[pool].workers.workersShared[w];
                                var workerData = {
                                    address: w,
                                    difficulty: workerInformation.difficulty,
                                    validShares: workerInformation.validShares,
                                    invalidShares: workerInformation.invalidShares,
                                    hashrate: workerInformation.hashrate,
                                    soloMining: workerInformation.soloMining,
                                }
                                shared.push(workerData);
                            }

                            // Get Solo Worker Information
                            for (var w in portalStats.stats[pool].workers.workersSolo) {
                                var workerInformation = portalStats.stats[pool].workers.workersSolo[w];
                                var workerData = {
                                    address: w,
                                    difficulty: workerInformation.difficulty,
                                    validShares: workerInformation.validShares,
                                    invalidShares: workerInformation.invalidShares,
                                    hashrate: workerInformation.hashrate,
                                    soloMining: workerInformation.soloMining,
                                }
                                solo.push(workerData);
                            }

                            // Add Worker Information to Endpoint
                            workers[portalStats.stats[pool].name] = {
                                shared: shared,
                                solo: solo,
                            }
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        status: 200,
                        errors: "",
                        endpoint: "workers",
                        data: workers,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        status: 400,
                        errors: messages["invalid"],
                        endpoint: "workers",
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            default:
                next();

        }
    };

};

// Export Pool API
module.exports = PoolAPI;
