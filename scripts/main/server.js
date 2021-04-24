/*
 *
 * PoolServer (Updated)
 *
 */

// Import Network Modules
var apicache = require('apicache')
var bodyParser = require('body-parser');
var compress = require('compression');
var cors = require('cors')
var express = require('express');

// Import Pool Functionality
var PoolAPI = require('./api.js');

// Pool Server Main Function
/* eslint no-unused-vars: ["error", { "args": "none" }] */
var PoolServer = function (logger) {

    // Load Useful Data from Process
    var partnerConfigs = JSON.parse(process.env.partners);
    var poolConfigs = JSON.parse(process.env.pools);
    var portalConfig = JSON.parse(process.env.portalConfig);

    // Establish Server Variables
    var portalApi = new PoolAPI(logger, partnerConfigs, poolConfigs, portalConfig);
    var portalStats = portalApi.poolStats;
    var logSystem = 'Server';

    // Gather Global Statistics
    portalStats.getGlobalStats(function() {});

    // Establish Global Statistics Interval
    var globalInterval = setInterval(function() {
        portalStats.getGlobalStats(function() {});
    }, portalConfig.stats.updateInterval * 1000);

    // Build Main Server
    var app = express();
    var cache = apicache.middleware
    app.use(bodyParser.json());
    app.use(cache('2 minutes'));
    app.use(compress());
    app.use(cors());
    app.get('/api/v1/:method', function(req, res, next) {
        portalApi.handleApiRequest(req, res, next);
    });
    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.send(500, 'Something broke!');
    });

    try {
        // Main Server is Running
        app.listen(portalConfig.server.port, portalConfig.server.host, function() {
            logger.debug(logSystem, 'Server', `Website started on ${
            portalConfig.server.host  }:${  portalConfig.server.port}`);
        });
    }
    catch(e) {
        // Error Starting Main Server
        clearInterval(globalInterval);
        logger.error(logSystem, 'Server', `Could not start website on ${
        portalConfig.server.host  }:${  portalConfig.server.port
        } - its either in use or you do not have permission`);
    }
}

// Export Pool Server
module.exports = PoolServer;
