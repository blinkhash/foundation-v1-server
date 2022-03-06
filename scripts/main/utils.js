/*
 *
 * Utils (Updated)
 *
 */

const os = require('os');
const crypto = require('crypto');

////////////////////////////////////////////////////////////////////////////////

// Calculate Average of Object Property
exports.calculateAverage = function(data, property) {
  const average = data.reduce((p_sum, a) => p_sum + a[property], 0) / data.length;
  if (average) {
    return Math.round(average * 100) / 100;
  } else {
    return 0;
  }
};

// Check if Value is a Number
exports.checkNumber = function(value) {
  if (typeof value !== 'string') {
    return false;
  } else {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }
};

// Check to see if Solo Mining
exports.checkSoloMining = function(poolConfig, data) {
  let isSoloMining = false;
  const activePort = poolConfig.ports.filter(port => port.port === data.port);
  if (activePort.length >= 1) {
    isSoloMining = activePort[0].type === 'solo';
  }
  return isSoloMining;
};

// Round Coins to Nearest Value
exports.coinsRound = function(number, precision) {
  return exports.roundTo(number, precision);
};

// Convert Coins to Satoshis
exports.coinsToSatoshis = function(coins, magnitude) {
  return Math.round(coins * magnitude);
};

// Combine Solo/Shared Miners Count
exports.combineMiners = function(shared, solo) {
  let output = 0;
  if (shared || solo) {
    shared = shared ? shared.map((share) => JSON.parse(share)) : [];
    solo = solo ? solo.map((share) => JSON.parse(share)) : [];
    output += exports.countMiners(shared);
    output += exports.countMiners(solo);
  }
  return output;
};

// Count Number of Miners
exports.countMiners = function(shares) {
  let output = 0;
  const miners = [];
  if (shares) {
    shares.forEach((share) => {
      if (share.worker) {
        const worker = share.worker.split('.')[0];
        if (!(miners.includes(worker))) {
          output += 1;
          miners.push(worker);
        }
      }
    });
  }
  return output;
};

// Count Occurences of Value in Array
exports.countOccurences = function(array, value) {
  let output = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i] === value)
      output += 1;
  }
  return output;
};

// Combine Solo/Shared Workers Count
exports.combineWorkers = function(shared, solo) {
  let output = 0;
  if (shared || solo) {
    shared = shared ? shared.map((share) => JSON.parse(share)) : [];
    solo = solo ? solo.map((share) => JSON.parse(share)) : [];
    output += exports.countWorkers(shared);
    output += exports.countWorkers(solo);
  }
  return output;
};

// Count Number of Workers
exports.countWorkers = function(shares) {
  let output = 0;
  const workers = [];
  if (shares) {
    shares.forEach((share) => {
      if (share.worker) {
        if (!(workers.includes(share.worker))) {
          output += 1;
          workers.push(share.worker);
        }
      }
    });
  }
  return output;
};

// Count Number of Process Forks
exports.countProcessForks = function(portalConfig) {
  if (!portalConfig.clustering || !portalConfig.clustering.enabled) {
    return 1;
  } else if (portalConfig.clustering.forks === 'auto') {
    return os.cpus().length;
  } else if (!portalConfig.clustering.forks || isNaN(portalConfig.clustering.forks)) {
    return 1;
  }
  return portalConfig.clustering.forks;
};

// Generate Unique ExtraNonce for each Subscriber
/* istanbul ignore next */
exports.extraNonceCounter = function(size) {
  return {
    size: size,
    next: function() {
      return(crypto.randomBytes(this.size).toString('hex'));
    }
  };
};

// List Blocks per Address for API Endpoints
exports.listBlocks = function(blocks, address) {
  const output = [];
  if (blocks) {
    blocks = blocks
      .map((block) => JSON.parse(block))
      .sort((a, b) => (b.height - a.height));
    blocks.forEach((block) => {
      if (block.worker.split('.')[0] === address) {
        output.push(block);
      }
    });
  }
  return output;
};

// List Share Identifiers
exports.listIdentifiers = function(shares) {
  const output = [];
  if (shares) {
    shares = shares
      .map((share) => JSON.parse(share))
      .forEach((share) => {
        if (share.identifier || share.identifier == '') {
          if (!(output.includes(share.identifier))) {
            output.push(share.identifier);
          }
        }
      });
  }
  if (output.length == 0) {
    return [''];
  }
  return output;
};

// List Round Workers for API Endpoints
exports.listWorkers = function(shares, address) {
  const workers = [];
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const worker = (address && address.includes('.')) ? entry : entry.split('.')[0];
      if (!address || address === worker) {
        if (details.worker && !(workers.includes(details.worker))) {
          workers.push(details.worker);
        }
      }
    });
  }
  return workers;
};

// Indicate Severity By Colors
exports.loggerColors = function(severity, text) {
  switch (severity) {
  case 'debug':
    return text.green;
  case 'warning':
    return text.yellow;
  case 'error':
    return text.red;
  case 'special':
    return text.cyan;
  default:
    return text.italic;
  }
};

// Severity Mapping Values
exports.loggerSeverity = {
  'debug': 1,
  'warning': 2,
  'error': 3,
  'special': 4
};

// Process Blocks for API Endpoints
exports.processBlocks = function(blocks) {
  const output = blocks
    .map((block) => JSON.parse(block))
    .sort((a, b) => (b.height - a.height));
  output.forEach((block) => (block.worker = block.worker.split('.')[0]));
  return output;
};

// Process Historical Data for API Endpoints
exports.processHistorical = function(history) {
  const output = [];
  if (history) {
    history.forEach((entry) => {
      output.push(JSON.parse(entry));
    });
  }
  return output;
};

// Process Work for API Endpoints with Identifier
exports.processIdentifiers = function(shares, multiplier, hashrateWindow) {
  const output = [];
  if (shares) {
    const identifiers = exports.listIdentifiers(shares);
    identifiers.forEach((entry) => {
      const hashrateValue = exports.processWork(shares, null, null, entry);
      const outputValue = {
        identifier: entry,
        hashrate: (multiplier * hashrateValue) / hashrateWindow
      };
      output.push(outputValue);
    });
  }
  return output;
};

// Process Luck for API Endpoints
exports.processLuck = function(pending, confirmed) {
  const output = {};
  pending = pending.map((block) => JSON.parse(block));
  confirmed = confirmed.map((block) => JSON.parse(block));
  const sorted = pending
    .concat(confirmed)
    .sort((a, b) => (b.height - a.height));
  output['luck1'] = exports.calculateAverage(sorted.slice(0, 1), 'luck');
  output['luck10'] = exports.calculateAverage(sorted.slice(0, 10), 'luck');
  output['luck100'] = exports.calculateAverage(sorted.slice(0, 100), 'luck');
  return output;
};

// Process Miners for API Endpoints
exports.processMiners = function(shares, hashrate, multiplier, hashrateWindow, active) {
  const miners = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);

      // Generate Miner Data
      const address = entry.split('.')[0];
      const hashrateValue = exports.processWork(hashrate, address, 'miner');
      const effortValue = (/^-?\d*(\.\d+)?$/.test(details.effort) ? parseFloat(details.effort) : null);
      const timeValue = (/^-?\d*(\.\d+)?$/.test(details.times) ? parseFloat(details.times) : null);
      const workValue = /^-?\d*(\.\d+)?$/.test(details.work) ? parseFloat(details.work) : 0;

      // Calculate Miner Information
      if (details.worker && workValue > 0) {
        if (!active || (active && hashrateValue > 0)) {
          if (address in miners) {
            if (details.time >= miners[address].time) {
              miners[address].time = details.time;
            }
            if (details.solo) {
              miners[address].effort += effortValue || 0;
            }
            if (timeValue >= miners[address].times) {
              miners[address].times = timeValue;
            }
            miners[address].shares.valid += (details.types || {}).valid || 0;
            miners[address].shares.invalid += (details.types || {}).invalid || 0;
            miners[address].shares.stale += (details.types || {}).stale || 0;
            miners[address].work += workValue;
          } else {
            miners[address] = {
              time: details.time,
              miner: address,
              effort: details.solo ? effortValue : null,
              hashrate: (multiplier * hashrateValue) / hashrateWindow,
              shares: {
                valid: (details.types || {}).valid || 0,
                invalid: (details.types || {}).invalid || 0,
                stale: (details.types || {}).stale || 0,
              },
              times: !details.solo ? timeValue : null,
              work: workValue,
            };
          }
        }
      }
    });
  }
  return Object.values(miners);
};

// Process Payments for API Endpoints
exports.processPayments = function(payments, address) {
  const output = {};
  if (payments) {
    Object.keys(payments).forEach((worker) => {
      const paymentValue = /^-?\d*(\.\d+)?$/.test(payments[worker]) ? parseFloat(payments[worker]) : 0;
      if (paymentValue > 0) {
        if (!address || address === worker) {
          output[worker] = paymentValue;
        }
      }
    });
  }
  return output;
};

// Process Records for API Endpoints
exports.processRecords = function(records) {
  return records
    .map((record) => JSON.parse(record))
    .sort((a, b) => (b.time - a.time));
};

// Process Shares for API Endpoints
exports.processShares = function(shares, address, type) {
  const output = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const worker = type === 'worker' ? entry : entry.split('.')[0];
      const workValue = /^-?\d*(\.\d+)?$/.test(details.work) ? parseFloat(details.work) : 0;
      if (!address || address === worker) {
        if (workValue > 0) {
          if (worker in output) {
            output[worker] += workValue;
          } else {
            output[worker] = workValue;
          }
        }
      }
    });
  }
  return output;
};

// Process Times for API Endpoints
exports.processTimes = function(shares, address, type) {
  const output = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const worker = type === 'worker' ? entry : entry.split('.')[0];
      const timeValue = /^-?\d*(\.\d+)?$/.test(details.times) ? parseFloat(details.times) : 0;
      if (!address || address === worker) {
        if (timeValue > 0 && !details.solo) {
          if (worker in output) {
            if (timeValue >= output[worker]) {
              output[worker] = timeValue;
            }
          } else {
            output[worker] = timeValue;
          }
        }
      }
    });
  }
  return output;
};

// Process Times for API Endpoints
exports.processTypes = function(shares, address, type) {
  const output = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const worker = type === 'worker' ? entry : entry.split('.')[0];
      if (!address || address === worker) {
        if (worker in output) {
          output[worker].valid += (details.types || {}).valid || 0;
          output[worker].invalid += (details.types || {}).invalid || 0;
          output[worker].stale += (details.types || {}).stale || 0;
        } else {
          output[worker] = {
            valid: (details.types || {}).valid || 0,
            invalid: (details.types || {}).invalid || 0,
            stale: (details.types || {}).stale || 0,
          };
        }
      }
    });
  }
  return output;
};

// Process Work for API Endpoints
exports.processWork = function(shares, address, type, identifier) {
  let output = 0;
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    if (identifier && identifier != '') {
      shares = shares.filter((share) => identifier === share.identifier);
    }
    shares.forEach((share) => {
      if (share.worker && share.work) {
        const worker = share.worker.split('.')[0];
        const workValue = /^-?\d*(\.\d+)?$/.test(share.work) ? parseFloat(share.work) : 0;
        if (!address || address === share.worker || (type === 'miner' && address === worker)) {
          output += workValue;
        }
      }
    });
  }
  return output;
};

// Process Workers for API Endpoints
exports.processWorkers = function(shares, hashrate, multiplier, hashrateWindow, active) {
  const workers = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);

      // Generate Worker Data
      const hashrateValue = exports.processWork(hashrate, entry, 'worker');
      const effortValue = (/^-?\d*(\.\d+)?$/.test(details.effort) ? parseFloat(details.effort) : null);
      const timeValue = (/^-?\d*(\.\d+)?$/.test(details.times) ? parseFloat(details.times) : null);
      const workValue = /^-?\d*(\.\d+)?$/.test(details.work) ? parseFloat(details.work) : 0;

      // Calculate Worker Information
      if (details.worker && workValue > 0) {
        if (!active || (active && hashrateValue > 0)) {
          workers[entry] = {
            time: details.time,
            worker: entry,
            effort: details.solo ? effortValue : null,
            hashrate: (multiplier * hashrateValue) / hashrateWindow,
            shares: {
              valid: (details.types || {}).valid || 0,
              invalid: (details.types || {}).invalid || 0,
              stale: (details.types || {}).stale || 0,
            },
            times: !details.solo ? timeValue : null,
            work: workValue,
          };
        }
      }
    });
  }
  return Object.values(workers);
};

// Round to # of Digits Given
exports.roundTo = function(n, digits) {
  if (!digits) {
    digits = 0;
  }
  const multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  const test = Math.round(n) / multiplicator;
  return +(test.toFixed(digits));
};

// Convert Satoshis to Coins
exports.satoshisToCoins = function(satoshis, magnitude, precision) {
  return exports.roundTo((satoshis / magnitude), precision);
};

// Validate Entered Address
exports.validateInput = function(address) {
  if (address.length >= 1) {
    address = address.toString().replace(/[^a-zA-Z0-9.-]+/g, '');
  }
  return address;
};
