/*
 *
 * PoolInit (Updated)
 *
 */

// Import Required Modules
const fs = require('fs');
const path = require('path');
const os = require('os');
const cluster = require('cluster');
const extend = require('extend');
const redis = require('redis');

// Import Pool Functionality
const PoolListener = require('./main/listener.js');
const PoolLogger = require('./main/logger.js');
const PoolPayments = require('./main/payments.js');
const PoolServer = require('./main/server.js');
const PoolWorker = require('./main/worker.js');

const algorithms = require('@blinkhash/blinkhash-stratum/scripts/main/algorithms.js');
JSON.minify = JSON.minify || require("node-json-minify");

// Check to Ensure Config Exists
if (!fs.existsSync('config.json')) {
    console.log('config.json file does not exist. Read the installation/setup instructions.');
    return;
}

const portalConfig = JSON.parse(JSON.minify(fs.readFileSync("config.json", {encoding: 'utf8'})));
const logger = new PoolLogger({ logLevel: portalConfig.logLevel, logColors: portalConfig.logColors });

// Pool Initializer Main Function
const PoolInitializer = function() {

    // Establish Initializer Variables
    const _this = this;
    this.portalConfig = portalConfig;
    this.logger = logger;

    // Generate Redis Client
    this.getRedisClient = function() {
        redisConfig = _this.portalConfig.redis;
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

    // Read and Combine Pool Configurations
    this.buildPoolConfigs = function() {

        // Establish Pool Variables
        const configs = {};
        const configDir = 'configs/';
        const poolConfigFiles = [];

        // Get FileNames of Pool Configurations
        fs.readdirSync(configDir).forEach(file => {
            if (!fs.existsSync(configDir + file) || path.extname(configDir + file) !== '.json') return;
            const config = JSON.parse(JSON.minify(fs.readFileSync(configDir + file, {encoding: 'utf8'})));
            if (!config.enabled) return;
            config.fileName = file;
            poolConfigFiles.push(config);
        });

        // Ensure No Overlap in Pool Ports
        const currentPorts = []
        poolConfigFiles
            .flatMap(configFile => Object.keys(configFile.ports))
            .forEach((port, idx) => {
                if (currentPorts.indexOf(port) !== -1) {
                    logger.error('Master', poolConfigFiles[idx].fileName, `Overlapping configuration on port ${ port }`);
                    process.exit(1);
                    return;
                }
                currentPorts.push(port);
            });

        // Iterate Through Each Configuration File
        poolConfigFiles.forEach(config => {

            // Ensure Algorithm is Supported
            if (!(config.coin.algorithm in algorithms)) {
                logger.error('Master', config.coin.name, `Cannot run a pool for unsupported algorithm "${  config.coin.algorithm  }"`);
                delete configs[config.coin.name];
                return;
            }

            // Establish JSON Mainnet Conversion
            if (config.coin.mainnet) {
                config.coin.mainnet.bip32.public = Buffer.from(config.coin.mainnet.bip32.public, 'hex').readUInt32LE(0);
                config.coin.mainnet.bip32.private = Buffer.from(config.coin.mainnet.bip32.private, 'hex').readUInt32LE(0);
                config.coin.mainnet.pubKeyHash = Buffer.from(config.coin.mainnet.pubKeyHash, 'hex').readUInt8(0);
                config.coin.mainnet.scriptHash = Buffer.from(config.coin.mainnet.scriptHash, 'hex').readUInt8(0);
                config.coin.mainnet.wif = Buffer.from(config.coin.mainnet.wif, 'hex').readUInt8(0);
            }

            // Establish JSON Testnet Conversion
            if (config.coin.testnet) {
                config.coin.testnet.bip32.public = Buffer.from(config.coin.testnet.bip32.public, 'hex').readUInt32LE(0);
                config.coin.testnet.bip32.private = Buffer.from(config.coin.testnet.bip32.private, 'hex').readUInt32LE(0);
                config.coin.testnet.pubKeyHash = Buffer.from(config.coin.testnet.pubKeyHash, 'hex').readUInt8(0);
                config.coin.testnet.scriptHash = Buffer.from(config.coin.testnet.scriptHash, 'hex').readUInt8(0);
                config.coin.testnet.wif = Buffer.from(config.coin.testnet.wif, 'hex').readUInt8(0);
            }

            // Load Configuration from File
            Object.keys(_this.portalConfig.defaultPoolConfigs).forEach(option => {
                if (!(option in config)) {
                    let clonedOption = {};
                    const toCloneOption = _this.portalConfig.defaultPoolConfigs[option];
                    if (toCloneOption.constructor === Object) {
                        extend(true, clonedOption, toCloneOption);
                    }
                    else {
                        clonedOption = toCloneOption;
                    }
                    config[option] = clonedOption;
                }
            });

            // Update PoolOptions w/ Changes Made
            configs[config.coin.name] = config;
        });

        // Return Updated Configs
        return configs;
    };

    // Read and Combine Partner Configurations
    this.buildPartnerConfigs = function() {

        // Establish Partner Variables
        const configs = {};
        const configDir = 'partners/';

        // Get FileNames of Partner Configurations
        fs.readdirSync(configDir).forEach(file => {
            const currentDate = new Date()
            if (!fs.existsSync(configDir + file) || path.extname(configDir + file) !== '.json') return;
            const partnerOptions = JSON.parse(JSON.minify(fs.readFileSync(configDir + file, {encoding: 'utf8'})));
            if (new Date(partnerOptions.subscription.endDate) < currentDate) return;
            configs[partnerOptions.name] = partnerOptions;
        });

        // Return Updated Configs
        return configs;
    }

    // Build Configurations
    _this.pools = this.buildPoolConfigs();
    _this.partners = this.buildPartnerConfigs();

    // Functionality for Pool Listener
    this.startPoolListener = function() {

        // Establish Listener Variables
        const cliPort = _this.portalConfig.cliPort;
        const listener = new PoolListener(cliPort);

        // Establish Listener Log
        listener.on('log', function(text) {
            logger.debug('Master', 'CLI', text);
        });

        // Establish Listener Commands
        listener.on('command', function(command, params, options, reply) {
            switch (command) {
                case 'reloadpool':
                    Object.keys(cluster.workers).forEach(id => {
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
    this.startPoolPayments = function() {

        // Check if Pool Enabled Payments
        let enabled = false;
        Object.keys(_this.pools).forEach(config => {
            const pool = _this.pools[config];
            if (pool.enabled && pool.paymentProcessing && pool.paymentProcessing.enabled) {
                enabled = true;
            };
        })

        // Establish Pool Payments
        if (!enabled) return;
        const worker = cluster.fork({
            workerType: 'payments',
            pools: JSON.stringify(_this.pools),
            portalConfig: JSON.stringify(_this.portalConfig)
        });

        // Establish Worker Exit
        worker.on('exit', function(code, signal) {
            logger.error('Master', 'Payments', 'Payment process died, starting replacement...');
            setTimeout(() => {
                _this.startPoolPayments();
            }, 2000);
        });
    };

    // Functionality for Pool Server
    this.startPoolServer = function() {

        // Establish Pool Server
        const worker = cluster.fork({
            workerType: 'server',
            partners: JSON.stringify(_this.partners),
            pools: JSON.stringify(_this.pools),
            portalConfig: JSON.stringify(_this.portalConfig)
        });

        // Establish Worker Exit
        worker.on('exit', function(code, signal) {
            logger.error('Master', 'Server', 'Server process died, starting replacement...');
            setTimeout(() => {
                _this.startPoolServer();
            }, 2000);
        });
    };

    // Functionality for Pool Workers
    this.startPoolWorkers = function() {

        // Check if No Configurations Exist
        if (Object.keys(_this.pools).length === 0) {
            logger.warning('Master', 'Workers', 'No pool configs exists or are enabled in configs folder. No pools started.');
            return;
        }

        // Check if Daemons Configured
        let connection;
        Object.keys(_this.pools).forEach(config => {
            const pool = _this.pools[config];
            if (!Array.isArray(pool.daemons) || pool.daemons.length < 1) {
                logger.error('Master', config, 'No daemons configured so a pool cannot be started for this coin.');
                delete _this.pools[config];
            }
            else if (!connection) {
                connection = _this.getRedisClient(config);
                connection.on('ready', function() {
                    logger.debug('Master', config, `Processing setup with redis (${ redisConfig.host }:${ redisConfig.port })`);
                });
            }
        });

        // Establish Forking/Clustering
        const serializedConfigs = JSON.stringify(_this.pools);
        let numForks = (function() {
            if (!_this.portalConfig.clustering || !_this.portalConfig.clustering.enabled)
                return 1;
            if (_this.portalConfig.clustering.forks === 'auto')
                return os.cpus().length;
            if (!_this.portalConfig.clustering.forks || isNaN(_this.portalConfig.clustering.forks))
                return 1;
            return _this.portalConfig.clustering.forks;
        })();

        // Establish Pool Workers
        const poolWorkers = {};
        const createPoolWorker = function(forkId) {

            // Establish Pool Worker
            const worker = cluster.fork({
                workerType: 'worker',
                forkId: forkId,
                pools: serializedConfigs,
                portalConfig: JSON.stringify(_this.portalConfig)
            });

            // Establish Worker Settings
            worker.forkId = forkId;
            worker.type = 'worker';
            poolWorkers[forkId] = worker;

            // Establish Worker Exit
            worker.on('exit', function(code, signal) {
                logger.error('Master', 'Workers', `Fork ${  forkId  } died, starting replacement worker...`);
                setTimeout(() => {
                    createPoolWorker(forkId);
                }, 2000);
            });

            // Establish Worker Messaging
            worker.on('message', function(msg) {
                switch (msg.type) {
                    case 'banIP':
                        Object.keys(cluster.workers).forEach(id => {
                            if (cluster.workers[id].type === 'worker') {
                                cluster.workers[id].send({ type: 'banIP', ip: msg.ip });
                            }
                        });
                        break;
                }
            });
        };

        // Create Pool Workers
        let numWorkers = 0;
        const startInterval = setInterval(() => {
            createPoolWorker(numWorkers);
            numWorkers += 1;
            if (numWorkers === numForks) {
                clearInterval(startInterval);
                logger.debug('Master', 'Workers', `Started ${ Object.keys(_this.pools).length } pool(s) on ${ numForks } thread(s)`);
            }
        }, 250);
    };
};

// Pool Builder Main Function
const PoolBuilder = function() {

    // Handle Master Forks
    if (cluster.isMaster) {
        const pool = new PoolInitializer();
        pool.startPoolListener();
        pool.startPoolPayments();
        pool.startPoolServer();
        pool.startPoolWorkers();
    }

    // Handle Worker Forks
    if (cluster.isWorker) {
        switch (process.env.workerType) {
            case 'payments':
                worker = new PoolPayments(logger);
                break;
            case 'server':
                worker = new PoolServer(logger);
                break;
            case 'worker':
                worker = new PoolWorker(logger);
                break;
            default:
                break;
        }
    }
}();
