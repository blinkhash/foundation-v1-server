/**
 * Initialize User definition
 *
 * @param sequelize DataTypes Instance
 * @returns {PaymentsClass} Returns the Users model
 */

module.exports = function( sequelize, DataTypes ) {

  /** Create the schema */
  return sequelize.define(
    'payments', {
      time: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      paid: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      transaction: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      miner: {
        type: DataTypes.STRING,
        allowNull: false,
      }
    });
};
