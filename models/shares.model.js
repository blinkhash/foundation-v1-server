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
      time: {
        type: DataTypes.BIGINT,
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
      ip_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ip_hint: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      identifier: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      effort: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      solo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      valid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      stale: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      invalid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      }
    });
};
