/*
 *
 * PoolLogger (Updated)
 *
 */

// Import Required Modules
var dateFormat = require('dateformat');
var colors = require('colors');

// Establish Severity Values
var severityValues = {
    'debug': 1,
    'warning': 2,
    'error': 3,
    'special': 4
};

// Indicate Severity By Colors
var severityColors = function(severity, text) {
    switch (severity) {
        case 'special':
            return text.cyan.underline;
        case 'debug':
            return text.green;
        case 'warning':
            return text.yellow;
        case 'error':
            return text.red;
        default:
            console.log(`Unknown severity ${  severity}`);
            return text.italic;
    }
};

// Pool Logger Main Function
var PoolLogger = function (configuration) {

    // Establish Initial Severity
    var logLevelInt = severityValues[configuration.logLevel];
    var logColors = configuration.logColors;

    // Establish Log Main Functon
    var log = function(severity, system, component, text, subcat) {

        // Check Regarding Current Severity Valued
        if (severityValues[severity] < logLevelInt) return;

        // Check if SubCategory
        if (subcat) {
            var realText = subcat;
            var realSubCat = text;
            text = realText;
            subcat = realSubCat;
        }

        // Manage Logger Message
        var entryDesc = `${dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')  } [${  system  }]\t`;
        if (logColors) {
            entryDesc = severityColors(severity, entryDesc);
            // Format Logger Message
            var logString = entryDesc + (`[${  component  }] `).italic;
            if (subcat)
                logString += (`(${  subcat  }) `).bold.grey;
            logString += text.grey;
        }
        else {
            // Format Logger Message
            var logString = `${entryDesc  }[${  component  }] `;
            if (subcat)
                logString += `(${  subcat  }) `;
            logString += text;
        }

        // Print Formatted Logger Message
        console.log(logString);
    };

    // Manage Logger Messages
    var _this = this;
    Object.keys(severityValues).forEach(function(logType) {
        _this[logType] = function() {
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift(logType);
            log.apply(this, args);
        };
    });

};

// Export Pool Logger
module.exports = PoolLogger;
