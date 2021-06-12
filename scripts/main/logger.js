/*
 *
 * Logger (Updated)
 *
 */

/* eslint-disable no-unused-vars */
const colors = require('colors');
const dateFormat = require('dateformat');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Logger Function
const PoolLogger = function (portalConfig) {

  const _this = this;
  this.logLevel = utils.loggerSeverity[portalConfig.logger.logLevel];
  this.logColors = portalConfig.logger.logColors;

  // Start Logging Capabilities
  this.logText = function(severity, system, component, text, subcat) {
    if (utils.loggerSeverity[severity] < _this.logLevel) {
      return;
    }
    if (subcat) {
      const realText = subcat;
      const realSubCat = text;
      text = realText;
      subcat = realSubCat;
    }
    let entryDesc = `${ dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss') } [${ system }]\t`;

    // Handle Logging Colors
    if (_this.logColors) {
      entryDesc = utils.loggerColors(severity, entryDesc);
      let logString = entryDesc + (`[${ component }] `).italic;
      if (subcat) {
        logString += (`(${ subcat }) `).bold.grey;
      }
      logString += text.grey;
      console.log(logString);
    } else {
      let logString = `${ entryDesc }[${ component }] `;
      if (subcat) {
        logString += `(${ subcat }) `;
      }
      logString += text;
      console.log(logString);
    }
  };

  // Manage Logger Events
  Object.keys(utils.loggerSeverity).forEach((logType) => {
    _this[logType] = function() {
      const args = Array.prototype.slice.call(arguments, 0);
      args.unshift(logType);
      _this.logText.apply(this, args);
    };
  });
};

module.exports = PoolLogger;
