/*
 *
 * PoolStratum (Updated)
 *
 */

const Stratum = require('blinkhash-stratum');

// Pool Stratum Main Function
const PoolStratum = function (logger, poolConfig, poolShares) {

    const _this = this;
    this.coin = poolConfig.coin.name;
    this.poolConfig = poolConfig;
    this.poolShares = poolShares;
    this.forkId = process.env.forkId;

    const logSystem = 'Pool';
    const logComponent = _this.coin;
    const logSubCat = `Thread ${ parseInt(_this.forkId) + 1 }`;

    // Determine Block Viability
    this.checkBlock = function(shareData, blockValid) {
        const serializedData = JSON.stringify(shareData);
        if (shareData.hash && !blockValid) {
            logger.debug(logSystem, logComponent, logSubCat, `We thought a block was found but it was rejected by the daemon: ${ serializedData }`);
        }
        else if (blockValid) {
            logger.debug(logSystem, logComponent, logSubCat, `Block found: ${ shareData.hash } by ${ shareData.worker }`);
        }
    }

    // Determine Share Viability
    this.checkShare = function(shareData, shareValid) {
        const serializedData = JSON.stringify(shareData);
        if (!shareValid) {
            logger.debug(logSystem, logComponent, logSubCat, `Share rejected by the daemon: ${ serializedData }`);
        }
        else {
            logger.debug(logSystem, logComponent, logSubCat, `Share accepted at difficulty ${ shareData.difficulty }/${ shareData.shareDiff } by ${ shareData.worker } [${ shareData.ip }]` );
        }
    }

    // Check for Valid Worker Address
    this.checkWorker = function(port, workerName, password, callback) {
        if (workerName.length === 40) {
            try {
                Buffer.from(workerName, 'hex');
                callback(true);
            }
            catch (e) {
                callback(false);
            }
        }
        else {
            _this.poolStratum.daemon.cmd('validateaddress', [workerName], (results) => {
                const isValid = results.filter((result) => {
                    return result.response.isvalid
                }).length > 0;
                callback(isValid);
            });
        }
    };

    // Build Pool from Configuration
    this.buildStratum = function() {

        // Initialize Pool
        const poolStratum = Stratum.createPool(_this.poolConfig, _this.authorizeWorker, logger);

        // Establish Main Emitter Handlers
        poolStratum.on('banIP',(ip, worker) => {
            process.send({ type: 'banIP', ip: ip });
        });
        poolStratum.on('difficultyUpdate', (workerName, diff) => {
            logger.debug(logSystem, logComponent, logSubCat, `Difficulty update to ${ diff } for worker: ${ JSON.stringify(workerName) }`);
        });
        poolStratum.on('log', (severity, text) => {
            logger[severity](logSystem, logComponent, logSubCat, text);
        })
        poolStratum.on('share', (shareData, shareValid, blockValid) => {
            _this.handleShares(shareData, shareValid, blockValid);
        });

        // Return Generated Pool
        return poolStratum
    }

    // Handle Worker Authentication
    this.authorizeWorker = function(ip, port, workerName, password, callback) {
        _this.checkWorker(port, workerName, password, (authorized) => {
            const authString = authorized ? 'Authorized' : 'Unauthorized ';
            logger.debug(logSystem, logComponent, logSubCat, `${ authString } ${ workerName }:${ password } [${ ip }]`);
            callback({ error: null, authorized: authorized, disconnect: false });
        });
    }

    // Handle Share Submissions
    this.handleShares = function(shareData, shareValid, blockValid) {
        _this.poolShares.start(shareData, shareValid, blockValid, () => {
            _this.checkBlock(shareData, blockValid);
            _this.checkShare(shareData, shareValid);
        }, () => {});
    }

    // Start Stratum Capabilities
    this.start = function() {
        const poolStratum = _this.buildStratum()
        _this.poolStratum = poolStratum;
        poolStratum.start();
    }
};

module.exports = PoolStratum;
