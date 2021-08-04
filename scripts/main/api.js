/*
 *
 * API (Updated)
 *
 */

const utils = require('./utils');
const Algorithms = require('foundation-stratum').algorithms;

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

  // Main Endpoints
  //////////////////////////////////////////////////////////////////////////////

  // API Endpoint for /blocks/confirmed
  this.handleBlocksConfirmed = function(coin, response) {
    const commands = [
      ['smembers', `${ coin }:blocks:primary:confirmed`],
      ['smembers', `${ coin }:blocks:auxiliary:confirmed`]];
    _this.executeCommands(coin, '/blocks/confirmed', commands, response, (results) => {
      const blocks = {
        primary: utils.processBlocks(results[0]),
        auxiliary: utils.processBlocks(results[1])};
      _this.buildPayload(coin, '/blocks/confirmed', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks/kicked
  this.handleBlocksKicked = function(coin, response) {
    const commands = [
      ['smembers', `${ coin }:blocks:primary:kicked`],
      ['smembers', `${ coin }:blocks:auxiliary:kicked`]];
    _this.executeCommands(coin, '/blocks/kicked', commands, response, (results) => {
      const blocks = {
        primary: utils.processBlocks(results[0]),
        auxiliary: utils.processBlocks(results[1])};
      _this.buildPayload(coin, '/blocks/kicked', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks/pending
  this.handleBlocksPending = function(coin, response) {
    const commands = [
      ['smembers', `${ coin }:blocks:primary:pending`],
      ['smembers', `${ coin }:blocks:auxiliary:pending`]];
    _this.executeCommands(coin, '/blocks/pending', commands, response, (results) => {
      const blocks = {
        primary: utils.processBlocks(results[0]),
        auxiliary: utils.processBlocks(results[1])};
      _this.buildPayload(coin, '/blocks/pending', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks
  this.handleBlocks = function(coin, response) {
    const commands = [
      ['smembers', `${ coin }:blocks:primary:confirmed`],
      ['smembers', `${ coin }:blocks:primary:kicked`],
      ['smembers', `${ coin }:blocks:primary:pending`],
      ['smembers', `${ coin }:blocks:auxiliary:confirmed`],
      ['smembers', `${ coin }:blocks:auxiliary:kicked`],
      ['smembers', `${ coin }:blocks:auxiliary:pending`]];
    _this.executeCommands(coin, '/blocks', commands, response, (results) => {
      const blocks = {
        primary: {
          confirmed: utils.processBlocks(results[0]),
          kicked: utils.processBlocks(results[1]),
          pending: utils.processBlocks(results[2]),
        },
        auxiliary: {
          confirmed: utils.processBlocks(results[3]),
          kicked: utils.processBlocks(results[4]),
          pending: utils.processBlocks(results[5])
        }
      };
      _this.buildPayload(coin, '/blocks', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /miners/[miner]
  this.handleMinersSpecific = function(coin, miner, response) {
    const algorithm = _this.poolConfigs[coin].primary.coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ coin }:payments:primary:balances`],
      ['hgetall', `${ coin }:payments:primary:generate`],
      ['hgetall', `${ coin }:payments:primary:immature`],
      ['hgetall', `${ coin }:payments:primary:paid`],
      ['hgetall', `${ coin }:rounds:primary:current:shares`],
      ['hgetall', `${ coin }:rounds:primary:current:times`],
      ['zrangebyscore', `${ coin }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['hgetall', `${ coin }:payments:auxiliary:balances`],
      ['hgetall', `${ coin }:payments:auxiliary:generate`],
      ['hgetall', `${ coin }:payments:auxiliary:immature`],
      ['hgetall', `${ coin }:payments:auxiliary:paid`],
      ['hgetall', `${ coin }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ coin }:rounds:auxiliary:current:times`],
      ['zrangebyscore', `${ coin }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, `/miners/${ miner }`, commands, response, (results) => {

      // Structure Round Data
      const primaryShareData = utils.processShares(results[4], miner);
      const auxiliaryShareData = utils.processShares(results[11], miner);
      const primaryTimesData = utils.processTimes(results[5], miner);
      const auxiliaryTimesData = utils.processTimes(results[12], miner);

      // Structure Payments Data
      const primaryBalanceData = utils.processPayments(results[0], miner)[miner];
      const auxiliaryBalanceData = utils.processPayments(results[7], miner)[miner];
      const primaryGenerateData = utils.processPayments(results[1], miner)[miner];
      const auxiliaryGenerateData = utils.processPayments(results[8], miner)[miner];
      const primaryImmatureData = utils.processPayments(results[2], miner)[miner];
      const auxiliaryImmatureData = utils.processPayments(results[9], miner)[miner];
      const primaryPaidData = utils.processPayments(results[3], miner)[miner];
      const auxiliaryPaidData = utils.processPayments(results[10], miner)[miner];

      // Structure Miscellaneous Data
      const primaryDifficultyData = utils.processDifficulty(results[6], miner);
      const auxiliaryDifficultyData = utils.processDifficulty(results[13], miner);
      const primaryWorkerCounts = utils.countWorkers(results[6], miner);
      const auxiliaryWorkerCounts = utils.countWorkers(results[13], miner);
      const primaryWorkerData = utils.processWorkers(results[6], miner);
      const auxiliaryWorkerData = utils.processWorkers(results[13], miner);

      // Build Miner Statistics
      const statistics = {
        primary: {
          current: {
            solo: primaryShareData[0][miner] || 0,
            shared: primaryShareData[1][miner] || 0,
            times: primaryTimesData[miner] || 0,
          },
          status: {
            hashrate: (multiplier * primaryDifficultyData) / hashrateWindow,
            workers: primaryWorkerCounts || 0,
          },
          payments: {
            balances: (primaryBalanceData || auxiliaryBalanceData) || 0,
            generate: (primaryGenerateData || auxiliaryGenerateData) || 0,
            immature: (primaryImmatureData || auxiliaryImmatureData) || 0,
            paid: (primaryPaidData || auxiliaryPaidData) || 0,
          },
          workers: primaryWorkerData
        },
        auxiliary: {
          current: {
            solo: auxiliaryShareData[0][miner] || 0,
            shared: auxiliaryShareData[1][miner] || 0,
            times: auxiliaryTimesData[miner] || 0,
          },
          status: {
            hashrate: (multiplier * auxiliaryDifficultyData) / hashrateWindow,
            workers: auxiliaryWorkerCounts || 0,
          },
          payments: {
            balances: (auxiliaryBalanceData || auxiliaryBalanceData) || 0,
            generate: (auxiliaryGenerateData || auxiliaryGenerateData) || 0,
            immature: (auxiliaryImmatureData || auxiliaryImmatureData) || 0,
            paid: (auxiliaryPaidData || auxiliaryPaidData) || 0,
          },
          workers: auxiliaryWorkerData
        }
      };

      // Output Final Payload
      _this.buildPayload(coin, `/miners/${ miner }`, _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /miners
  this.handleMiners = function(coin, response) {
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['zrangebyscore', `${ coin }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['zrangebyscore', `${ coin }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/miners', commands, response, (results) => {
      const miners = {
        primary: utils.processMiners(results[0]),
        auxiliary: utils.processMiners(results[1])};
      _this.buildPayload(coin, '/miners', _this.messages.success, miners, response);
    });
  };

  // API Endpoint for /payments/balances
  this.handlePaymentsBalances = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:primary:balances`],
      ['hgetall', `${ coin }:payments:auxiliary:balances`]];
    _this.executeCommands(coin, '/payments/balances', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(coin, '/payments/balances', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/generate
  this.handlePaymentsGenerate = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:primary:generate`],
      ['hgetall', `${ coin }:payments:auxiliary:generate`]];
    _this.executeCommands(coin, '/payments/generate', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(coin, '/payments/generate', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/immature
  this.handlePaymentsImmature = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:primary:immature`],
      ['hgetall', `${ coin }:payments:auxiliary:immature`]];
    _this.executeCommands(coin, '/payments/immature', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(coin, '/payments/immature', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/paid
  this.handlePaymentsPaid = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:primary:paid`],
      ['hgetall', `${ coin }:payments:auxiliary:paid`]];
    _this.executeCommands(coin, '/payments/paid', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(coin, '/payments/paid', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/paid
  this.handlePaymentsRecords = function(coin, response) {
    const commands = [
      ['zrange', `${ coin }:payments:primary:records`, 0, -1],
      ['zrange', `${ coin }:payments:auxiliary:records`, 0, -1]];
    _this.executeCommands(coin, '/payments/records', commands, response, (results) => {
      const payments = {
        primary: utils.processRecords(results[0]),
        auxiliary: utils.processRecords(results[1])};
      _this.buildPayload(coin, '/payments/records', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments
  this.handlePayments = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:payments:primary:balances`],
      ['hgetall', `${ coin }:payments:primary:generate`],
      ['hgetall', `${ coin }:payments:primary:immature`],
      ['hgetall', `${ coin }:payments:primary:paid`],
      ['hgetall', `${ coin }:payments:auxiliary:balances`],
      ['hgetall', `${ coin }:payments:auxiliary:generate`],
      ['hgetall', `${ coin }:payments:auxiliary:immature`],
      ['hgetall', `${ coin }:payments:auxiliary:paid`]];
    _this.executeCommands(coin, '/payments', commands, response, (results) => {
      const blocks = {
        primary: {
          balances: utils.processPayments(results[0]),
          generate: utils.processPayments(results[1]),
          immature: utils.processPayments(results[2]),
          paid: utils.processPayments(results[3]),
        },
        auxiliary: {
          balances: utils.processPayments(results[4]),
          generate: utils.processPayments(results[5]),
          immature: utils.processPayments(results[6]),
          paid: utils.processPayments(results[7]),
        }
      };
      _this.buildPayload(coin, '/payments', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /rounds/current
  this.handleRoundsCurrent = function(coin, response) {
    const commands = [
      ['hgetall', `${ coin }:rounds:primary:current:shares`],
      ['hgetall', `${ coin }:rounds:primary:current:times`],
      ['hgetall', `${ coin }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ coin }:rounds:auxiliary:current:times`]];
    _this.executeCommands(coin, '/rounds/current', commands, response, (results) => {
      const primaryShareData = utils.processShares(results[0]);
      const auxiliaryShareData = utils.processShares(results[2]);
      const current = {
        primary: {
          solo: primaryShareData[0],
          shared: primaryShareData[1],
          times: utils.processTimes(results[1]),
        },
        auxiliary: {
          solo: auxiliaryShareData[0],
          shared: auxiliaryShareData[1],
          times: utils.processTimes(results[3]),
        }
      };
      _this.buildPayload(coin, '/rounds/current', _this.messages.success, current, response);
    });
  };

  // API Endpoint for /rounds/[height]
  this.handleRoundsHeight = function(coin, height, response) {
    const commands = [
      ['hgetall', `${ coin }:rounds:primary:round-${ height }:shares`],
      ['hgetall', `${ coin }:rounds:primary:round-${ height }:times`],
      ['hgetall', `${ coin }:rounds:auxiliary:round-${ height }:shares`],
      ['hgetall', `${ coin }:rounds:auxiliary:round-${ height }:times`]];
    _this.executeCommands(coin, `/rounds/${ height }`, commands, response, (results) => {
      const primaryShareData = utils.processShares(results[0]);
      const auxiliaryShareData = utils.processShares(results[2]);
      const current = {
        primary: {
          solo: primaryShareData[0],
          shared: primaryShareData[1],
          times: utils.processTimes(results[1]),
        },
        auxiliary: {
          solo: auxiliaryShareData[0],
          shared: auxiliaryShareData[1],
          times: utils.processTimes(results[3]),
        }
      };
      _this.buildPayload(coin, `/rounds/${ height }`, _this.messages.success, current, response);
    });
  };

  // Helper Function for /rounds
  this.processRounds = function(coin, rounds, blockType, response, callback) {
    const combined = {};
    if (rounds.length >= 1) {
      const handler = new Promise((resolve,) => {
        rounds.forEach((height, idx) => {
          const commands = [
            ['hgetall', `${ coin }:rounds:${ blockType }:round-${ height }:shares`],
            ['hgetall', `${ coin }:rounds:${ blockType }:round-${ height }:times`]];
          _this.executeCommands(coin, '/rounds', commands, response, (results) => {
            const shareData = utils.processShares(results[0]);
            combined[height] = {
              solo: shareData[0],
              shared: shareData[1],
              times: utils.processTimes(results[1])};
            if (idx === rounds.length - 1) {
              resolve(combined);
            }
          });
        });
      });
      handler.then((combined) => {
        callback(combined);
      });
    } else {
      callback(combined);
    }
  };

  // API Endpoint for /rounds
  this.handleRounds = function(coin, response) {
    const keys = [
      ['keys', `${ coin }:rounds:primary:round-*:shares`],
      ['keys', `${ coin }:rounds:auxiliary:round-*:shares`]];
    _this.executeCommands(coin, '/rounds', keys, response, (results) => {
      const rounds = {};
      const primaryRounds = results[0].map((key) => key.split(':')[3].split('-')[1]);
      const auxiliaryRounds = results[1].map((key) => key.split(':')[3].split('-')[1]);
      _this.processRounds(coin, primaryRounds, 'primary', response, (combined) => {
        rounds.primary = combined;
        _this.processRounds(coin, auxiliaryRounds, 'auxiliary', response, (combined) => {
          rounds.auxiliary = combined;
          _this.buildPayload(coin, '/rounds', _this.messages.success, rounds, response);
        });
      });
    });
  };

  // API Endpoint for /statistics
  /* istanbul ignore next */
  this.handleStatistics = function(coin, response) {
    const algorithm = _this.poolConfigs[coin].primary.coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ coin }:blocks:primary:counts`],
      ['hgetall', `${ coin }:payments:primary:counts`],
      ['hgetall', `${ coin }:rounds:primary:current:counts`],
      ['zrangebyscore', `${ coin }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['hgetall', `${ coin }:blocks:auxiliary:counts`],
      ['hgetall', `${ coin }:payments:auxiliary:counts`],
      ['hgetall', `${ coin }:rounds:auxiliary:current:counts`],
      ['zrangebyscore', `${ coin }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/statistics', commands, response, (results) => {
      const statistics = {
        primary: {
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
        },
        auxiliary: {
          blocks: {
            valid: parseFloat(results[4] ? results[4].valid || 0 : 0),
            invalid: parseFloat(results[4] ? results[4].invalid || 0 : 0),
          },
          shares: {
            valid: parseFloat(results[6] ? results[6].valid || 0 : 0),
            invalid: parseFloat(results[6] ? results[6].invalid || 0 : 0),
          },
          status: {
            hashrate: (multiplier * utils.processDifficulty(results[7])) / hashrateWindow,
            miners: utils.countMiners(results[7]),
            workers: utils.countWorkers(results[7]),
          },
          payments: {
            last: parseFloat(results[5] ? results[5].last || 0 : 0),
            next: parseFloat(results[5] ? results[5].next || 0 : 0),
            total: parseFloat(results[5] ? results[5].total || 0 : 0),
          }
        }
      };
      _this.buildPayload(coin, '/statistics', _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /workers/[worker]
  this.handleWorkersSpecific = function(coin, worker, response) {
    const algorithm = _this.poolConfigs[coin].primary.coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ coin }:rounds:primary:current:shares`],
      ['hgetall', `${ coin }:rounds:primary:current:times`],
      ['zrangebyscore', `${ coin }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['hgetall', `${ coin }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ coin }:rounds:auxiliary:current:times`],
      ['zrangebyscore', `${ coin }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, `/workers/${ worker }`, commands, response, (results) => {

      // Structure Round Data
      const primaryShareData = utils.processShares(results[0], worker);
      const auxiliaryShareData = utils.processShares(results[3], worker);
      const primaryTimesData = utils.processTimes(results[1], worker);
      const auxiliaryTimesData = utils.processTimes(results[4], worker);

      // Structure Miscellaneous Data
      const primaryDifficultyData = utils.processDifficulty(results[2], worker);
      const auxiliaryDifficultyData = utils.processDifficulty(results[5], worker);

      // Build Worker Statistics
      const statistics = {
        primary: {
          current: {
            solo: primaryShareData[0][worker] || 0,
            shared: primaryShareData[1][worker] || 0,
            times: primaryTimesData[worker] || 0,
          },
          status: {
            hashrate: (multiplier * primaryDifficultyData) / hashrateWindow,
          },
        },
        auxiliary: {
          current: {
            solo: auxiliaryShareData[0][worker] || 0,
            shared: auxiliaryShareData[1][worker] || 0,
            times: auxiliaryTimesData[worker] || 0,
          },
          status: {
            hashrate: (multiplier * auxiliaryDifficultyData) / hashrateWindow,
          },
        }
      };

      // Output Final Payload
      _this.buildPayload(coin, `/workers/${ worker }`, _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /workers
  this.handleWorkers = function(coin, response) {
    const hashrateWindow = _this.poolConfigs[coin].settings.hashrateWindow;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['zrangebyscore', `${ coin }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['zrangebyscore', `${ coin }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(coin, '/workers', commands, response, (results) => {
      const workers = {
        primary: utils.processWorkers(results[0]),
        auxiliary: utils.processWorkers(results[1])};
      _this.buildPayload(coin, '/workers', _this.messages.success, workers, response);
    });
  };

  // Miscellaneous Endpoints
  //////////////////////////////////////////////////////////////////////////////

  // API Endpoint for /coins
  this.handleCoins = function(response) {
    const coins = Object.keys(_this.poolConfigs);
    _this.buildPayload('Pool', '/coins', _this.messages.success, coins, response);
  };

  // API Endpoint for /partners
  this.handlePartners = function(response) {
    const partners = Object.values(_this.partnerConfigs);
    _this.buildPayload('Pool', '/partners', _this.messages.success, partners, response);
  };

  //////////////////////////////////////////////////////////////////////////////

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

    let coin, endpoint, method;

    // If Path Params Exist
    if (req.params) {
      coin = utils.validateInput(req.params.coin || '');
      endpoint = utils.validateInput(req.params.endpoint || '');
    }

    // If Query Params Exist
    if (req.query) {
      method = utils.validateInput(req.query.method || '');
    }

    const miscellaneous = ['coins', 'partners'];
    if (!(coin in _this.poolConfigs) && !(miscellaneous.includes(coin))) {
      _this.buildPayload(coin, '/unknown', _this.messages.coin, null, res);
      return;
    }

    // Select Endpoint from Parameters
    switch (true) {

    // Blocks Endpoints
    case (endpoint === 'blocks' && method === 'confirmed'):
      _this.handleBlocksConfirmed(coin, res);
      break;
    case (endpoint === 'blocks' && method === 'kicked'):
      _this.handleBlocksKicked(coin, res);
      break;
    case (endpoint === 'blocks' && method === 'pending'):
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
    case (endpoint === 'payments' && method === 'balances'):
      _this.handlePaymentsBalances(coin, res);
      break;
    case (endpoint === 'payments' && method === 'generate'):
      _this.handlePaymentsGenerate(coin, res);
      break;
    case (endpoint === 'payments' && method === 'immature'):
      _this.handlePaymentsImmature(coin, res);
      break;
    case (endpoint === 'payments' && method === 'paid'):
      _this.handlePaymentsPaid(coin, res);
      break;
    case (endpoint === 'payments' && method === 'records'):
      _this.handlePaymentsRecords(coin, res);
      break;
    case (endpoint === 'payments' && method === ''):
      _this.handlePayments(coin, res);
      break;

    // Rounds Endpoints
    case (endpoint === 'rounds' && method === 'current'):
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
      _this.buildPayload(coin, '/unknown', _this.messages.method, null, res);
      break;
    }
  };
};

module.exports = PoolApi;
