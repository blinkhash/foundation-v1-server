/**
 * Initialize User definition
 *
 * @param sequelize DataTypes Instance
 * @returns {UsersClass} Returns the Users model
 */

module.exports = function( sequelize, DataTypes ) {

  /** Create the schema */
  return sequelize.define(
    'users', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      joined: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      minimumPayment: {
        type: DataTypes.INTEGER,
        allowNull: true,
      }
    });
};
