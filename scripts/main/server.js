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
const rateLimit = require('express-rate-limit');
const http = require('http');
const PoolApi = require('./api.js');

////////////////////////////////////////////////////////////////////////////////

// Main Server Function
const PoolServer = function (logger, client) {

  const _this = this;
  this.client = client;
  this.partnerConfigs = JSON.parse(process.env.partnerConfigs);
  this.poolConfigs = JSON.parse(process.env.poolConfigs);
  this.portalConfig = JSON.parse(process.env.portalConfig);

  // Build Server w/ Middleware
  this.buildServer = function() {

    // Build Main Server
    const app = express();
    const api = new PoolApi(_this.client, _this.partnerConfigs, _this.poolConfigs, _this.portalConfig);
    const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
    const cache = apicache.options({}).middleware;


    // Establish Middleware
    app.set('trust proxy', 1);
    app.use(bodyParser.json());
    app.use(limiter);
    app.use(cache('5 minutes'));
    app.use(compress());
    app.use(cors());

    // Handle API Requests
    /* istanbul ignore next */
    /* eslint-disable-next-line no-unused-vars */
    app.get('/api/v1/:pool/:endpoint?', (req, res, next) => {
      api.handleApiV1(req, res);
    });

    // Handle Health Check
    /* istanbul ignore next */
    /* eslint-disable-next-line no-unused-vars */
    app.get('/health/', (req, res, next) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'status': 'OK' }));
    });

    // Handle Error Responses
    /* istanbul ignore next */
    /* eslint-disable-next-line no-unused-vars */
    app.use((err, req, res, next) => {
      api.buildPayload('', '/error/', api.messages.invalid, null, res);
      logger.error('Server', 'Website', `API call threw an unknown error: (${ err })`);
      next();
    });

    // Set Existing Server Variable
    this.server = http.createServer(app);
  };

  // Start Worker Capabilities
  this.setupServer = function(callback) {
    _this.buildServer();
    _this.server.listen(_this.portalConfig.server.port, _this.portalConfig.server.host, () => {
      logger.debug('Server', 'Website',
        `Website started on ${ _this.portalConfig.server.host }:${ _this.portalConfig.server.port}`);
      callback();
    });
  };
};

module.exports = PoolServer;
