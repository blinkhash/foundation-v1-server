/*
 *
 * Database (Updated)
 *
 */

const fs = require('fs');
const path = require('path');
const redis = require('redis');

////////////////////////////////////////////////////////////////////////////////

// Main Database Function
const PoolDatabase = function(logger, portalConfig) {

  const _this = this;
  this.portalConfig = portalConfig;

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
      connectionOptions.socket.tls = true;
      connectionOptions.socket.cert = fs.readFileSync(path.join('./certificates',_this.portalConfig.tls.serverCert));
      connectionOptions.socket.ca = fs.readFileSync(path.join('./certificates',_this.portalConfig.tls.rootCA));
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
