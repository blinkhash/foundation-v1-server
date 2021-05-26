/*
 *
 * Utils (Updated)
 *
 */

/* eslint-disable-next-line no-unused-vars */
const colors = require('colors');
const os = require('os');
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

  test('Test implemented coinsRound', () => {
    expect(utils.coinsRound(10.103091, 2)).toBe(10.10);
    expect(utils.coinsRound(198.1313, 3)).toBe(198.131);
    expect(utils.coinsRound(2020.31933, 2)).toBe(2020.32);
    expect(utils.coinsRound(18.1131, 1)).toBe(18.1);
    expect(utils.coinsRound(461.931, 0)).toBe(462);
  });

  test('Test implemented coinsToSatoshis', () => {
    expect(utils.coinsToSatoshis(5, 100)).toBe(500);
    expect(utils.coinsToSatoshis(8, 1000)).toBe(8000);
    expect(utils.coinsToSatoshis(13, 1000)).toBe(13000);
    expect(utils.coinsToSatoshis(100, 10)).toBe(1000);
    expect(utils.coinsToSatoshis(15, 100)).toBe(1500);
  });

  test('Test implemented countOccurences', () => {
    const array = [1, 5, 3, 2, 1, 2, 1, 1, 2, 3, 1];
    expect(utils.countOccurences(array, 1)).toBe(5);
    expect(utils.countOccurences(array, 2)).toBe(3);
    expect(utils.countOccurences(array, 5)).toBe(1);
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
    expect(utils.loggerColors('special', `${'test'}`)).toBe('test'.cyan);
    expect(utils.loggerColors('other', `${'test'}`)).toBe('test'.italic);
  });

  test('Test implemented satoshisToCoins', () => {
    expect(utils.satoshisToCoins(1500, 1000, 0)).toBe(2);
    expect(utils.satoshisToCoins(200, 500, 1)).toBe(0.4);
    expect(utils.satoshisToCoins(40, 80, 2)).toBe(0.50);
    expect(utils.satoshisToCoins(900, 90000, 1)).toBe(0.0);
  });

  test('Test implemented roundTo', () => {
    expect(utils.roundTo(10.31831)).toBe(10);
    expect(utils.roundTo(10.9318)).toBe(11);
    expect(utils.roundTo(10.31831, 1)).toBe(10.3);
    expect(utils.roundTo(10.9318, 1)).toBe(10.9);
  });
});
