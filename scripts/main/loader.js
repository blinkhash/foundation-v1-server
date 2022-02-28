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
    } else if (configPorts.includes(_this.portalConfig.server.port)) {
      logger.error('Builder', 'Setup', 'Overlapping port configuration with server port. Check your configuration files');
      return false;
    } else if (configPorts.includes(_this.portalConfig.redis.port)) {
      logger.error('Builder', 'Setup', 'Overlapping port configuration with database port. Check your configuration files');
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

  // Check for Valid Portal TLS Files
  /* istanbul ignore next */
  this.validatePortalTLS = function(portalConfig) {
    const keyExists = fs.existsSync(`./certificates/${ portalConfig.tls.key }`) && portalConfig.tls.key.length >= 1;
    const certExists = fs.existsSync(`./certificates/${ portalConfig.tls.cert }`) && portalConfig.tls.cert.length >= 1;
    const authorityExists = fs.existsSync(`./certificates/${ portalConfig.tls.ca }`) && portalConfig.tls.ca.length >= 1;
    if (!keyExists || !certExists || !authorityExists) {
      logger.error('Builder', 'Setup', 'Invalid key, certificate, or authority file specified for TLS. Check your configuration files.');
      return false;
    }
    return true;
  };

  // Check for Valid Pool TLS Files
  /* istanbul ignore next */
  this.validatePoolTLS = function(poolConfig, portalConfig) {
    const tlsCount = poolConfig.ports
      .filter(config => config.enabled)
      .filter(config => config ? config.tls : false).length;
    if (tlsCount >= 1) {
      const keyExists = fs.existsSync(`./certificates/${ portalConfig.tls.key }`) && portalConfig.tls.key.length >= 1;
      const certExists = fs.existsSync(`./certificates/${ portalConfig.tls.cert }`) && portalConfig.tls.cert.length >= 1;
      if (!keyExists || !certExists) {
        logger.error('Builder', 'Setup', 'Invalid key or certificate file specified for TLS. Check your configuration files.');
        return false;
      }
    }
    return true;
  };

  // Validate Pool Settings
  this.validatePoolVariables = function(poolConfig) {

    // Establish Statistics Variables
    const historicalInterval = poolConfig.statistics.historicalInterval || 1800;
    const historicalWindow = poolConfig.statistics.historicalWindow || 86400;

    // Check Historical Settings
    if (historicalWindow / historicalInterval >= 50) {
      logger.error('Builder', 'Setup', 'Historical retention must be limited to <= 50 records. Check your configuration files.');
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
    if (!_this.validatePoolVariables(poolConfig)) return false;
    if (!_this.validatePoolRecipients(poolConfig)) return false;
    return true;
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
      if (!_this.validatePoolTLS(poolConfig, portalConfig)) return;
      if (!_this.validatePoolNames(poolConfigs, poolConfig)) return;
      if (!_this.validatePoolPorts(poolConfigs, poolConfig)) return;
      poolConfigs[poolConfig.name] = poolConfig;
    });
    return poolConfigs;
  };
};

module.exports = PoolLoader;
