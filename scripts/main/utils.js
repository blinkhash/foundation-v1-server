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
  let count = 0;
  if (shared || solo) {
    shared = shared ? shared.map((share) => JSON.parse(share)) : [];
    solo = solo ? solo.map((share) => JSON.parse(share)) : [];
    count += exports.countMiners(shared);
    count += exports.countMiners(solo);
  }
  return count;
};

// Count Number of Miners
exports.countMiners = function(shares) {
  let count = 0;
  const miners = [];
  if (shares) {
    shares.forEach((share) => {
      if (share.worker) {
        const address = share.worker.split('.')[0];
        if (!(miners.includes(address))) {
          count += 1;
          miners.push(address);
        }
      }
    });
  }
  return count;
};

// Count Occurences of Value in Array
exports.countOccurences = function(array, value) {
  let count = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i] === value)
      count += 1;
  }
  return count;
};

// Combine Solo/Shared Workers Count
exports.combineWorkers = function(shared, solo) {
  let count = 0;
  if (shared || solo) {
    shared = shared ? shared.map((share) => JSON.parse(share)) : [];
    solo = solo ? solo.map((share) => JSON.parse(share)) : [];
    count += exports.countWorkers(shared);
    count += exports.countWorkers(solo);
  }
  return count;
};

// Count Number of Workers
exports.countWorkers = function(shares) {
  let count = 0;
  const workers = [];
  if (shares) {
    shares.forEach((share) => {
      if (share.worker) {
        if (!(workers.includes(share.worker))) {
          count += 1;
          workers.push(share.worker);
        }
      }
    });
  }
  return count;
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

// List Round Workers for API Endpoints
exports.listWorkers = function(shares, worker) {
  const workers = [];
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      if (share.worker) {
        const address = (worker && worker.includes('.')) ? share.worker : share.worker.split('.')[0];
        if (!worker || worker === address) {
          if (!(workers.includes(share.worker))) {
            workers.push(share.worker);
          }
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

// Process Difficulty for API Endpoints
exports.processDifficulty = function(shares, miner, type) {
  let count = 0;
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      if (share.worker && share.difficulty) {
        const address = share.worker.split('.')[0];
        const shareValue = /^-?\d*(\.\d+)?$/.test(share.difficulty) ? parseFloat(share.difficulty) : 0;
        if (!miner || miner === share.worker || (type === 'miner' && miner === address)) {
          count += shareValue;
        }
      }
    });
  }
  return count;
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
exports.processMiners = function(shares, hashrate, times, multiplier, hashrateWindow, active) {
  const miners = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const address = entry.split('.')[0];
      const shareValue = /^-?\d*(\.\d+)?$/.test(details.difficulty) ? parseFloat(details.difficulty) : 0;
      const effortValue = (!times) ? (/^-?\d*(\.\d+)?$/.test(details.effort) ? parseFloat(details.effort) : 0) : null;
      const timeValue = (times) ? (/^-?\d*(\.\d+)?$/.test(times[entry]) ? parseFloat(times[entry]) : 0) : null;
      const hashrateValue = exports.processDifficulty(hashrate, address, 'miner');
      if (details.worker && shareValue > 0) {
        if (address in miners) {
          miners[address].shares += shareValue;
          if (times && timeValue >= miners[address].times) {
            miners[address].times = timeValue;
          } else if (!times) {
            miners[address].effort += effortValue || 0;
          }
        } else {
          if (!active || (active && hashrateValue > 0)) {
            miners[address] = {
              miner: address,
              shares: shareValue,
              times: timeValue || null,
              hashrate: (multiplier * hashrateValue) / hashrateWindow,
              effort: effortValue || null,
            };
          }
        }
      }
    });
  }
  return Object.values(miners);
};

// Process Payments for API Endpoints
exports.processPayments = function(payments, miner) {
  const output = {};
  if (payments) {
    Object.keys(payments).forEach((address) => {
      const paymentValue = /^-?\d*(\.\d+)?$/.test(payments[address]) ? parseFloat(payments[address]) : 0;
      if (paymentValue > 0) {
        if (!miner || miner === address) {
          output[address] = paymentValue;
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
    .sort((a, b) => (a.time - b.time));
};

// Process Shares for API Endpoints
exports.processShares = function(shares, miner) {
  const output = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const address = (miner && miner.includes('.')) ? entry : entry.split('.')[0];
      const shareValue = /^-?\d*(\.\d+)?$/.test(details.difficulty) ? parseFloat(details.difficulty) : 0;
      if (!miner || miner === address) {
        if (shareValue > 0) {
          if (address in output) {
            output[address] += shareValue;
          } else {
            output[address] = shareValue;
          }
        }
      }
    });
  }
  return output;
};

// Process Times for API Endpoints
exports.processTimes = function(times, miner) {
  const output = {};
  if (times) {
    Object.keys(times).forEach((address) => {
      const amount = times[address];
      address = (miner && miner.includes('.')) ? address : address.split('.')[0];
      const timeValue = /^-?\d*(\.\d+)?$/.test(amount) ? parseFloat(amount) : 0;
      if (!miner || miner === address) {
        if (timeValue > 0) {
          if (address in output) {
            if (timeValue >= output[address]) {
              output[address] = parseFloat(timeValue);
            }
          } else {
            output[address] = parseFloat(timeValue);
          }
        }
      }
    });
  }
  return output;
};

// Process Workers for API Endpoints
exports.processWorkers = function(shares, hashrate, times, multiplier, hashrateWindow, active) {
  const workers = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(shares[entry]);
      const shareValue = /^-?\d*(\.\d+)?$/.test(details.difficulty) ? parseFloat(details.difficulty) : 0;
      const effortValue = (!times) ? (/^-?\d*(\.\d+)?$/.test(details.effort) ? parseFloat(details.effort) : 0) : null;
      const timeValue = (times) ? (/^-?\d*(\.\d+)?$/.test(times[entry]) ? parseFloat(times[entry]) : 0) : null;
      const hashrateValue = exports.processDifficulty(hashrate, entry, 'worker');
      if (details.worker && shareValue > 0) {
        if (!active || (active && hashrateValue > 0)) {
          workers[entry] = {
            worker: entry,
            shares: shareValue,
            times: timeValue || null,
            hashrate: (multiplier * hashrateValue) / hashrateWindow,
            effort: effortValue || null,
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
