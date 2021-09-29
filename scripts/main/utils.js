/*
 *
 * Utils (Updated)
 *
 */

const os = require('os');

////////////////////////////////////////////////////////////////////////////////

// Calculate Average of Object Property
exports.calculateAverage = function(data, property) {
  const average = data.reduce((total, next) => total + next[property], 0) / data.length;
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

// Count Number of Miners
exports.countMiners = function(shares) {
  let count = 0;
  const miners = [];
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      const address = share.worker.split('.')[0];
      if (!(miners.includes(address))) {
        count += 1;
        miners.push(address);
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

// Count Number of Miners
exports.countWorkers = function(shares, worker) {
  let count = 0;
  const workers = [];
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      const address = share.worker.split('.')[0];
      if (!worker || worker === address) {
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
exports.processDifficulty = function(shares, miner) {
  let count = 0;
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      const address = (miner && miner.includes('.')) ? share.worker : share.worker.split('.')[0];
      if (!miner || miner === address) {
        count += parseFloat(share.difficulty);
      }
    });
  }
  return count;
};

// Process Luck for API Endpoints
exports.processLuck = function(blocks) {
  const output = {};
  const sorted = blocks
    .map((block) => JSON.parse(block))
    .sort((a, b) => (b.height - a.height));
  output['luck1'] = exports.calculateAverage(sorted.slice(0, 1), 'luck');
  output['luck10'] = exports.calculateAverage(sorted.slice(0, 10), 'luck');
  output['luck100'] = exports.calculateAverage(sorted.slice(0, 100), 'luck');
  return output;
};

// Process Miners for API Endpoints
exports.processMiners = function(shares) {
  const miners = [];
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      const address = share.worker.split('.')[0];
      if (!(miners.includes(address))) {
        miners.push(address);
      }
    });
  }
  return miners;
};

// Process Payments for API Endpoints
exports.processPayments = function(payments, miner) {
  const output = {};
  if (payments) {
    Object.keys(payments).forEach((address) => {
      if (parseFloat(payments[address]) > 0) {
        if (!miner || miner === address) {
          output[address] = parseFloat(payments[address]);
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
  const solo = {};
  const shared = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(entry);
      const address = (miner && miner.includes('.')) ? details.worker : details.worker.split('.')[0];
      if (!miner || miner === address) {
        if (shares[entry] > 0) {
          if (details.solo) {
            if (address in solo) {
              solo[address] += parseFloat(shares[entry]);
            } else {
              solo[address] = parseFloat(shares[entry]);
            }
          } else {
            if (address in shared) {
              shared[address] += parseFloat(shares[entry]);
            } else {
              shared[address] = parseFloat(shares[entry]);
            }
          }
        }
      }
    });
  }
  return [solo, shared];
};

// Process Times for API Endpoints
exports.processTimes = function(times, miner) {
  const output = {};
  if (times) {
    Object.keys(times).forEach((address) => {
      const amount = times[address];
      address = (miner && miner.includes('.')) ? address : address.split('.')[0];
      if (!miner || miner === address) {
        if (amount > 0) {
          if (address in output) {
            if (amount >= output[address]) {
              output[address] = parseFloat(amount);
            }
          } else {
            output[address] = parseFloat(amount);
          }
        }
      }
    });
  }
  return output;
};

// Process Workers for API Endpoints
exports.processWorkers = function(shares, worker) {
  const workers = [];
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      const address = (worker && worker.includes('.')) ? share.worker : share.worker.split('.')[0];
      if (!worker || worker === address) {
        if (!(workers.includes(share.worker))) {
          workers.push(share.worker);
        }
      }
    });
  }
  return workers;
};

// Round to # of Digits Given
exports.roundTo = function(n, digits) {
  if (digits === undefined) {
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
    address = address.toString().replace(/[^a-zA-Z0-9.]+/g, '');
  }
  return address;
};
