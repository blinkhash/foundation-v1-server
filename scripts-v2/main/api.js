// /*
//  *
//  * API (Updated)
//  *
//  */

const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main API Function
const PoolApi = function (logger, partnerConfigs, poolConfigs, portalConfig) {

  const _this = this;
  this.partnerConfigs = partnerConfigs;
  this.poolConfigs = poolConfigs;
  this.portalConfig = portalConfig;
  this.messages = {
      invalid: "The server was unable to handle your request. Verify your input and try again.",
      parameters: "Your request is missing parameters. Verify your input and try again."
  }

  // Build API Payload for each Endpoint
  this.buildPayload = function(endpoint, errors, data) {
    const payload = {
        endpoint: endpoint,
        errors: errors,
        data: data,
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    return;
  }

  // Execute Redis Commands
  this.executeCommands = function(endpoint, commands, callback) {
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        _this.buildPayload(endpoint, _this.messages.invalid, null);
      }
      callback(results);
    });
  };

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
      console.log("1", coin, method, endpoint);
      break;
    case (combined === 'blocks/kicked'):
      console.log("2", coin, method, endpoint);
      break;
    case (combined === 'blocks/pending'):
      console.log("3", coin, method, endpoint);
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
