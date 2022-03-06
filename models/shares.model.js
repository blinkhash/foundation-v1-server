/**
 * Initialize User definition
 *
 * @param sequelize DataTypes Instance
 * @returns {SharesClass} Returns the Users model
 */

module.exports = function( sequelize, DataTypes ) {

  /** Create the schema */
  return sequelize.define(
    'shares', {
      pool: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      block_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      worker: {
        type: DataTypes.STRING,
        allowNull: false,
      },  
      work: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      share_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      miner_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      identifier: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ip_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ip_hint: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      time: {
        type: DataTypes.BIGINT,
        allowNull: false,
      }      
    });
};
