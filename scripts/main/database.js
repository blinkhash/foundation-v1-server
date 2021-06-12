/*
 *
 * Database (Updated)
 *
 */

const redis = require('redis');

////////////////////////////////////////////////////////////////////////////////

// Main Database Function
const PoolDatabase = function(logger, portalConfig) {

  const _this = this;
  this.portalConfig = portalConfig;

  // Connect to Redis Client
  this.buildRedisClient = function() {
    if (_this.portalConfig.redis.password !== '') {
      return redis.createClient({
        port: _this.portalConfig.redis.port,
        host: _this.portalConfig.redis.host,
        password: _this.portalConfig.redis.password
      });
    } else {
      return redis.createClient({
        port: _this.portalConfig.redis.port,
        host: _this.portalConfig.redis.host,
      });
    }
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
