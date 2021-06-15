/*
 *
 * Utils (Updated)
 *
 */

const os = require('os');

////////////////////////////////////////////////////////////////////////////////

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
  shares = shares.map((share) => JSON.parse(share));
  shares.forEach((share) => {
    const address = share.worker.split('.')[0];
    if (!(miners.includes(address))) {
      count += 1;
      miners.push(address);
    }
  });
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
exports.countWorkers = function(shares) {
  let count = 0;
  const miners = [];
  shares = shares.map((share) => JSON.parse(share));
  shares.forEach((share) => {
    const address = share.worker;
    if (!(miners.includes(address))) {
      count += 1;
      miners.push(address);
    }
  });
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
    .sort((a, b) => (a.height - b.height));
  output.forEach((block) => (block.worker = block.worker.split('.')[0]));
  return output;
};

// Process Hashrate for API Endpoints
exports.processDifficulty = function(shares) {
  let count = 0;
  if (shares) {
    shares = shares.map((share) => JSON.parse(share));
    shares.forEach((share) => {
      count += parseFloat(share.difficulty);
    });
  }
  return count;
};

// Process Payments for API Endpoints
exports.processPayments = function(payments) {
  const output = {};
  if (payments) {
    Object.keys(payments).forEach((address) => {
      if (payments[address] > 0) {
        output[address] = parseFloat(payments[address]);
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
exports.processShares = function(shares) {
  const solo = {};
  const shared = {};
  if (shares) {
    Object.keys(shares).forEach((entry) => {
      const details = JSON.parse(entry);
      const address = details.worker.split('.')[0];
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
    });
  }
  return [solo, shared];
};

// Process Shares for API Endpoints
exports.processStatistics = function(statistics) {
  const output = {};
  if (statistics) {
    Object.keys(statistics).forEach((option) => {
      output[option] = parseFloat(statistics[option]);
    });
  }
  return output;
};

// Process Times for API Endpoints
exports.processTimes = function(times) {
  const output = {};
  if (times) {
    Object.keys(times).forEach((address) => {
      const amount = times[address];
      address = address.split('.')[0];
      if (times[address] > 0) {
        if (address in output) {
          output[address] += parseFloat(amount);
        } else {
          output[address] = parseFloat(amount);
        }
      }
    });
  }
  return output;
};

exports.processWorkers = function(shares) {
  const workers = [];
  if (shares) {
    shares.forEach((entry) => {
      const details = JSON.parse(entry);
      if (!(workers.includes(details.worker))) {
        workers.push(details.worker);
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
