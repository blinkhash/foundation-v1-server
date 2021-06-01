// /*
//  *
//  * API (Updated)
//  *
//  */

const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main API Function
const PoolApi = function (client, partnerConfigs, poolConfigs, portalConfig) {

  const _this = this;
  this.client = client;
  this.partnerConfigs = partnerConfigs;
  this.poolConfigs = poolConfigs;
  this.portalConfig = portalConfig;
  this.messages = {
    invalid: { code: 500, message: "The server was unable to handle your request. Try again later." },
    parameters: { code: 400, message: "Your request is missing parameters. Verify your input and try again." },
    success: { code: 200, message: "" }
  }

  //////////////////////////////////////////////////////////////////////////////

  // API Endpoint for /blocks/confirmed
  this.handleBlocksConfirmed = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:confirmed`]];
    _this.executeCommands(`${ coin }/blocks/confirmed/`, commands, response, (results) => {
      const blocks = results[0]
        .map((block) => JSON.parse(block))
        .sort((a, b) => (a.height - b.height));
      _this.buildPayload(`${ coin }/blocks/confirmed/`, _this.messages.success, blocks, response);
    });
  }

  // API Endpoint for /blocks/pending
  this.handleBlocksKicked = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:kicked`]];
    _this.executeCommands(`${ coin }/blocks/kicked/`, commands, response, (results) => {
      const blocks = results[0]
        .map((block) => JSON.parse(block))
        .sort((a, b) => (a.height - b.height));
      _this.buildPayload(`${ coin }/blocks/kicked/`, _this.messages.success, blocks, response);
    });
  }

  // API Endpoint for /blocks/pending
  this.handleBlocksPending = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:pending`]];
    _this.executeCommands(`${ coin }/blocks/pending/`, commands, response, (results) => {
      const blocks = results[0]
        .map((block) => JSON.parse(block))
        .sort((a, b) => (a.height - b.height));
      _this.buildPayload(`${ coin }/blocks/pending/`, _this.messages.success, blocks, response);
    });
  }

  //////////////////////////////////////////////////////////////////////////////

  // Build API Payload for each Endpoint
  this.buildPayload = function(endpoint, errors, data, response) {
    const payload = {
      endpoint: endpoint,
      errors: errors,
      data: data,
    }
    response.writeHead(errors.code, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
    return;
  }

  // Execute Redis Commands
  this.executeCommands = function(endpoint, commands, response, callback) {
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        _this.buildPayload(endpoint, _this.messages.invalid, null, response);
      } else {
        callback(results);
      }
    });
  };

  //////////////////////////////////////////////////////////////////////////////

  // Determine API Endpoint Called
  this.handleApiV1 = function(req, res, next) {

    const coin = req.params.coin;
    const method = req.params.method || "";
    const endpoint = req.params.endpoint || "";
    const combined = method + "/" + endpoint;

    // Select Endpoint from Parameters
    switch (true) {

    // Blocks Endpoints
    case (combined === 'blocks/confirmed'):
      _this.handleBlocksConfirmed(coin, res);
      break;
    case (combined === 'blocks/kicked'):
      _this.handleBlocksKicked(coin, res);
      break;
    case (combined === 'blocks/pending'):
      _this.handleBlocksPending(coin, res);
      break;
    case ((method === 'blocks') && (endpoint === "")):
      console.log("4", coin, method, endpoint);
      break;

    // Payments Endpoints
    case (combined === 'payments/generate'):
      console.log("5", coin, method, endpoint);
      break;
    case (combined === 'payments/immature'):
      console.log("6", coin, method, endpoint);
      break;
    case (combined === 'payments/paid'):
      console.log("7", coin, method, endpoint);
      break;
    case (combined === 'payments/records'):
      console.log("8", coin, method, endpoint);
      break;
    case ((method === 'payments') && (endpoint === "")):
      console.log("9", coin, method, endpoint);
      break;

    // Unknown Endpoints
    default:
      console.log("12", coin, method, endpoint);
      break;
    }

    // case 'rounds/current':
    //   console.log("8", coin, method, endpoint);
    //   break;
    // case 'rounds/' + endpoint:
    //   console.log("9", coin, method, endpoint);
    //   break;
    // case 'statistics/main':
    //   console.log("10", coin, method, endpoint);
    //   break;
    // case 'statistics/' + endpoint:
    //   console.log("11", coin, method, endpoint);
    //   break;
  }
}

module.exports = PoolApi;
