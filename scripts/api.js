/*
 *
 * PoolAPI (Updated)
 *
 */

// Import Pool Functionality
var PoolStats = require('./stats.js');

// Pool Stats Main Function
var PoolAPI = function (logger, partnerConfigs, poolConfigs, portalConfig) {

    // Establish API Variables
    var portalStats = new PoolStats(logger, poolConfigs, portalConfig);
    this.stats = portalStats
    this.liveStatConnections = {};

    // Manage API Error Messages
    const messages = {
        invalid: "The server was unable to handle your request. Verify your input and try again.",
        parameters: "Your request is missing parameters. Verify your input and try again."
    }

    // Collect Current Blocks Data
    function getBlocksData(portalStats, pool, address) {

        // Establish Block Variables
        var blocks = []
        var statistics = {}

        // Get Pending Block Information
        for (var w in portalStats.stats[pool].blocks.pending) {
            var blockInformation = JSON.parse(portalStats.stats[pool].blocks.pending[w]);
            var blockConfirms = portalStats.stats[pool].blocks.confirmations;
            var blocksData = {
                pool: portalStats.stats[pool].name,
                symbol: portalStats.stats[pool].symbol,
                algorithm: portalStats.stats[pool].algorithm,
                time: blockInformation.time,
                height: blockInformation.height,
                blockHash: blockInformation.blockHash,
                blockReward: blockInformation.blockReward / 1e8,
                txHash: blockInformation.txHash,
                difficulty: blockInformation.difficulty,
                worker: blockInformation.worker,
                soloMined: blockInformation.soloMined,
                confirmed: false,
                confirmations: blockConfirms[blockInformation.blockHash] || 1,
            }
            blocks.push(blocksData);
        }

        // Get Confirmed Block Information
        for (var w in portalStats.stats[pool].blocks.confirmed) {
            var blockInformation = JSON.parse(portalStats.stats[pool].blocks.confirmed[w]);
            var blocksData = {
                pool: portalStats.stats[pool].name,
                symbol: portalStats.stats[pool].symbol,
                algorithm: portalStats.stats[pool].algorithm,
                time: blockInformation.time,
                height: blockInformation.height,
                blockHash: blockInformation.blockHash,
                blockReward: blockInformation.blockReward / 1e8,
                txHash: blockInformation.txHash,
                difficulty: blockInformation.difficulty,
                worker: blockInformation.worker,
                soloMined: blockInformation.soloMined,
                confirmed: true,
                confirmations: 100,
            }
            blocks.push(blocksData);
        }

        // Filter by Worker Passed
        if (address != null && address.length > 0) {
            blocks = blocks.filter(function(block) {
                return block.worker === address;
            });
        }

        // Calculate Blocks Found in Last "X" Hours/Days
        const lastHour = blocks.filter(function(block) {
            var currentDate = new Date()
            return block.time > currentDate.setHours(currentDate.getHours() - 1);
        }).length
        const last24Hours = blocks.filter(function(block) {
            var currentDate = new Date()
            return block.time > currentDate.setDate(currentDate.getDate() - 1);
        }).length
        const last7Days = blocks.filter(function(block) {
            var currentDate = new Date()
            return block.time > currentDate.setDate(currentDate.getDate() - 7);
        }).length

        // Append to Block Statistics
        statistics.lastHour = lastHour
        statistics.last24Hours = last24Hours
        statistics.last7Days = last7Days

        // Define Output Payload
        const payload = {
            blocks: blocks,
            statistics: statistics,
        }

        // Return Output
        return payload
    }

    // Collect Current Payments Data
    function getPaymentsData(portalStats, pool, address) {

        // Establish Payment Variables
        var payments = []

        for (var w in portalStats.stats[pool].payments) {
            var paymentInformation = portalStats.stats[pool].payments[w];
            var paymentsData = {
                pool: portalStats.stats[pool].name,
                symbol: portalStats.stats[pool].symbol,
                algorithm: portalStats.stats[pool].algorithm,
                time: paymentInformation.time,
                txid: paymentInformation.txid,
                shares: paymentInformation.shares,
                workers: paymentInformation.workers,
                paid: paymentInformation.paid,
                unpaid: paymentInformation.unpaid,
                records: paymentInformation.records,
                totals: paymentInformation.totals,
            }
            payments.push(paymentsData);
        }

        // Filter by Worker Passed
        if (address != null && address.length > 0) {
            payments = payments.filter(function(payment) {
                return Object.keys(payment.totals.amounts).includes(address);
            });
        }

        // Define Output Payload
        const payload = {
            payments: payments,
        }

        // Return Output
        return payload
    }

    // Collect Current Workers Data
    function getWorkersData(portalStats, pool, address) {

        // Establish Worker Variables
        var workers = []

        // Get Shared Worker Information
        for (var w in portalStats.stats[pool].workers.workersShared) {
            var workerInformation = portalStats.stats[pool].workers.workersShared[w];
            var workersData = {
                pool: portalStats.stats[pool].name,
                symbol: portalStats.stats[pool].symbol,
                algorithm: portalStats.stats[pool].algorithm,
                address: w,
                difficulty: workerInformation.difficulty,
                validShares: workerInformation.validShares,
                invalidShares: workerInformation.invalidShares,
                hashrate: workerInformation.hashrate,
                hashrateType: workerInformation.hashrateType,
                soloMining: workerInformation.soloMining,
            }
            workers.push(workersData);
        }

        // Get Solo Worker Information
        for (var w in portalStats.stats[pool].workers.workersSolo) {
            var workerInformation = portalStats.stats[pool].workers.workersSolo[w];
            var workersData = {
                pool: portalStats.stats[pool].name,
                symbol: portalStats.stats[pool].symbol,
                algorithm: portalStats.stats[pool].algorithm,
                address: w,
                difficulty: workerInformation.difficulty,
                validShares: workerInformation.validShares,
                invalidShares: workerInformation.invalidShares,
                hashrate: workerInformation.hashrate,
                hashrateType: workerInformation.hashrateType,
                soloMining: workerInformation.soloMining,
            }
            workers.push(workersData);
        }

        // Filter by Worker Passed
        if (address != null && address.length > 0) {
            workers = workers.filter(function(worker) {
                return worker.address === address;
            });
        }

        // Define Output Payload
        const payload = {
            workers: workers,
        }

        // Return Output
        return payload
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
                            var blocksData = getBlocksData(portalStats, pool, workerQuery)
                            if (blocksData.blocks.length >= 1) {
                                blocks[portalStats.stats[pool].name] = blocksData.blocks;
                            }
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "blocks",
                        errors: "",
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
                        endpoint: "blocks",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Combined Endpoint (Done)
            case 'combined':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;

                    // Define Individual Variables
                    var pools = {}
                    var partners = {}

                    // Get Pool Information
                    for (var pool in portalStats.stats) {
                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {
                            const blocksData = getBlocksData(portalStats, pool, null)
                            const paymentsData = getPaymentsData(portalStats, pool, null)
                            const workersData = getWorkersData(portalStats, pool, null)
                            var poolsData = {
                                pool: portalStats.stats[pool].name,
                                symbol: portalStats.stats[pool].symbol,
                                algorithm: portalStats.stats[pool].algorithm,
                                featured: portalStats.stats[pool].featured,
                                ports: portalStats.stats[pool].ports,
                                blocks: blocksData.blocks,
                                history: portalStats.stats[pool].history,
                                payments: paymentsData.payments,
                                statistics: {
                                    invalidShares: portalStats.stats[pool].statistics.invalidShares,
                                    lastPaid: portalStats.stats[pool].statistics.lastPaid,
                                    paymentFees: portalStats.stats[pool].fees,
                                    paymentTime: portalStats.stats[pool].statistics.paymentTime,
                                    paymentMinimum: portalStats.stats[pool].statistics.paymentMinimum,
                                    totalPaid: portalStats.stats[pool].statistics.totalPaid,
                                    validShares: portalStats.stats[pool].statistics.validShares,
                                    validBlocks: portalStats.stats[pool].statistics.validBlocks,
                                    blocks: blocksData.statistics,
                                    hashrate: {
                                        hashrate: portalStats.stats[pool].hashrate.hashrate,
                                        hashrateShared: portalStats.stats[pool].hashrate.hashrateShared,
                                        hashrateSolo: portalStats.stats[pool].hashrate.hashrateSolo,
                                    },
                                    workers: {
                                        workers: portalStats.stats[pool].workers.workersCount,
                                        workersShared: portalStats.stats[pool].workers.workersSharedCount,
                                        workersSolo: portalStats.stats[pool].workers.workersSoloCount,
                                    }
                                },
                                workers: workersData.workers,
                            }
                            pools[pool] = poolsData;
                        }
                    }

                    // Get Partner Information
                    for (var partner in partnerConfigs) {
                        const currentPartner = partnerConfigs[partner];
                        partners[currentPartner.name] = currentPartner;
                    }

                    // Combine All Data
                    var combined = {
                        partners: partners,
                        pools: pools
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "combined",
                        errors: "",
                        data: combined,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        endpoint: "combined",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // History Endpoint (Done)
            case 'history':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;

                    // Define Individual Variables
                    var history = {}

                    // Get Block Information
                    for (var pool in portalStats.stats) {
                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {
                            history[portalStats.stats[pool].name] = portalStats.stats[pool].history;
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "history",
                        errors: "",
                        data: history,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        endpoint: "history",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Partners Endpoint (Done)
            case 'partners':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;

                    // Define Individual Variables
                    var partners = {}

                    // Get Partner Information
                    for (var partner in partnerConfigs) {
                        const currentPartner = partnerConfigs[partner];
                        partners[currentPartner.name] = currentPartner;
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "partners",
                        errors: "",
                        data: partners,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        endpoint: "partners",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Payments Endpoint (Done)
            case 'payments':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;
                    var workerQuery = urlQueries.worker || null;

                    // Define Individual Variables
                    var payments = {}

                    // Get Block Information
                    for (var pool in portalStats.stats) {
                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {
                            var paymentsData = getPaymentsData(portalStats, pool, workerQuery)
                            if (paymentsData.payments.length >= 1) {
                                payments[portalStats.stats[pool].name] = paymentsData.payments;
                            }
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "payments",
                        errors: "",
                        data: payments,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        endpoint: "payments",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Statistics Endpoint (Done)
            case 'statistics':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var poolQuery = urlQueries.pool || null;

                    // Define Individual Variables
                    var statistics = {}

                    // Get Pool Information
                    for (var pool in portalStats.stats) {
                        var formattedPool = (poolQuery != null ? poolQuery.toLowerCase() : null)
                        var currentPool = portalStats.stats[pool].name.toLowerCase()
                        if ((formattedPool === null) || (formattedPool === currentPool)) {
                            const blocksData = getBlocksData(portalStats, pool, null)
                            var statisticsData = {
                                pool: portalStats.stats[pool].name,
                                symbol: portalStats.stats[pool].symbol,
                                algorithm: portalStats.stats[pool].algorithm,
                                featured: portalStats.stats[pool].featured,
                                ports: portalStats.stats[pool].ports,
                                statistics: {
                                    invalidShares: portalStats.stats[pool].statistics.invalidShares,
                                    lastPaid: portalStats.stats[pool].statistics.lastPaid,
                                    paymentFees: portalStats.stats[pool].fees,
                                    paymentTime: portalStats.stats[pool].statistics.paymentTime,
                                    paymentMinimum: portalStats.stats[pool].statistics.paymentMinimum,
                                    totalPaid: portalStats.stats[pool].statistics.totalPaid,
                                    validShares: portalStats.stats[pool].statistics.validShares,
                                    validBlocks: portalStats.stats[pool].statistics.validBlocks,
                                    blocks: blocksData.statistics,
                                    hashrate: {
                                        hashrate: portalStats.stats[pool].hashrate.hashrate,
                                        hashrateShared: portalStats.stats[pool].hashrate.hashrateShared,
                                        hashrateSolo: portalStats.stats[pool].hashrate.hashrateSolo,
                                    },
                                    workers: {
                                        workers: portalStats.stats[pool].workers.workersCount,
                                        workersShared: portalStats.stats[pool].workers.workersSharedCount,
                                        workersSolo: portalStats.stats[pool].workers.workersSoloCount,
                                    }
                                },
                            }
                            statistics[pool] = statisticsData;
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "statistics",
                        errors: "",
                        data: statistics,
                    }

                    // Finalize Endpoint Information
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        endpoint: "statistics",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Wallets Endpoint (Done)
            case 'wallets':
                try {

                    // Check to Ensure URL is Formatted Properly
                    var urlQueries = req.query;
                    var workerQuery = urlQueries.worker || null;
                    if (workerQuery != null && workerQuery.length > 0) {

                        // Output Balance of Address
                        portalStats.getBalanceByAddress(workerQuery, function(balances) {

                            // Define Individual Variables
                            var blocks = {}
                            var payments = {}
                            var workers = {}

                            // Get Block Information
                            for (var pool in portalStats.stats) {
                                var blocksData = getBlocksData(portalStats, pool, workerQuery)
                                if ((blocksData.blocks.length >= 1)) {
                                    blocks[portalStats.stats[pool].name] = blocksData.blocks;
                                }
                                var paymentsData = getPaymentsData(portalStats, pool, workerQuery)
                                if (paymentsData.payments.length >= 1) {
                                    payments[portalStats.stats[pool].name] = paymentsData.payments;
                                }
                                var workersData = getWorkersData(portalStats, pool, workerQuery)
                                if (workersData.workers.length >= 1) {
                                    workers[portalStats.stats[pool].name] = workersData.workers;
                                }
                            }

                            // Structure Wallet Output
                            const wallets = {
                                worker: workerQuery,
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
                                endpoint: "wallets",
                                errors: "",
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
                            endpoint: "wallets",
                            errors: messages["parameters"],
                            data: {},
                        }

                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(payload));
                    }

                    return;

                }
                catch(err) {

                    // Finalize Payload
                    var payload = {
                        endpoint: "wallets",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(payload));

                    return;
                }

            // Workers Endpoint
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
                            var workersData = getWorkersData(portalStats, pool)
                            if (workersData.workers.length >= 1) {
                                workers[portalStats.stats[pool].name] = workersData.workers;
                            }
                        }
                    }

                    // Finalize Payload
                    var payload = {
                        endpoint: "workers",
                        errors: "",
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
                        endpoint: "workers",
                        errors: messages["invalid"],
                        data: {},
                    }

                    // Finalize Endpoint Information
                    res.writeHead(400, { 'Content-Type': 'application/json' });
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
