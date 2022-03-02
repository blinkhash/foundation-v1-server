/*
 *
 * Database (Updated)
 *
 */

const Sequelize = require('sequelize');
const ShareModel = require('../../models/shares.model');

////////////////////////////////////////////////////////////////////////////////

// Main Database Function
const SequelizeDatabase = function(portalConfig) {

  //temp vars
  portalConfig.postgresql = {};
  portalConfig.postgresql.port = 5432;
  portalConfig.postgresql.host = 'localhost';
  portalConfig.postgresql.user = 'pooldb';
  portalConfig.postgresql.password = 'lopata';
  portalConfig.postgresql.database = 'foundation';

  const _this = this;
  this.portalConfig = portalConfig;

  // Connect to Redis Client
  /* istanbul ignore next */
  this.buildSequelizeClient = function() {
    // Build Connection Options
    const database = _this.portalConfig.postgresql.database;
    const username = _this.portalConfig.postgresql.user;
    const password = _this.portalConfig.postgresql.password;
    
    const connectionOptions = {};
    connectionOptions.host = _this.portalConfig.postgresql.host;
    connectionOptions.port = _this.portalConfig.postgresql.port;
    connectionOptions.dialect = 'postgres';

    return new Sequelize(database, username, password, connectionOptions);
  };

  this.sequelizeShares = function(sequelize) {
    const Shares = ShareModel(sequelize, Sequelize);

    sequelize.sync({ force: false })
      .catch((err) => {
        console.log(err)
      })
      .then(() => {
        console.log('\nDatabase table is created!')
      });
    
      return Shares;
  };
};

module.exports = SequelizeDatabase;
