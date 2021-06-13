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
    unknown: { code: 405, message: "The method is not currently supported. Verify your input and try again." },
    success: { code: 200, message: "" }
  }

  // Check if Value is a Number
  this.checkNumber = function(value) {
    if (typeof value !== "string") {
      return false;
    } else {
      return !isNaN(value) && !isNaN(parseFloat(value));
    }
  }

  // Handle Block Processing
  this.processBlocks = function(blocks) {
    return blocks
      .map((block) => JSON.parse(block))
      .sort((a, b) => (a.height - b.height));
  }

  // Handle Payment Processing
  this.processPayments = function(payments) {
    const output = {};
    if (payments) {
      Object.keys(payments).forEach((address) => {
        output[address] = parseFloat(payments[address]);
      });
    }
    return output;
  }

  // Handle Record Processing
  this.processRecords = function(records) {
    return records
      .map((record) => JSON.parse(record))
      .sort((a, b) => (a.time - b.time));
  }

  // Combine Payment Records
  this.combinePayments = function(totals, payments) {
    if (payments) {
      Object.keys(payments).forEach((worker) => {
        if (worker in totals) {
          totals[worker] += parseFloat(payments[worker]);
        } else {
          totals[worker] = parseFloat(payments[worker]);
        }
      });
    }
    return totals;
  }

  // Handle Share Processing
  this.processShares = function(shares) {
    const solo = {};
    const shared = {};
    if (shares) {
      Object.keys(shares).forEach((entry) => {
        const details = JSON.parse(entry);
        if (details.solo) {
          if (details.worker in solo) {
            solo[details.worker] += parseFloat(shares[entry]);
          } else {
            solo[details.worker] = parseFloat(shares[entry]);
          }
        } else {
          if (details.worker in shared) {
            shared[details.worker] += parseFloat(shares[entry]);
          } else {
            shared[details.worker] = parseFloat(shares[entry]);
          }
        }
      });
    }
    return [solo, shared];
  }

  // Handle Times Processing
  this.processTimes = function(times) {
    const output = {};
    if (times) {
      Object.keys(times).forEach((address) => {
        output[address] = parseFloat(times[address]);
      });
    }
    return output;
  }

  // API Endpoint for /blocks/confirmed
  this.handleBlocksConfirmed = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:confirmed`]];
    _this.executeCommands(coin, '/blocks/confirmed/', commands, response, (results) => {
      const blocks = _this.processBlocks(results[0]);
      _this.buildPayload(coin, 'blocks/confirmed/', _this.messages.success, blocks, response);
    });
  }

  // API Endpoint for /blocks/kicked
  this.handleBlocksKicked = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:kicked`]];
    _this.executeCommands(coin, '/blocks/kicked/', commands, response, (results) => {
      const blocks = _this.processBlocks(results[0]);
      _this.buildPayload(coin, '/blocks/kicked/', _this.messages.success, blocks, response);
    });
  }

  // API Endpoint for /blocks/pending
  this.handleBlocksPending = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:pending`]];
    _this.executeCommands(coin, '/blocks/pending/', commands, response, (results) => {
      const blocks = _this.processBlocks(results[0]);
      _this.buildPayload(coin, '/blocks/pending/', _this.messages.success, blocks, response);
    });
  }

  // API Endpoint for /blocks
  this.handleBlocks = function(coin, response) {
    const commands = [
      ['smembers', `${ coin }:blocks:confirmed`],
      ['smembers', `${ coin }:blocks:kicked`],
      ['smembers', `${ coin }:blocks:pending`]];
    _this.executeCommands(coin, '/blocks/combined/', commands, response, (results) => {
      const blocks = {
        confirmed: _this.processBlocks(results[0]),
        kicked: _this.processBlocks(results[1]),
        pending: _this.processBlocks(results[2])};
      _this.buildPayload(coin, '/blocks/combined', _this.messages.success, blocks, response);
    });
  }

  // API Endpoint for /payments/generate
  this.handlePaymentsGenerate = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:generate`]];
    _this.executeCommands(coin, '/payments/generate/', commands, response, (results) => {
      const payments =  _this.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/generate/', _this.messages.success, payments, response);
    });
  }

  // API Endpoint for /payments/immature
  this.handlePaymentsImmature = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:immature`]];
    _this.executeCommands(coin, '/payments/immature/', commands, response, (results) => {
      const payments =  _this.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/immature/', _this.messages.success, payments, response);
    });
  }

  // API Endpoint for /payments/paid
  this.handlePaymentsPaid = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:paid`]];
    _this.executeCommands(coin, '/payments/paid/', commands, response, (results) => {
      const payments =  _this.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/paid/', _this.messages.success, payments, response);
    });
  }

  // API Endpoint for /payments/records
  this.handlePaymentsRecords = function(coin, response) {
    const commands = [['zrange', `${ coin }:payments:records`, 0, -1]];
    _this.executeCommands(coin, '/payments/records/', commands, response, (results) => {
      const payments =  _this.processRecords(results[0]);
      _this.buildPayload(coin, '/payments/records/', _this.messages.success, payments, response);
    });
  }

  // API Endpoint for /payments/combined
  this.handlePayments = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:generate`],
      ['hgetall', `${ coin }:payments:immature`],
      ['hgetall', `${ coin }:payments:paid`]];
    _this.executeCommands(coin, '/payments/combined', commands, response, (results) => {
      const payments = {
        generate: _this.processPayments(results[0]),
        immature: _this.processPayments(results[1]),
        paid: _this.processPayments(results[2])};
      _this.buildPayload(coin, '/payments/combined', _this.messages.success, payments, response);
    });
  }

  // API Endpoint for /rounds/current
  this.handleRoundsCurrent = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:rounds:current:shares`],
      ['hgetall', `${ coin }:rounds:current:times`]];
    _this.executeCommands(coin, '/rounds/current/', commands, response, (results) => {
      const shareData = _this.processShares(results[0]);
      const current = {
        solo: shareData[0],
        shared: shareData[1],
        times: _this.processTimes(results[1])};
      _this.buildPayload(coin, '/rounds/current', _this.messages.success, current, response);
    });
  }

  // API Endpoint for /rounds/[height]
  this.handleRoundsHeight = function(coin, height, response) {
    const commands = [
      ['hgetall', `${ coin }:rounds:round-${ height }:shares`],
      ['hgetall', `${ coin }:rounds:round-${ height }:times`]];
    _this.executeCommands(coin, '/rounds/' + height, commands, response, (results) => {
      const shareData = _this.processShares(results[0]);
      const current = {
        solo: shareData[0],
        shared: shareData[1],
        times: _this.processTimes(results[1])};
      _this.buildPayload(coin, '/rounds/' + height, _this.messages.success, current, response);
    });
  }

  // API Endpoint for /rounds/combined
  this.handleRounds = function(coin, response) {
    const keys = [['keys', `${ coin }:rounds:round-*:shares`]];
    _this.executeCommands(coin, '/rounds/combined/', keys, response, (results) => {
      const combined = {}
      const rounds = results[0].map((key) => key.split(":")[2].split("-")[1]);
      const handler = new Promise((resolve, reject) => {
        rounds.forEach((height, idx) => {
          const commands = [
            ['hgetall', `${ coin }:rounds:round-${ height }:shares`],
            ['hgetall', `${ coin }:rounds:round-${ height }:times`]];
          _this.executeCommands(coin, '/rounds/combined/', commands, response, (results) => {
            const shareData = _this.processShares(results[0]);
            combined[height] = {
              solo: shareData[0],
              shared: shareData[1],
              times: _this.processTimes(results[1])};
            if (idx === rounds.length - 1) {
              resolve();
            }
          });
        });
      });
      handler.then(() => {
        _this.buildPayload(coin, '/rounds/combined/', _this.messages.success, combined, response);
      });
    });
  }

  // API Endpoint for /statistics
  this.handleStatistics = function(coin, response) {

  }

  // API Endpoint for /workers
  this.handleWorkers = function(coin, response) {
    const commands = [['hgetall', `${ coin }:rounds:current:shares`]];
    _this.executeCommands(coin, '/workers/', commands, response, (results) => {
      const shareData = _this.processShares(results[0]);
      const workers = {
        solo: Object.keys(shareData[0]),
        shared: Object.keys(shareData[1])};
      _this.buildPayload(coin, '/workers/', _this.messages.success, workers, response);
    });
  }

  // API Endpoint for /unknown
  this.handleUnknown = function(coin, response) {
    _this.buildPayload(coin, '/unknown/', _this.messages.unknown, null, response);
  }

  // Build API Payload for each Endpoint
  this.buildPayload = function(coin, endpoint, message, data, response) {
    const payload = {
      coin: coin,
      endpoint: endpoint,
      response: message,
      data: data,
    }
    response.writeHead(message.code, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
    return;
  }

  // Execute Redis Commands
  this.executeCommands = function(coin, endpoint, commands, response, callback) {
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        _this.buildPayload(coin, endpoint, _this.messages.invalid, null, response);
      } else {
        callback(results);
      }
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
      _this.handleBlocksConfirmed(coin, res);
      break;
    case (combined === 'blocks/kicked'):
      _this.handleBlocksKicked(coin, res);
      break;
    case (combined === 'blocks/pending'):
      _this.handleBlocksPending(coin, res);
      break;
    case ((method === 'blocks') && (endpoint === "")):
      _this.handleBlocks(coin, res);
      break;

    // Payments Endpoints
    case (combined === 'payments/generate'):
      _this.handlePaymentsGenerate(coin, res);
      break;
    case (combined === 'payments/immature'):
      _this.handlePaymentsImmature(coin, res);
      break;
    case (combined === 'payments/paid'):
      _this.handlePaymentsPaid(coin, res);
      break;
    case (combined === 'payments/records'):
      _this.handlePaymentsRecords(coin, res);
      break;
    case ((method === 'payments') && (endpoint === "")):
      _this.handlePayments(coin, res);
      break;

    // Rounds Endpoints
    case (combined === 'rounds/current'):
      _this.handleRoundsCurrent(coin, res);
      break;
    case ((method === 'rounds') && _this.checkNumber(endpoint)):
      _this.handleRoundsHeight(coin, endpoint, res);
      break;
    case ((method === 'rounds') && (endpoint === "")):
      _this.handleRounds(coin, res);
      break;

    // Statistics Endpoints
    case ((method === 'statistics') && (endpoint === "")):
      _this.handleStatistics(coin, res);
      break;

    // Workers Endpoints
    case ((method === 'workers') && (endpoint === "")):
      _this.handleWorkers(coin, res);
      break;

    // Unknown Endpoints
    default:
      _this.handleUnknown(coin, res);
      break;
    }
  }
}

module.exports = PoolApi;
