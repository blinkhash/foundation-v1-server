/*
 *
 * Builder (Updated)
 *
 */

const PoolBuilder = require('../main/builder');
const PoolLogger = require('../main/logger');
const portalConfig = require('../../configs/main/example.js');
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test builder functionality', () => {

    test('Test initialization of builder', () => {
        const configCopy = Object.assign({}, portalConfig);
        const poolBuilder = new PoolBuilder(logger, configCopy);
        expect(typeof poolBuilder.portalConfig).toBe('object');
        expect(typeof poolBuilder.createPoolWorker).toBe('function');
        expect(typeof poolBuilder.setupPoolWorkers).toBe('function');
    });
});
