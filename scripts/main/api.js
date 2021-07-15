/*
 *
 * API (Updated)
 *
 */

const utils = require('./utils');
const Algorithms = require('blinkhash-stratum').algorithms;

////////////////////////////////////////////////////////////////////////////////

// Main API Function
const PoolApi = function (client, partnerConfigs, poolConfigs, portalConfig) {

  const _this = this;
  this.client = client;
  this.partnerConfigs = partnerConfigs;
  this.poolConfigs = poolConfigs;
  this.portalConfig = portalConfig;
  this.messages = {
    invalid: { code: 500, message: 'The server was unable to handle your request. Verify your input or try again later.' },
    method: { code: 405, message: 'The requested method is not currently supported. Verify your input and try again.' },
    coin: { code: 405, message: 'The requested coin was not found. Verify your input and try again.' },
    success: { code: 200, message: '' }
  };

  // API Endpoint for /blocks/confirmed
  this.handleBlocksConfirmed = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:confirmed`]];
    _this.executeCommands(coin, '/blocks/confirmed/', commands, response, (results) => {
      const blocks = utils.processBlocks(results[0]);
      _this.buildPayload(coin, '/blocks/confirmed/', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks/kicked
  this.handleBlocksKicked = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:kicked`]];
    _this.executeCommands(coin, '/blocks/kicked/', commands, response, (results) => {
      const blocks = utils.processBlocks(results[0]);
      _this.buildPayload(coin, '/blocks/kicked/', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks/pending
  this.handleBlocksPending = function(coin, response) {
    const commands = [['smembers', `${ coin }:blocks:pending`]];
    _this.executeCommands(coin, '/blocks/pending/', commands, response, (results) => {
      const blocks = utils.processBlocks(results[0]);
      _this.buildPayload(coin, '/blocks/pending/', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks
  this.handleBlocks = function(coin, response) {
    const commands = [
      ['smembers', `${ coin }:blocks:confirmed`],
      ['smembers', `${ coin }:blocks:kicked`],
      ['smembers', `${ coin }:blocks:pending`]];
    _this.executeCommands(coin, '/blocks/', commands, response, (results) => {
      const blocks = {
        confirmed: utils.processBlocks(results[0]),
        kicked: utils.processBlocks(results[1]),
        pending: utils.processBlocks(results[2])};
      _this.buildPayload(coin, '/blocks/', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /coins
  this.handleCoins = function(response) {
    const coins = Object.keys(_this.poolConfigs);
    _this.buildPayload('Pool', '/coins/', _this.messages.success, coins, response);
  };

  // API Endpoint for /miners/[miner]
  this.handleMinersSpecific = function(coin, miner, response) {
    const algorithm = _this.poolConfigs[coin].coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ coin }:payments:balances`],
      ['hgetall', `${ coin }:payments:generate`],
      ['hgetall', `${ coin }:payments:immature`],
      ['hgetall', `${ coin }:payments:paid`],
      ['hgetall', `${ coin }:rounds:current:shares`],
      ['hgetall', `${ coin }:rounds:current:times`],
      ['zrangebyscore', `${ coin }:rounds:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/miners/' + miner + '/', commands, response, (results) => {
      const shareData = utils.processShares(results[4], miner);
      const difficulty = utils.processDifficulty(results[6], miner);
      const statistics = {
        current: {
          solo: shareData[0][miner] || 0,
          shared: shareData[1][miner] || 0,
          times: utils.processTimes(results[5], miner)[miner] || 0,
        },
        status: {
          hashrate: (multiplier * difficulty) / hashrateWindow,
          workers: utils.countWorkers(results[6], miner),
        },
        payments: {
          balances: utils.processPayments(results[0], miner)[miner] || 0,
          generate: utils.processPayments(results[1], miner)[miner] || 0,
          immature: utils.processPayments(results[2], miner)[miner] || 0,
          paid: utils.processPayments(results[3], miner)[miner] || 0,
        },
        workers: utils.processWorkers(results[6], miner),
      };
      _this.buildPayload(coin, '/miners/' + miner + '/', _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /miners
  this.handleMiners = function(coin, response) {
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [['zrangebyscore', `${ coin }:rounds:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/miners/', commands, response, (results) => {
      const miners = utils.processMiners(results[0]);
      _this.buildPayload(coin, '/miners/', _this.messages.success, miners, response);
    });
  };

  // API Endpoint for /partners
  this.handlePartners = function(response) {
    const partners = Object.values(_this.partnerConfigs);
    _this.buildPayload('Pool', '/partners/', _this.messages.success, partners, response);
  };

  // API Endpoint for /payments/balances
  this.handlePaymentsBalances = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:balances`]];
    _this.executeCommands(coin, '/payments/balances/', commands, response, (results) => {
      const payments = utils.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/balances/', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/generate
  this.handlePaymentsGenerate = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:generate`]];
    _this.executeCommands(coin, '/payments/generate/', commands, response, (results) => {
      const payments = utils.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/generate/', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/immature
  this.handlePaymentsImmature = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:immature`]];
    _this.executeCommands(coin, '/payments/immature/', commands, response, (results) => {
      const payments = utils.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/immature/', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/paid
  this.handlePaymentsPaid = function(coin, response) {
    const commands = [['hgetall', `${ coin }:payments:paid`]];
    _this.executeCommands(coin, '/payments/paid/', commands, response, (results) => {
      const payments = utils.processPayments(results[0]);
      _this.buildPayload(coin, '/payments/paid/', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/records
  this.handlePaymentsRecords = function(coin, response) {
    const commands = [['zrange', `${ coin }:payments:records`, 0, -1]];
    _this.executeCommands(coin, '/payments/records/', commands, response, (results) => {
      const payments = utils.processRecords(results[0]);
      _this.buildPayload(coin, '/payments/records/', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments
  this.handlePayments = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:balances`],
      ['hgetall', `${ coin }:payments:generate`],
      ['hgetall', `${ coin }:payments:immature`],
      ['hgetall', `${ coin }:payments:paid`]];
    _this.executeCommands(coin, '/payments/', commands, response, (results) => {
      const payments = {
        balances: utils.processPayments(results[0]),
        generate: utils.processPayments(results[1]),
        immature: utils.processPayments(results[2]),
        paid: utils.processPayments(results[3])};
      _this.buildPayload(coin, '/payments/', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /rounds/current
  this.handleRoundsCurrent = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:rounds:current:shares`],
      ['hgetall', `${ coin }:rounds:current:times`]];
    _this.executeCommands(coin, '/rounds/current/', commands, response, (results) => {
      const shareData = utils.processShares(results[0]);
      const current = {
        solo: shareData[0],
        shared: shareData[1],
        times: utils.processTimes(results[1])};
      _this.buildPayload(coin, '/rounds/current', _this.messages.success, current, response);
    });
  };

  // API Endpoint for /rounds/[height]
  this.handleRoundsHeight = function(coin, height, response) {
    const commands = [
      ['hgetall', `${ coin }:rounds:round-${ height }:shares`],
      ['hgetall', `${ coin }:rounds:round-${ height }:times`]];
    _this.executeCommands(coin, '/rounds/' + height, commands, response, (results) => {
      const shareData = utils.processShares(results[0]);
      const current = {
        solo: shareData[0],
        shared: shareData[1],
        times: utils.processTimes(results[1])};
      _this.buildPayload(coin, '/rounds/' + height, _this.messages.success, current, response);
    });
  };

  // API Endpoint for /rounds/
  this.handleRounds = function(coin, response) {
    const keys = [['keys', `${ coin }:rounds:round-*:shares`]];
    _this.executeCommands(coin, '/rounds/', keys, response, (results) => {
      const combined = {};
      const rounds = results[0].map((key) => key.split(':')[2].split('-')[1]);
      if (rounds.length >= 1) {
        const handler = new Promise((resolve,) => {
          rounds.forEach((height, idx) => {
            const commands = [
              ['hgetall', `${ coin }:rounds:round-${ height }:shares`],
              ['hgetall', `${ coin }:rounds:round-${ height }:times`]];
            _this.executeCommands(coin, '/rounds/', commands, response, (results) => {
              const shareData = utils.processShares(results[0]);
              combined[height] = {
                solo: shareData[0],
                shared: shareData[1],
                times: utils.processTimes(results[1])};
              if (idx === rounds.length - 1) {
                resolve();
              }
            });
          });
        });
        handler.then(() => {
          _this.buildPayload(coin, '/rounds/', _this.messages.success, combined, response);
        });
      } else {
        _this.buildPayload(coin, '/rounds/', _this.messages.success, combined, response);
      }
    });
  };

  // API Endpoint for /statistics
  /* istanbul ignore next */
  this.handleStatistics = function(coin, response) {
    const algorithm = _this.poolConfigs[coin].coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ coin }:blocks:counts`],
      ['hgetall', `${ coin }:payments:counts`],
      ['hgetall', `${ coin }:rounds:current:counts`],
      ['zrangebyscore', `${ coin }:rounds:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/statistics/', commands, response, (results) => {
      const statistics = {
        config: {
          name: _this.poolConfigs[coin].coin.name,
          symbol: _this.poolConfigs[coin].coin.symbol,
          algorithm: _this.poolConfigs[coin].coin.algorithms.mining,
          featured: _this.poolConfigs[coin].featured,
          logo: _this.poolConfigs[coin].logo
        },
        blocks: {
          valid: parseFloat(results[0] ? results[0].valid || 0 : 0),
          invalid: parseFloat(results[0] ? results[0].invalid || 0 : 0),
        },
        shares: {
          valid: parseFloat(results[2] ? results[2].valid || 0 : 0),
          invalid: parseFloat(results[2] ? results[2].invalid || 0 : 0),
        },
        status: {
          hashrate: (multiplier * utils.processDifficulty(results[3])) / hashrateWindow,
          miners: utils.countMiners(results[3]),
          workers: utils.countWorkers(results[3]),
        },
        payments: {
          last: parseFloat(results[1] ? results[1].last || 0 : 0),
          next: parseFloat(results[1] ? results[1].next || 0 : 0),
          total: parseFloat(results[1] ? results[1].total || 0 : 0),
        }
      };
      _this.buildPayload(coin, '/statistics/', _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /workers/[worker]
  this.handleWorkersSpecific = function(coin, worker, response) {
    const algorithm = _this.poolConfigs[coin].coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ coin }:rounds:current:shares`],
      ['hgetall', `${ coin }:rounds:current:times`],
      ['zrangebyscore', `${ coin }:rounds:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/workers/' + worker + '/', commands, response, (results) => {
      const shareData = utils.processShares(results[0], worker);
      const difficulty = utils.processDifficulty(results[2], worker);
      const statistics = {
        current: {
          solo: shareData[0][worker] || 0,
          shared: shareData[1][worker] || 0,
          times: utils.processTimes(results[1], worker)[worker] || 0,
        },
        status: {
          hashrate: (multiplier * difficulty) / hashrateWindow,
        },
      };
      _this.buildPayload(coin, '/workers/' + worker + '/', _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /workers
  this.handleWorkers = function(coin, response) {
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [['zrangebyscore', `${ coin }:rounds:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/workers/', commands, response, (results) => {
      const workers = utils.processWorkers(results[0]);
      _this.buildPayload(coin, '/workers/', _this.messages.success, workers, response);
    });
  };

  // Build API Payload for each Endpoint
  this.buildPayload = function(coin, endpoint, message, data, response) {
    const payload = {
      coin: coin,
      endpoint: endpoint,
      time: Date.now(),
      response: message,
      data: data,
    };
    response.writeHead(message.code, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
    return;
  };

  // Execute Redis Commands
  /* istanbul ignore next */
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
  this.handleApiV1 = function(req, res) {

    const coin = utils.validateInput(req.params.coin || '');
    const endpoint = utils.validateInput(req.params.endpoint || '');
    const method = utils.validateInput(req.params.method || '');
    const combined = endpoint + '/' + method;

    // Unknown Coins
    const miscellaneous = ['coins', 'partners'];
    if (!(coin in _this.poolConfigs) && !(miscellaneous.includes(coin))) {
      _this.buildPayload(coin, '/unknown/', _this.messages.coin, null, res);
      return;
    }

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
    case (endpoint === 'blocks' && method === ''):
      _this.handleBlocks(coin, res);
      break;

    // Miners Endpoints
    case (endpoint === 'miners' && method.length >= 1):
      _this.handleMinersSpecific(coin, method, res);
      break;
    case (endpoint === 'miners' && method === ''):
      _this.handleMiners(coin, res);
      break;

    // Payments Endpoints
    case (combined === 'payments/balances'):
      _this.handlePaymentsBalances(coin, res);
      break;
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
    case (endpoint === 'payments' && method === ''):
      _this.handlePayments(coin, res);
      break;

    // Rounds Endpoints
    case (combined === 'rounds/current'):
      _this.handleRoundsCurrent(coin, res);
      break;
    case (endpoint === 'rounds' && utils.checkNumber(method)):
      _this.handleRoundsHeight(coin, method, res);
      break;
    case (endpoint === 'rounds' && method === ''):
      _this.handleRounds(coin, res);
      break;

    // Statistics Endpoints
    case (endpoint === 'statistics' && method === ''):
      _this.handleStatistics(coin, res);
      break;

    // Workers Endpoints
    case (endpoint === 'workers' && method.length >= 1):
      _this.handleWorkersSpecific(coin, method, res);
      break;
    case (endpoint === 'workers' && method === ''):
      _this.handleWorkers(coin, res);
      break;

    // Miscellaneous Endpoints
    case (endpoint === '' && method === '' && coin === 'partners'):
      _this.handlePartners(res);
      break;
    case (endpoint === '' && method === '' && coin === 'coins'):
      _this.handleCoins(res);
      break;
    case (endpoint === '' && method === '' && !(miscellaneous.includes(coin))):
      _this.handleStatistics(coin, res);
      break;

    // Unknown Endpoints
    default:
      _this.buildPayload(coin, '/unknown/', _this.messages.method, null, res);
      break;
    }
  };
};

module.exports = PoolApi;
