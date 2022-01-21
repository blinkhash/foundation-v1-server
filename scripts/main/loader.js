/*
 *
 * Loader (Updated)
 *
 */

const fs = require('fs');
const path = require('path');
const Algorithms = require('foundation-stratum').algorithms;

////////////////////////////////////////////////////////////////////////////////

// Main Builder Function
const PoolLoader = function(logger, portalConfig) {

  const _this = this;
  this.portalConfig = portalConfig;

  // Validate Pool Algorithms
  this.validatePoolAlgorithms = function(algorithm, name) {
    if (!(algorithm in Algorithms)) {
      logger.error('Builder', name, `Cannot run a pool for unsupported algorithm "${ algorithm }"`);
      return false;
    }
    return true;
  };

  // Validate Pool Configs
  this.validatePoolConfigs = function(poolConfig) {
    const name = poolConfig.name;
    if (!poolConfig.enabled) return false;
    if (!_this.validatePoolAlgorithms(poolConfig.primary.coin.algorithms.mining, name)) return false;
    if (!_this.validatePoolAlgorithms(poolConfig.primary.coin.algorithms.block, name)) return false;
    if (!_this.validatePoolAlgorithms(poolConfig.primary.coin.algorithms.coinbase, name)) return false;
    if (!_this.validatePoolRecipients(poolConfig)) return false;
    return true;
  };

  // Validate Pool Keys
  /* istanbul ignore next */
  this.validatePoolKeys = function(poolConfig) {
    const configSSL = poolConfig.ports
      .filter(config => config.enabled)
      .flatMap(config => config.ssl)
      .filter(config => config ? config.enabled : false);
    const keys = configSSL.flatMap(config => config.key);
    const validated = keys.filter((key) => fs.existsSync(`./certificates/${ key }`));
    if (keys.length !== validated.length) {
      logger.error('Builder', 'Setup', 'Invalid key file specified for SSL port. Check your configuration files');
      return false;
    }
    return true;
  }

  // Validate Pool Certificates
  /* istanbul ignore next */
  this.validatePoolCertificates = function(poolConfig) {
    const configSSL = poolConfig.ports
      .filter(config => config.enabled)
      .flatMap(config => config.ssl)
      .filter(config => config ? config.enabled : false);
    const certs = configSSL.flatMap(config => config.cert);
    const validated = certs.filter((cert) => fs.existsSync(`./certificates/${ cert }`));
    if (certs.length !== validated.length) {
      logger.error('Builder', 'Setup', 'Invalid certificate file specified for SSL port. Check your configuration files');
      return false;
    }
    return true;
  }

  // Check for Overlapping Pool Names
  this.validatePoolNames = function(poolConfigs, poolConfig) {
    let configNames = Object.keys(poolConfigs);
    configNames = configNames.concat(poolConfig.name);
    if (poolConfig.name) {
      if (poolConfig.name.split(' ').length > 1) {
        logger.error('Builder', 'Setup', 'Pool names are only allowed to be a single word. Check your configuration files');
        return false;
      }
      if (new Set(configNames).size !== configNames.length) {
        logger.error('Builder', 'Setup', 'Overlapping pool names. Check your configuration files');
        return false;
      }
      return true;
    } else {
      logger.error('Builder', 'Setup', 'No existing pool name passed in. Check your configuration files');
      return false;
    }
  };

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

  // Check for Valid Recipient Percentage
  this.validatePoolRecipients = function(poolConfig) {
    if (poolConfig.primary.recipients && poolConfig.primary.recipients.length >= 1) {
      const recipientTotal = poolConfig.primary.recipients.reduce((p_sum, a) => p_sum + a.percentage, 0);
      if (recipientTotal >= 1) {
        logger.error('Builder', 'Setup', `Recipient percentage for ${ poolConfig.name } is greater than 100%. Check your configuration files`);
        return false;
      } else if (recipientTotal >= 0.4) {
        logger.warning('Builder', 'Setup', `Recipient percentage for ${ poolConfig.name } is greater than 40%. Are you sure that you configured it properly?`);
        return true;
      } else {
        return true;
      }
    } else {
      return true;
    }
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
      if (!_this.validatePoolKeys(poolConfig)) return;
      if (!_this.validatePoolCertificates(poolConfig)) return;
      if (!_this.validatePoolNames(poolConfigs, poolConfig)) return;
      if (!_this.validatePoolPorts(poolConfigs, poolConfig)) return;
      poolConfigs[poolConfig.name] = poolConfig;
    });
    return poolConfigs;
  };
};

module.exports = PoolLoader;
