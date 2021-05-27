/*
 *
 * Utils (Updated)
 *
 */

const os = require('os');

////////////////////////////////////////////////////////////////////////////////

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

// Count Occurences of Value in Array
exports.countOccurences = function(array, value) {
  let count = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i] === value)
      count += 1;
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

// Convert Satoshis to Coins
exports.satoshisToCoins = function(satoshis, magnitude, precision) {
  return exports.roundTo((satoshis / magnitude), precision);
};

// Severity Mapping Values
exports.loggerSeverity = {
  'debug': 1,
  'warning': 2,
  'error': 3,
  'special': 4
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
