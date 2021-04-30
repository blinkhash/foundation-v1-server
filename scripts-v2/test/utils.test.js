/*
 *
 * Utils (Updated)
 *
 */

/* eslint-disable no-unused-vars */
const os = require('os');
const colors = require('colors');
const utils = require('../main/utils');

////////////////////////////////////////////////////////////////////////////////

describe('Test utility functionality', () => {

    test('Test implemented checkSoloMining [1]', () => {
        const data = { 'port': '3001' };
        const config = { 'ports': { '3001': { 'soloMining': true }}};
        expect(utils.checkSoloMining(config, data)).toBe(true);
    });

    test('Test implemented checkSoloMining [2]', () => {
        const data = { 'ports': { '3001': '' }};
        const config = { 'ports': { '3001': { 'soloMining': false }}};
        expect(utils.checkSoloMining(config, data)).toBe(false);
    });

    test('Test implemented checkSoloMining [3]', () => {
        const data = { 'port': '3001' };
        const config = { 'ports': { '3001': '' }};
        expect(utils.checkSoloMining(config, data)).toBe(false);
    });

    test('Test implemented checkSoloMining [4]', () => {
        const data = { 'port': '3002' };
        const config = { 'ports': { '3001': '' }};
        expect(utils.checkSoloMining(config, data)).toBe(false);
    });

    test('Test implemented countProcessForks [1]', () => {
        const config = { 'clustering': { 'enabled': false, 'forks': 'auto' }};
        expect(utils.countProcessForks(config)).toBe(1);
    });

    test('Test implemented countProcessForks [2]', () => {
        const config = { 'clustering': { 'enabled': true, 'forks': 'auto' }};
        expect(utils.countProcessForks(config)).toBe(os.cpus().length);
    });

    test('Test implemented countProcessForks [3]', () => {
        const config = { 'clustering': { 'enabled': true, 'forks': 2 }};
        expect(utils.countProcessForks(config)).toBe(2);
    });

    test('Test implemented countProcessForks [4]', () => {
        const config = { 'clustering': { 'enabled': true }};
        expect(utils.countProcessForks(config)).toBe(1);
    });

    test('Test implemented loggerSeverity', () => {
        expect(utils.loggerSeverity.debug).toBe(1);
        expect(utils.loggerSeverity.warning).toBe(2);
        expect(utils.loggerSeverity.error).toBe(3);
        expect(utils.loggerSeverity.special).toBe(4);
    });

    test('Test implemented loggerColors', () => {
        expect(utils.loggerColors('debug', `${'test'}`)).toBe('test'.green);
        expect(utils.loggerColors('warning', `${'test'}`)).toBe('test'.yellow);
        expect(utils.loggerColors('error', `${'test'}`)).toBe('test'.red);
        expect(utils.loggerColors('special', `${'test'}`)).toBe('test'.cyan.underline);
        expect(utils.loggerColors('other', `${'test'}`)).toBe('test'.italic);
    });

    test('Test implemented readFile', () => {
        const config = utils.readFile('example.json');
        expect(typeof config).toBe('object');
        expect(config.cliPort).toBe(42320);
        expect(config.redis).toStrictEqual({ host: '127.0.0.1', port: 6379, password: '' });
    });

    test('Test implemented roundTo', () => {
        expect(utils.roundTo(10.31831)).toBe(10);
        expect(utils.roundTo(10.9318)).toBe(11);
        expect(utils.roundTo(10.31831, 1)).toBe(10.3);
        expect(utils.roundTo(10.9318, 1)).toBe(10.9);
    });
});
