/*
 *
 * Utils (Updated)
 *
 */

const fs = require('fs');
const os = require('os');

// Override JSON Minify Functionality
JSON.minify = JSON.minify || require("node-json-minify");

// Check to see if Solo Mining
exports.checkSoloMining = function(config, data) {
    let isSoloMining = false;
    if (typeof config.ports[data.port] !== "undefined") {
        if (config.ports[data.port].soloMining) {
            isSoloMining = true;
        }
    }
    return isSoloMining;
}

// Count Number of Process Forks
exports.countProcessForks = function(config) {
    if (!config.clustering || !config.clustering.enabled) {
        return 1;
    }
    else if (config.clustering.forks === "auto") {
        return os.cpus().length;
    }
    else if (!config.clustering.forks || isNaN(config.clustering.forks)) {
        return 1;
    }
    return config.clustering.forks
}

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

// Read File Given Path
exports.readFile = function(path) {
  return JSON.parse(JSON.minify(fs.readFileSync(path, { encoding: 'utf8' })));
}

// Round to # of Digits Given
exports.roundTo = function(n, digits) {
    if (digits === undefined) {
        digits = 0;
    }
    const multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    const test =(Math.round(n) / multiplicator);
    return +(test.toFixed(digits));
}
