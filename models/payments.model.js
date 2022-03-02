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
      address: {
        type: DataTypes.STRING
      },
      time: {
        type: DataTypes.INTEGER
      },
      payment: {
        type: DataTypes.STRING
      }
    });
};
