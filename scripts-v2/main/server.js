/*
 *
 * Server (Updated)
 *
 */

const apicache = require('apicache');
const bodyParser = require('body-parser');
const compress = require('compression');
const cors = require('cors');
const express = require('express');

////////////////////////////////////////////////////////////////////////////////

// Main Server Function
const PoolServer = function (logger) {

    const _this = this;
    this.partnerConfigs = JSON.parse(process.env.partners);
    this.poolConfigs = JSON.parse(process.env.pools);
    this.portalConfig = JSON.parse(process.env.portalConfig);
    this.forkId = process.env.forkId;

    const logSystem = 'Server';
    const logComponent = 'Website';
    const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

    // const portalApi = new PoolAPI(logger, partnerConfigs, poolConfigs, portalConfig);

    // Build Main Server
    const app = express();
    const cache = apicache.middleware;
    app.use(bodyParser.json());
    app.use(cache('5 minutes'));
    app.use(compress());
    app.use(cors());

    // Handle API Requests
    app.get('/api/v1/:method', function(req, res, next) {
        console.log(req, res, next);
    });

    // Handle Error Responses
    /* eslint-disable-next-line no-unused-vars */
    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.send(500, 'Something broke!');
    });

    // Start Server w/ Website on Port
    app.listen(_this.portalConfig.server.port, _this.portalConfig.server.host, function() {
        logger.debug(logSystem, logComponent, logSubCat,
            `Website started on ${ _this.portalConfig.server.host }:${ _this.portalConfig.server.port}`);
    });
};

module.exports = PoolServer;
