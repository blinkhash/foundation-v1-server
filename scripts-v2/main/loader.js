/*
 *
 * Loader (Updated)
 *
 */

const fs = require('fs');
const path = require('path');
const Algorithms = require('blinkhash-stratum').algorithms;

////////////////////////////////////////////////////////////////////////////////

// Main Builder Function
const PoolLoader = function(logger, portalConfig) {

    const _this = this;
    this.portalConfig = portalConfig;

    // Validate Partner Configs
    this.validatePartnerConfigs = function(partnerConfig) {
        const currentDate = new Date();
        if (new Date(partnerConfig.subscription.endDate) < currentDate) {
            return false;
        }
        return true;
    };

    // Validate Pool Configs
    this.validatePoolConfigs = function(poolConfig) {
        if (!poolConfig.enabled) return false;
        if (!(poolConfig.coin.algorithm in Algorithms)) {
            logger.error('Builder', poolConfig.coin.name, `Cannot run a pool for unsupported algorithm "${ poolConfig.coin.algorithm }"`);
            return false;
        }
        return true;
    };

    // Check for Overlapping Pool Names
    this.validatePoolNames = function(poolConfigs, poolConfig) {
        let configNames = Object.keys(poolConfigs);
        configNames = configNames.concat(poolConfig.coin.name);
        if (new Set(configNames).size !== configNames.length) {
            logger.error('Builder', 'Setup', 'Overlapping coin names. Check your configuration files');
            return false;
        }
        return true
    }

    // Check for Overlapping Pool Ports
    this.validatePoolPorts = function(poolConfigs, poolConfig) {
        const currentPorts = poolConfig.ports.flatMap(config => config.port);
        let configPorts = Object.values(poolConfigs)
            .filter(config => config.enabled)
            .flatMap(config => config.ports)
            .filter(config => config.enabled)
            .flatMap(config => config.port);
        configPorts = configPorts.concat(currentPorts);
        if (new Set(configPorts).size !== configPorts.length) {
            logger.error('Builder', 'Setup', 'Overlapping port configuration. Check your configuration files');
            return false;
        }
        return true;
    };

    // Read and Format Partner Configs
    /* istanbul ignore next */
    this.buildPartnerConfigs = function() {
        const partnerConfigs = {};
        const normalizedPath = path.join(__dirname, '../../configs/partners/');
        fs.readdirSync(normalizedPath).forEach(file => {
            if (!fs.existsSync(normalizedPath + file) || path.extname(normalizedPath + file) !== '.js') {
                return;
            }
            const partnerConfig = require(normalizedPath + file);
            if (!_this.validatePartnerConfigs(partnerConfig)) return;
            partnerConfigs[partnerConfig.partner.name] = partnerConfig;
        });
        return partnerConfigs;
    };

    // Build Pool Configurations
    /* istanbul ignore next */
    this.buildPoolConfigs = function() {
        const poolConfigs = {};
        const normalizedPath = path.join(__dirname, '../../configs/pools/');
        fs.readdirSync(normalizedPath).forEach(file => {
            if (!fs.existsSync(normalizedPath + file) || path.extname(normalizedPath + file) !== '.js') {
                return;
            }
            const poolConfig = require(normalizedPath + file);
            if (!_this.validatePoolConfigs(poolConfig)) return;
            if (!_this.validatePoolNames(poolConfigs, poolConfig)) return;
            if (!_this.validatePoolPorts(poolConfigs, poolConfig)) return;
            poolConfigs[poolConfig.coin.name] = poolConfig;
        });
        return poolConfigs;
    };
};

module.exports = PoolLoader;
