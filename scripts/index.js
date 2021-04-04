/*
 *
 * PoolInit (Updated)
 *
 */

// Import Required Modules
var fs = require('fs');
var path = require('path');
var os = require('os');
var cluster = require('cluster');
var extend = require('extend');
var redis = require('redis');
var RedisClustr = require('redis-clustr');

// Import Pool Functionality
var PoolListener = require('./main/listener.js');
var PoolLogger = require('./main/logger.js');
var PoolPayments = require('./main/payments.js');
var PoolServer = require('./main/server.js');
var PoolWorker = require('./main/worker.js');

// Import Stratum Algorithms
var algorithms = require('@blinkhash/blinkhash-stratum/scripts/main/algorithms.js');

// Import JSON Functionality
JSON.minify = JSON.minify || require("node-json-minify");

// Check to Ensure Config Exists
if (!fs.existsSync('config.json')) {
    console.log('config.json file does not exist. Read the installation/setup instructions.');
    return;
}

// Establish Pool Variables
var poolConfigs;
var partnerConfigs;
var portalConfig = JSON.parse(JSON.minify(fs.readFileSync("config.json", {encoding: 'utf8'})));
var logger = new PoolLogger({
    logLevel: portalConfig.logLevel,
    logColors: portalConfig.logColors
});

// Check for POSIX Installation
try {
    var posix = require('posix');
    try {
        posix.setrlimit('nofile', { soft: 100000, hard: 100000 });
        logger.debug('POSIX', 'Connection Limit', `Raised to 100K concurrent connections, now running as non-root user: ${  process.getuid()}`);
    }
    catch(e) {
        if (cluster.isMaster)
            logger.warning('POSIX', 'Connection Limit', '(Safe to ignore) Must be ran as root to increase resource limits');
    }
    finally {
        var uid = parseInt(process.env.SUDO_UID);
        if (uid) {
            process.setuid(uid);
            logger.debug('POSIX', 'Connection Limit', `Raised to 100K concurrent connections, now running as non-root user: ${  process.getuid()}`);
        }
    }
}
catch(e) {
    if (cluster.isMaster)
        logger.debug('POSIX', 'Connection Limit', '(Safe to ignore) POSIX module not installed and resource (connection) limit was not raised');
}

// Establish Pool Worker Cases
if (cluster.isWorker) {
    switch (process.env.workerType) {
        case 'payments':
            new PoolPayments(logger);
            break;
        case 'server':
            new PoolServer(logger);
            break;
        case 'worker':
            new PoolWorker(logger);
            break;
    }
    return;
}

// Generate Redis Client
function getRedisClient(portalConfig) {
    redisConfig = portalConfig.redis;
    if (redisConfig.password !== "") {
        return redis.createClient({
            port: redisConfig.port,
            host: redisConfig.host,
            password: redisConfig.password
        });
    }
    else {
        return redis.createClient({
            port: redisConfig.port,
            host: redisConfig.host,
        });
    }
}

// Read and Combine ALL Pool Configurations
function buildPoolConfigs() {
    var configs = {};
    var configDir = 'configs/';
    var poolConfigFiles = [];

    // Get FileNames of Pool Configurations
    fs.readdirSync(configDir).forEach(function(file) {
        if (!fs.existsSync(configDir + file) || path.extname(configDir + file) !== '.json') return;
        var poolOptions = JSON.parse(JSON.minify(fs.readFileSync(configDir + file, {encoding: 'utf8'})));
        if (!poolOptions.enabled) return;
        poolOptions.fileName = file;
        poolConfigFiles.push(poolOptions);
    });

    // Ensure No Overlap in Pool Ports
    for (var i = 0; i < poolConfigFiles.length; i++) {
        var ports = Object.keys(poolConfigFiles[i].ports);
        for (var f = 0; f < poolConfigFiles.length; f++) {
            if (f === i) continue;
            var portsF = Object.keys(poolConfigFiles[f].ports);
            for (var g = 0; g < portsF.length; g++) {
                if (ports.indexOf(portsF[g]) !== -1) {
                    logger.error('Master', poolConfigFiles[f].fileName, `Has same configured port of ${  portsF[g]  } as ${  poolConfigFiles[i].fileName}`);
                    process.exit(1);
                    return;
                }
            }
        }
    }

    // Iterate Through Each Configuration File
    poolConfigFiles.forEach(function(poolOptions) {

        // Establish JSON Mainnet Conversion
        if (poolOptions.coin.mainnet) {
            poolOptions.coin.mainnet.bip32.public = Buffer.from(poolOptions.coin.mainnet.bip32.public, 'hex').readUInt32LE(0);
            poolOptions.coin.mainnet.bip32.private = Buffer.from(poolOptions.coin.mainnet.bip32.private, 'hex').readUInt32LE(0);
            poolOptions.coin.mainnet.pubKeyHash = Buffer.from(poolOptions.coin.mainnet.pubKeyHash, 'hex').readUInt8(0);
            poolOptions.coin.mainnet.scriptHash = Buffer.from(poolOptions.coin.mainnet.scriptHash, 'hex').readUInt8(0);
            poolOptions.coin.mainnet.wif = Buffer.from(poolOptions.coin.mainnet.wif, 'hex').readUInt8(0);
        }

        // Establish JSON Testnet Conversion
        if (poolOptions.coin.testnet) {
            poolOptions.coin.testnet.bip32.public = Buffer.from(poolOptions.coin.testnet.bip32.public, 'hex').readUInt32LE(0);
            poolOptions.coin.testnet.bip32.private = Buffer.from(poolOptions.coin.testnet.bip32.private, 'hex').readUInt32LE(0);
            poolOptions.coin.testnet.pubKeyHash = Buffer.from(poolOptions.coin.testnet.pubKeyHash, 'hex').readUInt8(0);
            poolOptions.coin.testnet.scriptHash = Buffer.from(poolOptions.coin.testnet.scriptHash, 'hex').readUInt8(0);
            poolOptions.coin.testnet.wif = Buffer.from(poolOptions.coin.testnet.wif, 'hex').readUInt8(0);
        }

        // Load Configuration from File
        for (var option in portalConfig.defaultPoolConfigs) {
            if (!(option in poolOptions)) {
                var toCloneOption = portalConfig.defaultPoolConfigs[option];
                var clonedOption = {};
                if (toCloneOption.constructor === Object)
                    extend(true, clonedOption, toCloneOption);
                else
                    clonedOption = toCloneOption;
                poolOptions[option] = clonedOption;
            }
        }
        configs[poolOptions.coin.name] = poolOptions;

        // Check to Ensure Algorithm is Supported
        if (!(poolOptions.coin.algorithm in algorithms)) {
            logger.error('Master', poolOptions.coin.name, `Cannot run a pool for unsupported algorithm "${  poolOptions.coin.algorithm  }"`);
            delete configs[poolOptions.coin.name];
        }
    });

    return configs;
};

// Read and Combine ALL Partner Configurations
function buildPartnerConfigs() {
    var configs = {};
    var configDir = 'partners/';

    // Get FileNames of Partner Configurations
    fs.readdirSync(configDir).forEach(function(file) {
        const currentDate = new Date()
        if (!fs.existsSync(configDir + file) || path.extname(configDir + file) !== '.json') return;
        var partnerOptions = JSON.parse(JSON.minify(fs.readFileSync(configDir + file, {encoding: 'utf8'})));
        if (new Date(partnerOptions.subscription.endDate) < currentDate) return;
        configs[partnerOptions.name] = partnerOptions;
    });

    return configs;
}

// Functionality for Pool Listener
function startPoolListener() {

    // Establish Listener Variables
    var cliPort = portalConfig.cliPort;
    var listener = new PoolListener(cliPort);

    // Establish Listener Log
    listener.on('log', function(text) {
        logger.debug('Master', 'CLI', text);

    // Establish Listener Commands
    }).on('command', function(command, params, options, reply) {
        switch (command) {
            case 'reloadpool':
                Object.keys(cluster.workers).forEach(function(id) {
                    cluster.workers[id].send({type: 'reloadpool', coin: params[0] });
                });
                reply(`reloaded pool ${  params[0]}`);
                break;
            default:
                reply(`unrecognized command "${  command  }"`);
                break;
        }
    }).start();
};

// Functionality for Pool Payments
function startPoolPayments() {

    // Check if Pool Enabled Payments
    var enabledForAny = false;
    for (var pool in poolConfigs) {
        var p = poolConfigs[pool];
        var enabled = p.enabled && p.paymentProcessing && p.paymentProcessing.enabled;
        if (enabled) {
            enabledForAny = true;
            break;
        }
    }

    // Return if No One Needs Payments
    if (!enabledForAny)
        return;

    // Establish Pool Payments
    var worker = cluster.fork({
        workerType: 'payments',
        pools: JSON.stringify(poolConfigs),
        portalConfig: JSON.stringify(portalConfig)
    });

    /* eslint-disable no-unused-vars */
    worker.on('exit', function(code, signal) {
        logger.error('Master', 'Payments', 'Payment process died, starting replacement...');
        setTimeout(function() {
            startPoolPayments();
        }, 2000);
    });
};

function startPoolServer() {

    var worker = cluster.fork({
        workerType: 'server',
        partners: JSON.stringify(partnerConfigs),
        pools: JSON.stringify(poolConfigs),
        portalConfig: JSON.stringify(portalConfig)
    });

    /* eslint-disable no-unused-vars */
    worker.on('exit', function(code, signal) {
        logger.error('Master', 'Server', 'Server process died, starting replacement...');
        setTimeout(function() {
            startPoolServer();
        }, 2000);
    });
};

// Functionality for Pool Workers
function startPoolWorkers() {

    // Check if Daemons Configured
    var connection;
    Object.keys(poolConfigs).forEach(function(coin) {
        var p = poolConfigs[coin];
        if (!Array.isArray(p.daemons) || p.daemons.length < 1) {
            logger.error('Master', coin, 'No daemons configured so a pool cannot be started for this coin.');
            delete poolConfigs[coin];
        }
        else if (!connection) {
            connection = getRedisClient(portalConfig);
            connection.on('ready', function() {
                logger.debug('Master', coin, `Processing setup with redis (${  redisConfig.host  }:${  redisConfig.port   })`);
            });
        }
    });

    // Check if No Configurations Exist
    if (Object.keys(poolConfigs).length === 0) {
        logger.warning('Master', 'Workers', 'No pool configs exists or are enabled in configs folder. No pools started.');
        return;
    }

    // Establish Forking/Clustering
    var serializedConfigs = JSON.stringify(poolConfigs);
    var numForks = (function() {
        if (!portalConfig.clustering || !portalConfig.clustering.enabled)
            return 1;
        if (portalConfig.clustering.forks === 'auto')
            return os.cpus().length;
        if (!portalConfig.clustering.forks || isNaN(portalConfig.clustering.forks))
            return 1;
        return portalConfig.clustering.forks;
    })();

    // Establish Pool Workers
    var poolWorkers = {};
    var createPoolWorker = function(forkId) {
        var worker = cluster.fork({
            workerType: 'worker',
            forkId: forkId,
            pools: serializedConfigs,
            portalConfig: JSON.stringify(portalConfig)
        });
        worker.forkId = forkId;
        worker.type = 'worker';
        poolWorkers[forkId] = worker;

        /* eslint-disable no-unused-vars */
        worker.on('exit', function(code, signal) {
            logger.error('Master', 'Workers', `Fork ${  forkId  } died, starting replacement worker...`);
            setTimeout(function() {
                createPoolWorker(forkId);
            }, 2000);
        }).on('message', function(msg) {
            switch (msg.type) {
                case 'banIP':
                    Object.keys(cluster.workers).forEach(function(id) {
                        if (cluster.workers[id].type === 'worker') {
                            cluster.workers[id].send({type: 'banIP', ip: msg.ip});
                        }
                    });
                    break;
            }
        });
    };

    // Create Pool Workers
    var i = 0;
    var startInterval = setInterval(function() {
        createPoolWorker(i);
        i++;
        if (i === numForks) {
            clearInterval(startInterval);
            logger.debug('Master', 'Workers', `Started ${  Object.keys(poolConfigs).length  } pool(s) on ${  numForks  } thread(s)`);
        }
    }, 250);

};

// Initialize Server
var PoolInit = function() {

    // Build Configurations
    poolConfigs = buildPoolConfigs();
    partnerConfigs = buildPartnerConfigs();

    // Start Pool Workers
    startPoolListener();
    startPoolWorkers();
    startPoolPayments();
    startPoolServer();

}();
