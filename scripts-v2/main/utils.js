/*
 *
 * Utils (Updated)
 *
 */

const fs = require('fs');
const os = require('os');

////////////////////////////////////////////////////////////////////////////////

// Override JSON Minify Functionality
JSON.minify = JSON.minify || require('node-json-minify');

// Check to see if Solo Mining
exports.checkSoloMining = function(poolConfig, data) {
    let isSoloMining = false;
    if (typeof poolConfig.ports[data.port] !== 'undefined') {
        if (poolConfig.ports[data.port].soloMining) {
            isSoloMining = true;
        }
    }
    return isSoloMining;
};

// Count Number of Process Forks
exports.countProcessForks = function(portalConfig) {
    if (!portalConfig.clustering || !portalConfig.clustering.enabled) {
        return 1;
    }
    else if (portalConfig.clustering.forks === 'auto') {
        return os.cpus().length;
    }
    else if (!portalConfig.clustering.forks || isNaN(portalConfig.clustering.forks)) {
        return 1;
    }
    return portalConfig.clustering.forks;
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
        return text.cyan.underline;
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
    const test =(Math.round(n) / multiplicator);
    return +(test.toFixed(digits));
};
