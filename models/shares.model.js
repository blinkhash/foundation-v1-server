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
      address: {
        type: DataTypes.STRING
      },
      time: {
        type: DataTypes.INTEGER,
      },
      share: {
        type: DataTypes.STRING,
      }
    });
};
