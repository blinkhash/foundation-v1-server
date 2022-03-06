/*
 *
 * Database (Updated)
 *
 */

const fs = require('fs');
const path = require('path');
const redis = require('redis');
const Sequelize = require('sequelize');
const SharesModel = require('../../models/shares.model');
const PaymentsModel = require('../../models/payments.model');
const UsersModel = require('../../models/users.model');

////////////////////////////////////////////////////////////////////////////////

// Main Database Function
const PoolDatabase = function(portalConfig) {

  const _this = this;
  this.portalConfig = portalConfig;

  // Connect to Redis Client
  /* istanbul ignore next */
  this.buildRedisClient = function() {

    // Build Connection Options
    const connectionOptions = {};
    connectionOptions.port = _this.portalConfig.redis.port;
    connectionOptions.host = _this.portalConfig.redis.host;

    // Check if Authentication is Set
    if (_this.portalConfig.redis.password !== '') {
      connectionOptions.password = _this.portalConfig.redis.password;
    }

    // Check if TLS Configuration is Set
    if (_this.portalConfig.redis.tls) {
      connectionOptions.tls = {};
      connectionOptions.tls.key = fs.readFileSync(path.join('./certificates', _this.portalConfig.tls.key));
      connectionOptions.tls.cert = fs.readFileSync(path.join('./certificates', _this.portalConfig.tls.cert));
      connectionOptions.tls.ca = fs.readFileSync(path.join('./certificates', _this.portalConfig.tls.ca));
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

  // Create Sequelize Connection
  /* istanbul ignore next */
  this.connectSequelize = function(table) {
    //temp vars
    portalConfig.postgresql = {};
    portalConfig.postgresql.port = 5432;
    portalConfig.postgresql.host = 'localhost';
    portalConfig.postgresql.user = 'pooldb';
    portalConfig.postgresql.password = 'lopata';
    portalConfig.postgresql.database = 'foundation';

    // Build Connection Options
    const database = _this.portalConfig.postgresql.database;
    const username = _this.portalConfig.postgresql.user;
    const password = _this.portalConfig.postgresql.password;
    
    const connectionOptions = {};
    connectionOptions.host = _this.portalConfig.postgresql.host;
    connectionOptions.port = _this.portalConfig.postgresql.port;
    connectionOptions.dialect = 'postgres';

    const sequelize = new Sequelize(database, username, password, connectionOptions);

    const Shares = SharesModel(sequelize, Sequelize);
    const Payments = PaymentsModel(sequelize, Sequelize);
    const Users = UsersModel(sequelize, Sequelize);

    sequelize.sync({ force: false })

    switch (table) {
      case 'shares_table':
        return Shares;
      case 'payments_table':
        return Payments;
      case 'users_table':
        return Users;
    }
  };
};

module.exports = PoolDatabase;
