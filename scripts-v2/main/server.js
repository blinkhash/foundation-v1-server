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
const http = require('http');

////////////////////////////////////////////////////////////////////////////////

// Main Server Function
const PoolServer = function (logger, client) {

    const _this = this;
    this.client = client;
    this.partnerConfigs = JSON.parse(process.env.partnerConfigs);
    this.poolConfigs = JSON.parse(process.env.poolConfigs);
    this.portalConfig = JSON.parse(process.env.portalConfig);

    const logSystem = 'Server';
    const logComponent = 'Website';
    const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

    // Build Server w/ Middleware
    this.buildServer = function() {

        // Build Main Server
        const app = express();
        const cache = apicache.middleware;
        app.use(bodyParser.json());
        app.use(cache('5 minutes'));
        app.use(compress());
        app.use(cors());

        // Handle API Requests
        /* istanbul ignore next */
        app.get('/api/v1/:method', (req, res, next) => {
            console.log(req, res, next);
        });

        // Handle Error Responses
        /* istanbul ignore next */
        /* eslint-disable-next-line no-unused-vars */
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.send(500, 'Something broke!');
        });

        // Set Existing Server Variable
        this.server = http.createServer(app);
    };

    // Start Worker Capabilities
    this.setupServer = function(callback) {
        _this.buildServer();
        _this.server.listen(_this.portalConfig.server.port, _this.portalConfig.server.host, () => {
            logger.debug(logSystem, logComponent,
                `Website started on ${ _this.portalConfig.server.host }:${ _this.portalConfig.server.port}`);
            callback();
        });
    };
};

module.exports = PoolServer;
