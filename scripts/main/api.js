/*
 *
 * PoolAPI (Updated)
 *
 */

// Import Pool Functionality
const PoolStats = require('./stats.js');

// Pool Stats Main Function
const PoolAPI = function (logger, partnerConfigs, poolConfigs, portalConfig) {

    // Establish API Variables
    const _this = this;
    this.poolStats = new PoolStats(logger, poolConfigs, portalConfig);
    this.stats = this.poolStats.stats

    // Manage API Error Messages
    const messages = {
        invalid: "The server was unable to handle your request. Verify your input and try again.",
        parameters: "Your request is missing parameters. Verify your input and try again."
    }

    // Builder Functions
    ////////////////////////////////////////////////////////////////////////////

    // Build Pending Block Data
    this.buildPending = function(pool) {
        const blocks = []
        const pending = _this.stats[pool].blocks.pending;
        Object.keys(pending).forEach(block => {
            const blockInformation = JSON.parse(pending[block]);
            const blockConfirms = _this.stats[pool].blocks.confirmations;
            const blockData = {
                "pool": _this.stats[pool].name,
                "symbol": _this.stats[pool].symbol,
                "algorithm": _this.stats[pool].algorithm,
                "confirmations": blockConfirms[blockInformation.hash] || 1,
                "difficulty": blockInformation.difficulty,
                "hash": blockInformation.hash,
                "height": blockInformation.height,
                "reward": blockInformation.reward / 1e8,
                "time": blockInformation.time,
                "type": blockInformation.type,
                "transaction": blockInformation.transaction,
                "worker": blockInformation.worker,
            }
            blocks.push(blockData);
        });
        return blocks;
    }

    // Build Confirmed Block Data
    this.buildConfirmed = function(pool) {
        const blocks = []
        const confirmed = _this.stats[pool].blocks.confirmed
        Object.keys(confirmed).forEach(block => {
            const blockInformation = JSON.parse(confirmed[block]);
            const blockData = {
                "pool": _this.stats[pool].name,
                "symbol": _this.stats[pool].symbol,
                "algorithm": _this.stats[pool].algorithm,
                "confirmations": 100,
                "difficulty": blockInformation.difficulty,
                "hash": blockInformation.hash,
                "height": blockInformation.height,
                "reward": blockInformation.reward / 1e8,
                "time": blockInformation.time,
                "type": blockInformation.type,
                "transaction": blockInformation.transaction,
                "worker": blockInformation.worker,
            }
            blocks.push(blockData);
        })
        return blocks;
    }

    // Build Output Payment Data
    this.buildPayments = function(pool) {
        const payments = []
        for (var w in _this.stats[pool].payments) {
            const paymentInformation = _this.stats[pool].payments[w];
            const paymentsData = {
                "pool": _this.stats[pool].name,
                "symbol": _this.stats[pool].symbol,
                "algorithm": _this.stats[pool].algorithm,
                "paid": paymentInformation.paid,
                "records": paymentInformation.records,
                "shares": paymentInformation.shares,
                "time": paymentInformation.time,
                "totals": paymentInformation.totals,
                "transaction": paymentInformation.transaction,
                "unpaid": paymentInformation.unpaid,
                "workers": paymentInformation.workers,
            }
            payments.push(paymentsData);
        }
        return payments;
    }

    // Build Shared Worker Data
    this.buildShared = function(pool) {
        const workers = []
        for (var w in _this.stats[pool].workers.workersShared) {
            const workerInformation = _this.stats[pool].workers.workersShared[w];
            const workersData = {
                "pool": _this.stats[pool].name,
                "symbol": _this.stats[pool].symbol,
                "algorithm": _this.stats[pool].algorithm,
                "address": w,
                "difficulty": workerInformation.difficulty,
                "hashrate": workerInformation.hashrate,
                "hashrateType": workerInformation.hashrateType,
                "miningType": workerInformation.miningType,
                "shares": {
                    "total": workerInformation.totalShares,
                    "invalid": workerInformation.invalidShares,
                    "valid": workerInformation.validShares,
                },
            }
            workers.push(workersData);
        }
        return workers;
    }

    // Build Solo Worker Data
    this.buildSolo = function(pool) {
        const workers = []
        for (var w in _this.stats[pool].workers.workersSolo) {
            const workerInformation = _this.stats[pool].workers.workersSolo[w];
            const workersData = {
                "pool": _this.stats[pool].name,
                "symbol": _this.stats[pool].symbol,
                "algorithm": _this.stats[pool].algorithm,
                "address": w,
                "difficulty": workerInformation.difficulty,
                "hashrate": workerInformation.hashrate,
                "hashrateType": workerInformation.hashrateType,
                "miningType": workerInformation.miningType,
                "shares": {
                    "total": workerInformation.totalShares,
                    "invalid": workerInformation.invalidShares,
                    "valid": workerInformation.validShares,
                },

            }
            workers.push(workersData);
        }
        return workers;
    }

    // Formatting Functions
    ////////////////////////////////////////////////////////////////////////////

    // Format Block Data
    this.formatBlocks = function() {

        // Establish Block Variables
        var blocks = []
        var statistics = {}

    }

    // Output Functions
    ////////////////////////////////////////////////////////////////////////////

    // Build Output Block Data
    this.outputBlocks = function() {

        // Check for Query Parameters
        const urlQueries = req.query;
        let poolQuery = urlQueries.pool || null;
        let workerQuery = urlQueries.worker || null;

        // Establish Block Variables
        const blocks = {}

        // Calculate Block Information
        Object.keys(_this.stats).forEach(pool => {
            const currentPool = _this.stats[pool].name.toLowerCase();
            poolQuery = (poolQuery != null ? poolQuery.toLowerCase() : null)
            if ((poolQuery === null) || (poolQuery === currentPool)) {
                const pending = _this.buildPending(pool);
                const confirmed = _this.buildConfirmed(pool);
                const combined = pending.concat(confirmed);
                blocks[_this.stats[pool].name] = combined.blocks;
            }
        });

        // Return Calculated Blocks
        return blocks
    }







    // Build Output Block Data
    this.buildBlocks = function(pool) {
        const pending = _this.buildPending(pool);
        const confirmed = _this.buildConfirmed(pool);
        return pending.concat(confirmed);
    }

    // Build Output Worker Data
    this.buildWorkers = function(pool) {
        const shared = _this.buildShared(pool);
        const solo = _this.buildSolo(pool);
        return shared.concat(solo);
    }

    // Build Output Statistics Data
    this.buildStatistics = function(pool) {
        const statistics = {
            "pool": _this.stats[pool].name,
            "symbol": _this.stats[pool].symbol,
            "algorithm": _this.stats[pool].algorithm,
            "blocks": {
                "total": "",
                "invalid": _this.stats[pool].statistics.invalidBlocks,
                "valid": _this.stats[pool].statistics.validBlocks,
            },
            "config": {
                "featured": _this.stats[pool].featured,
                "logo": _this.stats[pool].logo,
                "ports": _this.stats[pool].ports,
            },
            "hashrate": {
                "total": _this.stats[pool].hashrate.hashrate,
                "shared": _this.stats[pool].hashrate.hashrateShared,
                "solo": _this.stats[pool].hashrate.hashrateSolo,
            },
            "payments": {
                "lastPaid": _this.stats[pool].statistics.lastPaid,
                "minimumPaid": _this.stats[pool].statistics.paymentMinimum,
                "totalPaid": _this.stats[pool].statistics.totalPaid,
                "paymentTime": _this.stats[pool].statistics.paymentTime,
            },
            "shares": {
                "total": "",
                "invalid": _this.stats[pool].statistics.invalidShares,
                "valid": _this.stats[pool].statistics.validShares,
            },
            "workers": {
                "total": _this.stats[pool].workers.workersCount,
                "shared": _this.stats[pool].workers.workersSharedCount,
                "solo": _this.stats[pool].workers.workersSoloCount,
            }
        }
        return statistics;
    }









    // Collect Current Blocks Data
    function getBlocksData(portalStats, pool, address) {

        // Establish Block Variables
        var blocks = []

        if (worker != null && worker.length > 0) {
            blocks = blocks.filter(block => {
                return block.worker === worker;
            });
        }
        return blocks;

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
                catch(e) {

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
                catch(e) {

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
                catch(e) {

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
                catch(e) {

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
                                logo: portalStats.stats[pool].logo,
                                featured: portalStats.stats[pool].featured,
                                ports: portalStats.stats[pool].ports,
                                statistics: {
                                    hashrateType: portalStats.stats[pool].statistics.hashrateType,
                                    invalidShares: portalStats.stats[pool].statistics.invalidShares,
                                    lastPaid: portalStats.stats[pool].statistics.lastPaid,
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
                catch(e) {

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
                            var blocks;
                            var payments;
                            var workers;
                            var name = 'Bitcoin';
                            var symbol = 'BTC';
                            var algorithm = 'sha256';
                            var poolFlag = false;

                            // Get Block Information
                            for (var pool in portalStats.stats) {
                                var blocksData = getBlocksData(portalStats, pool, workerQuery)
                                if ((blocksData.blocks.length >= 1)) {
                                    blocks = blocksData.blocks;
                                    poolFlag = true;
                                }
                                var paymentsData = getPaymentsData(portalStats, pool, workerQuery)
                                if (paymentsData.payments.length >= 1) {
                                    payments = paymentsData.payments;
                                    poolFlag = true;
                                }
                                var workersData = getWorkersData(portalStats, pool, workerQuery)
                                if (workersData.workers.length >= 1) {
                                    workers = workersData.workers;
                                    poolFlag = true;
                                }
                                if (poolFlag === true) {
                                    name = portalStats.stats[pool].name;
                                    symbol = portalStats.stats[pool].symbol;
                                    algorithm = portalStats.stats[pool].algorithm;
                                    break;
                                }
                            }

                            // Combined Balance
                            const combined = balances.totalBalance + balances.totalImmature + balances.totalPaid + balances.totalUnpaid;

                            // Structure Wallet Output
                            const wallets = {
                                pool: name,
                                symbol: symbol,
                                algorithm: algorithm,
                                worker: workerQuery,
                                balance: balances.totalBalance.toFixed(8),
                                immature: balances.totalImmature.toFixed(8),
                                paid: balances.totalPaid.toFixed(8),
                                unpaid: balances.totalUnpaid.toFixed(8),
                                total: combined.toFixed(8),
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
                catch(e) {

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
                catch(e) {

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
