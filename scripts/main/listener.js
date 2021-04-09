/*
 *
 * PoolListener (Updated)
 *
 */

// Import Required Modules
var events = require('events');
var net = require('net');

// Pool Listener Main Function
var PoolListener = function (port) {

    // Establish Log
    var _this = this;
    var emitLog = function(text) {
        _this.emit('log', text);
    };

    // Start Listener Server
    this.start = function() {
        net.createServer(function(c) {
            var data = '';
            try {
                c.on('data', function (d) {
                    data += d;
                    if (data.slice(-1) === '\n') {
                        var message = JSON.parse(data);
                        _this.emit('command', message.command, message.params, message.options, function(message) {
                            c.end(message);
                        });
                    }
                });
                c.on('end', function() {});
                c.on('error', function() {});
            }
            catch(e) {
                emitLog(`CLI listener failed to parse message ${  data}`);
            }
        }).listen(port, '127.0.0.1', function() {
            emitLog(`CLI listening on port ${  port}`)
        });
    }
};

// Export Pool Listener
PoolListener.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = PoolListener;
