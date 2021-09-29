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
    pool: { code: 405, message: 'The requested pool was not found. Verify your input and try again.' },
    success: { code: 200, message: '' }
  };

  // Main Endpoints
  //////////////////////////////////////////////////////////////////////////////

  // API Endpoint for /blocks/confirmed
  this.handleBlocksConfirmed = function(pool, response) {
    const commands = [
      ['smembers', `${ pool }:blocks:primary:confirmed`],
      ['smembers', `${ pool }:blocks:auxiliary:confirmed`]];
    _this.executeCommands(pool, '/blocks/confirmed', commands, response, (results) => {
      const blocks = {
        primary: utils.processBlocks(results[0]),
        auxiliary: utils.processBlocks(results[1])};
      _this.buildPayload(pool, '/blocks/confirmed', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks/kicked
  this.handleBlocksKicked = function(pool, response) {
    const commands = [
      ['smembers', `${ pool }:blocks:primary:kicked`],
      ['smembers', `${ pool }:blocks:auxiliary:kicked`]];
    _this.executeCommands(pool, '/blocks/kicked', commands, response, (results) => {
      const blocks = {
        primary: utils.processBlocks(results[0]),
        auxiliary: utils.processBlocks(results[1])};
      _this.buildPayload(pool, '/blocks/kicked', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks/pending
  this.handleBlocksPending = function(pool, response) {
    const commands = [
      ['smembers', `${ pool }:blocks:primary:pending`],
      ['smembers', `${ pool }:blocks:auxiliary:pending`]];
    _this.executeCommands(pool, '/blocks/pending', commands, response, (results) => {
      const blocks = {
        primary: utils.processBlocks(results[0]),
        auxiliary: utils.processBlocks(results[1])};
      _this.buildPayload(pool, '/blocks/pending', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /blocks
  this.handleBlocks = function(pool, response) {
    const commands = [
      ['smembers', `${ pool }:blocks:primary:confirmed`],
      ['smembers', `${ pool }:blocks:primary:kicked`],
      ['smembers', `${ pool }:blocks:primary:pending`],
      ['smembers', `${ pool }:blocks:auxiliary:confirmed`],
      ['smembers', `${ pool }:blocks:auxiliary:kicked`],
      ['smembers', `${ pool }:blocks:auxiliary:pending`]];
    _this.executeCommands(pool, '/blocks', commands, response, (results) => {
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
      _this.buildPayload(pool, '/blocks', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /miners/[miner]
  this.handleMinersSpecific = function(pool, miner, response) {
    const algorithm = _this.poolConfigs[pool].primary.coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[pool].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ pool }:payments:primary:balances`],
      ['hgetall', `${ pool }:payments:primary:generate`],
      ['hgetall', `${ pool }:payments:primary:immature`],
      ['hgetall', `${ pool }:payments:primary:paid`],
      ['hgetall', `${ pool }:rounds:primary:current:shares`],
      ['hgetall', `${ pool }:rounds:primary:current:times`],
      ['zrangebyscore', `${ pool }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['hgetall', `${ pool }:payments:auxiliary:balances`],
      ['hgetall', `${ pool }:payments:auxiliary:generate`],
      ['hgetall', `${ pool }:payments:auxiliary:immature`],
      ['hgetall', `${ pool }:payments:auxiliary:paid`],
      ['hgetall', `${ pool }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ pool }:rounds:auxiliary:current:times`],
      ['zrangebyscore', `${ pool }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(pool, `/miners/${ miner }`, commands, response, (results) => {

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
      _this.buildPayload(pool, `/miners/${ miner }`, _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /miners
  this.handleMiners = function(pool, response) {
    const hashrateWindow = _this.poolConfigs[pool].settings.hashrateWindow;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['zrangebyscore', `${ pool }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['zrangebyscore', `${ pool }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(pool, '/miners', commands, response, (results) => {
      const miners = {
        primary: utils.processMiners(results[0]),
        auxiliary: utils.processMiners(results[1])};
      _this.buildPayload(pool, '/miners', _this.messages.success, miners, response);
    });
  };

  // API Endpoint for /payments/balances
  this.handlePaymentsBalances = function(pool, response) {
    const commands = [
      ['hgetall', `${ pool }:payments:primary:balances`],
      ['hgetall', `${ pool }:payments:auxiliary:balances`]];
    _this.executeCommands(pool, '/payments/balances', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(pool, '/payments/balances', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/generate
  this.handlePaymentsGenerate = function(pool, response) {
    const commands = [
      ['hgetall', `${ pool }:payments:primary:generate`],
      ['hgetall', `${ pool }:payments:auxiliary:generate`]];
    _this.executeCommands(pool, '/payments/generate', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(pool, '/payments/generate', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/immature
  this.handlePaymentsImmature = function(pool, response) {
    const commands = [
      ['hgetall', `${ pool }:payments:primary:immature`],
      ['hgetall', `${ pool }:payments:auxiliary:immature`]];
    _this.executeCommands(pool, '/payments/immature', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(pool, '/payments/immature', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/paid
  this.handlePaymentsPaid = function(pool, response) {
    const commands = [
      ['hgetall', `${ pool }:payments:primary:paid`],
      ['hgetall', `${ pool }:payments:auxiliary:paid`]];
    _this.executeCommands(pool, '/payments/paid', commands, response, (results) => {
      const payments = {
        primary: utils.processPayments(results[0]),
        auxiliary: utils.processPayments(results[1])};
      _this.buildPayload(pool, '/payments/paid', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments/paid
  this.handlePaymentsRecords = function(pool, response) {
    const commands = [
      ['zrange', `${ pool }:payments:primary:records`, 0, -1],
      ['zrange', `${ pool }:payments:auxiliary:records`, 0, -1]];
    _this.executeCommands(pool, '/payments/records', commands, response, (results) => {
      const payments = {
        primary: utils.processRecords(results[0]),
        auxiliary: utils.processRecords(results[1])};
      _this.buildPayload(pool, '/payments/records', _this.messages.success, payments, response);
    });
  };

  // API Endpoint for /payments
  this.handlePayments = function(pool, response) {
    const commands = [
      ['hgetall', `${ pool }:payments:primary:balances`],
      ['hgetall', `${ pool }:payments:primary:generate`],
      ['hgetall', `${ pool }:payments:primary:immature`],
      ['hgetall', `${ pool }:payments:primary:paid`],
      ['hgetall', `${ pool }:payments:auxiliary:balances`],
      ['hgetall', `${ pool }:payments:auxiliary:generate`],
      ['hgetall', `${ pool }:payments:auxiliary:immature`],
      ['hgetall', `${ pool }:payments:auxiliary:paid`]];
    _this.executeCommands(pool, '/payments', commands, response, (results) => {
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
      _this.buildPayload(pool, '/payments', _this.messages.success, blocks, response);
    });
  };

  // API Endpoint for /rounds/current
  this.handleRoundsCurrent = function(pool, response) {
    const commands = [
      ['hgetall', `${ pool }:rounds:primary:current:shares`],
      ['hgetall', `${ pool }:rounds:primary:current:times`],
      ['hgetall', `${ pool }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ pool }:rounds:auxiliary:current:times`]];
    _this.executeCommands(pool, '/rounds/current', commands, response, (results) => {
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
      _this.buildPayload(pool, '/rounds/current', _this.messages.success, current, response);
    });
  };

  // API Endpoint for /rounds/[height]
  this.handleRoundsHeight = function(pool, height, response) {
    const commands = [
      ['hgetall', `${ pool }:rounds:primary:round-${ height }:shares`],
      ['hgetall', `${ pool }:rounds:primary:round-${ height }:times`],
      ['hgetall', `${ pool }:rounds:auxiliary:round-${ height }:shares`],
      ['hgetall', `${ pool }:rounds:auxiliary:round-${ height }:times`]];
    _this.executeCommands(pool, `/rounds/${ height }`, commands, response, (results) => {
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
      _this.buildPayload(pool, `/rounds/${ height }`, _this.messages.success, current, response);
    });
  };

  // Helper Function for /rounds
  this.processRounds = function(pool, rounds, blockType, response, callback) {
    const combined = {};
    if (rounds.length >= 1) {
      const handler = new Promise((resolve,) => {
        rounds.forEach((height, idx) => {
          const commands = [
            ['hgetall', `${ pool }:rounds:${ blockType }:round-${ height }:shares`],
            ['hgetall', `${ pool }:rounds:${ blockType }:round-${ height }:times`]];
          _this.executeCommands(pool, '/rounds', commands, response, (results) => {
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
  this.handleRounds = function(pool, response) {
    const keys = [
      ['keys', `${ pool }:rounds:primary:round-*:shares`],
      ['keys', `${ pool }:rounds:auxiliary:round-*:shares`]];
    _this.executeCommands(pool, '/rounds', keys, response, (results) => {
      const rounds = {};
      const primaryRounds = results[0].map((key) => key.split(':')[3].split('-')[1]);
      const auxiliaryRounds = results[1].map((key) => key.split(':')[3].split('-')[1]);
      _this.processRounds(pool, primaryRounds, 'primary', response, (combined) => {
        rounds.primary = combined;
        _this.processRounds(pool, auxiliaryRounds, 'auxiliary', response, (combined) => {
          rounds.auxiliary = combined;
          _this.buildPayload(pool, '/rounds', _this.messages.success, rounds, response);
        });
      });
    });
  };

  // API Endpoint for /statistics
  /* istanbul ignore next */
  this.handleStatistics = function(pool, response) {
    const algorithm = _this.poolConfigs[pool].primary.coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[pool].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ pool }:blocks:primary:counts`],
      ['smembers', `${ pool }:blocks:primary:pending`],
      ['hgetall', `${ pool }:payments:primary:counts`],
      ['hgetall', `${ pool }:rounds:primary:current:counts`],
      ['zrangebyscore', `${ pool }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['hgetall', `${ pool }:blocks:auxiliary:counts`],
      ['smembers', `${ pool }:blocks:auxiliary:pending`],
      ['hgetall', `${ pool }:payments:auxiliary:counts`],
      ['hgetall', `${ pool }:rounds:auxiliary:current:counts`],
      ['zrangebyscore', `${ pool }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(pool, '/statistics', commands, response, (results) => {
      const statistics = {
        primary: {
          blocks: {
            valid: parseFloat(results[0] ? results[0].valid || 0 : 0),
            invalid: parseFloat(results[0] ? results[0].invalid || 0 : 0),
          },
          shares: {
            valid: parseFloat(results[3] ? results[3].valid || 0 : 0),
            invalid: parseFloat(results[3] ? results[3].invalid || 0 : 0),
          },
          status: {
            luck: utils.processLuck(results[1]),
            hashrate: (multiplier * utils.processDifficulty(results[4])) / hashrateWindow,
            miners: utils.countMiners(results[4]),
            workers: utils.countWorkers(results[4]),
          },
          payments: {
            last: parseFloat(results[2] ? results[2].last || 0 : 0),
            next: parseFloat(results[2] ? results[2].next || 0 : 0),
            total: parseFloat(results[2] ? results[2].total || 0 : 0),
          }
        },
        auxiliary: {
          blocks: {
            valid: parseFloat(results[5] ? results[5].valid || 0 : 0),
            invalid: parseFloat(results[5] ? results[5].invalid || 0 : 0),
          },
          shares: {
            valid: parseFloat(results[8] ? results[8].valid || 0 : 0),
            invalid: parseFloat(results[8] ? results[8].invalid || 0 : 0),
          },
          status: {
            luck: utils.processLuck(results[6]),
            hashrate: (multiplier * utils.processDifficulty(results[9])) / hashrateWindow,
            miners: utils.countMiners(results[9]),
            workers: utils.countWorkers(results[9]),
          },
          payments: {
            last: parseFloat(results[7] ? results[7].last || 0 : 0),
            next: parseFloat(results[7] ? results[7].next || 0 : 0),
            total: parseFloat(results[7] ? results[7].total || 0 : 0),
          }
        }
      };
      _this.buildPayload(pool, '/statistics', _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /workers/[worker]
  this.handleWorkersSpecific = function(pool, worker, response) {
    const algorithm = _this.poolConfigs[pool].primary.coin.algorithms.mining;
    const hashrateWindow = _this.poolConfigs[pool].settings.hashrateWindow;
    const multiplier = Math.pow(2, 32) / Algorithms[algorithm].multiplier;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['hgetall', `${ pool }:rounds:primary:current:shares`],
      ['hgetall', `${ pool }:rounds:primary:current:times`],
      ['zrangebyscore', `${ pool }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['hgetall', `${ pool }:rounds:auxiliary:current:shares`],
      ['hgetall', `${ pool }:rounds:auxiliary:current:times`],
      ['zrangebyscore', `${ pool }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(pool, `/workers/${ worker }`, commands, response, (results) => {

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
      _this.buildPayload(pool, `/workers/${ worker }`, _this.messages.success, statistics, response);
    });
  };

  // API Endpoint for /workers
  this.handleWorkers = function(pool, response) {
    const hashrateWindow = _this.poolConfigs[pool].settings.hashrateWindow;
    const windowTime = (((Date.now() / 1000) - hashrateWindow) | 0).toString();
    const commands = [
      ['zrangebyscore', `${ pool }:rounds:primary:current:hashrate`, windowTime, '+inf'],
      ['zrangebyscore', `${ pool }:rounds:auxiliary:current:hashrate`, windowTime, '+inf']];
    _this.executeCommands(pool, '/workers', commands, response, (results) => {
      const workers = {
        primary: utils.processWorkers(results[0]),
        auxiliary: utils.processWorkers(results[1])};
      _this.buildPayload(pool, '/workers', _this.messages.success, workers, response);
    });
  };

  // Miscellaneous Endpoints
  //////////////////////////////////////////////////////////////////////////////

  // API Endpoint for /pools
  this.handlePools = function(response) {
    const pools = Object.keys(_this.poolConfigs);
    _this.buildPayload('Pool', '/pools', _this.messages.success, pools, response);
  };

  // API Endpoint for /partners
  this.handlePartners = function(response) {
    const partners = Object.values(_this.partnerConfigs);
    _this.buildPayload('Pool', '/partners', _this.messages.success, partners, response);
  };

  //////////////////////////////////////////////////////////////////////////////

  // Build API Payload for each Endpoint
  this.buildPayload = function(pool, endpoint, message, data, response) {
    const payload = {
      pool: pool,
      coins: _this.poolConfigs[pool] ? _this.poolConfigs[pool].coins || [] : [],
      logo: _this.poolConfigs[pool] ? _this.poolConfigs[pool].logo || '' : '',
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
  this.executeCommands = function(pool, endpoint, commands, response, callback) {
    _this.client.multi(commands).exec((error, results) => {
      if (error) {
        _this.buildPayload(pool, endpoint, _this.messages.invalid, null, response);
      } else {
        callback(results);
      }
    });
  };

  // Determine API Endpoint Called
  this.handleApiV1 = function(req, res) {

    let pool, endpoint, method;

    // If Path Params Exist
    if (req.params) {
      pool = utils.validateInput(req.params.pool || '');
      endpoint = utils.validateInput(req.params.endpoint || '');
    }

    // If Query Params Exist
    if (req.query) {
      method = utils.validateInput(req.query.method || '');
    }

    const miscellaneous = ['pools', 'partners'];
    if (!(pool in _this.poolConfigs) && !(miscellaneous.includes(pool))) {
      _this.buildPayload(pool, '/unknown', _this.messages.pool, null, res);
      return;
    }

    // Select Endpoint from Parameters
    switch (true) {

    // Blocks Endpoints
    case (endpoint === 'blocks' && method === 'confirmed'):
      _this.handleBlocksConfirmed(pool, res);
      break;
    case (endpoint === 'blocks' && method === 'kicked'):
      _this.handleBlocksKicked(pool, res);
      break;
    case (endpoint === 'blocks' && method === 'pending'):
      _this.handleBlocksPending(pool, res);
      break;
    case (endpoint === 'blocks' && method === ''):
      _this.handleBlocks(pool, res);
      break;

    // Miners Endpoints
    case (endpoint === 'miners' && method.length >= 1):
      _this.handleMinersSpecific(pool, method, res);
      break;
    case (endpoint === 'miners' && method === ''):
      _this.handleMiners(pool, res);
      break;

    // Payments Endpoints
    case (endpoint === 'payments' && method === 'balances'):
      _this.handlePaymentsBalances(pool, res);
      break;
    case (endpoint === 'payments' && method === 'generate'):
      _this.handlePaymentsGenerate(pool, res);
      break;
    case (endpoint === 'payments' && method === 'immature'):
      _this.handlePaymentsImmature(pool, res);
      break;
    case (endpoint === 'payments' && method === 'paid'):
      _this.handlePaymentsPaid(pool, res);
      break;
    case (endpoint === 'payments' && method === 'records'):
      _this.handlePaymentsRecords(pool, res);
      break;
    case (endpoint === 'payments' && method === ''):
      _this.handlePayments(pool, res);
      break;

    // Rounds Endpoints
    case (endpoint === 'rounds' && method === 'current'):
      _this.handleRoundsCurrent(pool, res);
      break;
    case (endpoint === 'rounds' && utils.checkNumber(method)):
      _this.handleRoundsHeight(pool, method, res);
      break;
    case (endpoint === 'rounds' && method === ''):
      _this.handleRounds(pool, res);
      break;

    // Statistics Endpoints
    case (endpoint === 'statistics' && method === ''):
      _this.handleStatistics(pool, res);
      break;

    // Workers Endpoints
    case (endpoint === 'workers' && method.length >= 1):
      _this.handleWorkersSpecific(pool, method, res);
      break;
    case (endpoint === 'workers' && method === ''):
      _this.handleWorkers(pool, res);
      break;

    // Miscellaneous Endpoints
    case (endpoint === '' && method === '' && pool === 'partners'):
      _this.handlePartners(res);
      break;
    case (endpoint === '' && method === '' && pool === 'pools'):
      _this.handlePools(res);
      break;
    case (endpoint === '' && method === '' && !(miscellaneous.includes(pool))):
      _this.handleStatistics(pool, res);
      break;

    // Unknown Endpoints
    default:
      _this.buildPayload(pool, '/unknown', _this.messages.method, null, res);
      break;
    }
  };
};

module.exports = PoolApi;
