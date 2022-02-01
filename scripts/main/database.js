/*
 *
 * Database (Updated)
 *
 */

const fs = require('fs');
const path = require('path');
const redis = require('redis');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Database Function
const PoolDatabase = function(logger, portalConfig) {

  const _this = this;
  this.portalConfig = portalConfig;

        //  logger.error('Builder', 'Setup', 'Invalid Server certificate file specified. Check your config.js file.');


  // Connect to Redis Client
  this.buildRedisClient = function() {
    const connectionOptions = {};
    connectionOptions.socket = {};
    connectionOptions.socket.port = _this.portalConfig.redis.port;
    connectionOptions.socket.host = _this.portalConfig.redis.host;

    if (_this.portalConfig.redis.password !== '') {
      connectionOptions.password = _this.portalConfig.redis.password;
    }

    if (_this.portalConfig.redis.tls == true) {
      tlsTest = true;
      if (!utils.validateRootCertificate(_this.portalConfig)) {
        logger.error('Server', 'Redis', 'Invalid Root certificate file specified. Check your config.js file.');
        tlsTest = false;
      }
      if (!utils.validateServerKey(_this.portalConfig)) {
        logger.error('Server', 'Redis', 'Invalid Server key file specified. Check your config.js file.');
        tlsTest = false;
      }
      if (tlsTest) {
        connectionOptions.socket.tls = true;
        connectionOptions.socket.cert = fs.readFileSync(path.join('./certificates',_this.portalConfig.tls.serverCert));
        connectionOptions.socket.ca = fs.readFileSync(path.join('./certificates',_this.portalConfig.tls.rootCA));
      } else {
        logger.error('Server', 'Redis', 'TLS connection to Redis cannot be made.')
      } 
    }

    return redis.createClient(connectionOptions);
  };

  // Check Redis Client Version
  this.checkRedisClient = function(client) {
    client.info((error, response) => {
      if (error) {
        console.log('Redis version check failed');
        return;
      }
      let version;
      const settings = response.split('\r\n');
      settings.forEach(line => {
        if (line.indexOf('redis_version') !== -1) {
          version = parseFloat(line.split(':')[1]);
          return;
        }
      });
      if (!version || version <= 2.6) {
        console.log('Could not detect redis version or your redis client is out of date');
      }
      return;
    });
  };
};

module.exports = PoolDatabase;
