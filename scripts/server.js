/*
 *
 * PoolServer (Updated)
 *
 */

// Import Network Modules
var express = require('express');
var compress = require('compression');

// Import Pool Functionality
var PoolAPI = require('./api.js');

// Pool Server Main Function
var PoolServer = function (logger) {

  // Load Useful Data from Process
  var portalConfig = JSON.parse(process.env.portalConfig);
  var poolConfigs = JSON.parse(process.env.pools);

  // Establish Server Variables
  var portalApi = new PoolAPI(logger, portalConfig, poolConfigs);
  var portalStats = portalApi.stats;
}

// Export Pool Server
module.exports = PoolServer;
