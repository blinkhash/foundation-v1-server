/*
 *
 * PoolInit (Updated)
 *
 */

const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const redis = require('redis');
const utils = require('./main/utils');

const Algorithms = require('blinkhash-stratum').algorithms;
const PoolLogger = require('./main/logger');
const PoolWorkers = require('./main/workers');

// Check to Ensure Config Exists
if (!fs.existsSync('config.json')) {
    console.log('config.json file does not exist. Read the installation/setup instructions.');
    return;
}

const config = utils.readFile("config.json");
const logger = new PoolLogger({ logLevel: config.logLevel, logColors: config.logColors });

// Main Builder Function
const PoolBuilder = function() {

    const _this = this;
    this.config = config;
    this.logger = logger;

    // Format Pool Configurations
    this.formatPoolConfigs = function(configFiles, configPorts, config) {

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

        // Check for Overlapping Ports
        configFiles.push(config)
        configFiles.flatMap(configFile => Object.keys(configFile.ports))
            .forEach((port, idx) => {
                if (configPorts.indexOf(port) !== -1) {
                    _this.logger.error('Master', configFiles[idx].coin.name, `Overlapping configuration on port ${ port }`);
                    process.exit(1);
                    return;
                }
                configPorts.push(port);
            }
        );

        // Clone Default Settings from Portal Config
        Object.keys(_this.config.settings).forEach(setting => {
            if (!(setting in _this.config)) {
                let settingCopy = _this.config.settings[setting];
                if (typeof setting === 'object') {
                    settingCopy = Object.assign({}, _this.config.settings[setting]);
                }
                config[setting] = settingCopy;
            }
        });

        return config
    }

    // Build Pool Configurations
    this.buildPoolConfigs = function() {

        const configs = {};
        const configFiles = []
        const configPorts = []
        const configDir = 'configs/';

        // Iterate Through Each Configuration File
        fs.readdirSync(configDir).forEach(file => {

            // Check if File is Formatted Properly
            if (!fs.existsSync(configDir + file) || path.extname(configDir + file) !== '.json') {
                return;
            }

            // Read and Check File
            let config = utils.readFile(configDir + file)
            if (!config.enabled) return;
            if (!config.coin.algorithm in Algorithms) {
                _this.logger.error('Master', config.coin.name, `Cannot run a pool for unsupported algorithm "${ config.coin.algorithm }"`);
                return;
            }

            config = _this.formatPoolConfigs(configFiles, configPorts, config);
            configs[config.coin.name] = config;
        });

        return configs;
    }

    // Read and Format Partner Configs
    this.buildPartnerConfigs = function() {

        const configs = {};
        const configDir = 'partners/';

        // Iterate Through Each Configuration File
        fs.readdirSync(configDir).forEach(file => {

            // Check if File is Formatted Properly
            if (!fs.existsSync(configDir + file) || path.extname(configDir + file) !== '.json') {
                return;
            }

            // Read and Check File
            const currentDate = new Date()
            const config = utils.readFile(configDir + file)
            if (new Date(config.subscription.endDate) < currentDate) {
                return
            };

            configs[config.name] = config;
        });

        return configs;
    }

    this.pools = _this.buildPoolConfigs();
    this.partners = _this.buildPartnerConfigs();

    // Handle Pool Worker Creation
    this.createPoolWorkers = function(poolWorkers, forkId) {

        // Build Worker from Data
        const worker = cluster.fork({
            workerType: 'worker',
            poolConfigs: JSON.stringify(_this.pools),
            portalConfig: JSON.stringify(_this.config),
            forkId: forkId,
        });

        worker.forkId = forkId;
        worker.type = 'worker';
        poolWorkers[forkId] = worker;

        worker.on('message', (msg) => {
            switch (msg.type) {
                case 'banIP':
                    Object.keys(cluster.workers).forEach(id => {
                        if (cluster.workers[id].type === 'worker') {
                            cluster.workers[id].send({ type: 'banIP', ip: msg.ip });
                        }
                    });
                    break;
                default:
                    break;
            }
        });

        worker.on('exit', (code, signal) => {
            _this.logger.error('Master', 'Workers', `Fork ${ forkId } died, starting replacement worker...`);
            setTimeout(() => {
                createPoolWorker(forkId);
            }, 2000);
        });

        return worker;
    }

    // Functionality for Pool Workers
    this.startPoolWorkers = function() {

        const poolWorkers = {};
        let numWorkers = 0;

        // Check if No Configurations Exist
        if (Object.keys(_this.pools).length === 0) {
            _this.logger.warning('Master', 'Workers', 'No pool configs exists or are enabled in configs folder. No pools started.');
            return;
        }

        // Check if Daemons Configured
        Object.keys(_this.pools).forEach(config => {
            const pool = _this.pools[config];
            if (!Array.isArray(pool.daemons) || pool.daemons.length < 1) {
                _this.logger.error('Master', config, 'No daemons configured so a pool cannot be started for this coin.');
                delete _this.pools[config];
            }
        });

        // Create Pool Workers
        const numForks = utils.countProcessForks(_this.config);
        const startInterval = setInterval(() => {
            _this.createPoolWorkers(poolWorkers, numWorkers);
            numWorkers += 1;
            if (numWorkers === numForks) {
                clearInterval(startInterval);
                _this.logger.debug('Master', 'Workers', `Started ${ Object.keys(_this.pools).length } pool(s) on ${ numForks } thread(s)`);
            }
        }, 250);
    }
}

// Pool Initializer Main Function
const PoolInitializer = function() {

    const _this = this;
    this.config = config;
    this.logger = logger;

    // Build and Connect to Redis Client
    this.buildRedisClient = function() {
        if (_this.config.redis.password !== "") {
            return redis.createClient({
                port: _this.config.redis.port,
                host: _this.config.redis.host,
                password: _this.config.redis.password
            });
        }
        else {
            return redis.createClient({
                port: _this.config.redis.port,
                host: _this.config.redis.host,
            });
        }
    }

    // Check Redis Client Version
    this.checkRedisClient = function(client) {
        client.info((error, response) => {
            if (error) {
                logger.error(logSystem, logComponent, logSubCat, 'Redis version check failed');
                return;
            }
            let version;
            const settings = response.split('\r\n');
            settings.forEach(line => {
                if (line.indexOf('redis_version') !== -1) {
                    version = parseFloat(line.split(':')[1])
                    return;
                }
            });
            if (!version || version <= 2.6) {
                logger.error(logSystem, logComponent, logSubCat, 'Could not detect redis version or your redis client is out of date');
            }
            return;
        })
    }

    // Start Pool Server
    this.start = function() {

        // Handle Master Forks
        if (cluster.isMaster) {
            const pool = new PoolBuilder();
            pool.startPoolWorkers();
        }

        // Handle Worker Forks
        if (cluster.isWorker) {
            switch (process.env.workerType) {
                case 'worker':
                    const client = _this.buildRedisClient();
                    _this.checkRedisClient(client)
                    worker = new PoolWorkers(_this.logger, client).start();
                    break;
                default:
                    break;
            }
        }
    }
};

// Start Pool Server
const server = new PoolInitializer().start();
