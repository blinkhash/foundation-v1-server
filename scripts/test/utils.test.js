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

  test('Test implemented calculateAverage', () => {
    const data = [{ luck: 101.43 }, { luck: 19.47 }, { luck: 47.56 }, { luck: 87.13 },
      { luck: 423.71 }, { luck: 114.65 }, { luck: 237.15 }, { luck: 12.11 }, { luck: 54.67 },
      { luck: 667.10 }, { luck: 9.14 }, { luck: 17.23 }, { luck: 551.41 }, { luck: 67.79 }];
    expect(utils.calculateAverage(data, 'luck')).toBe(172.18);
    expect(utils.calculateAverage([], 'luck')).toBe(0);
    expect(utils.calculateAverage([{ luck: null }], 'luck')).toBe(0);
  });

  test('Test implemented checkNumber', () => {
    expect(utils.checkNumber('1')).toBe(true);
    expect(utils.checkNumber('test')).toBe(false);
    expect(utils.checkNumber('2.05')).toBe(true);
    expect(utils.checkNumber('73')).toBe(true);
    expect(utils.checkNumber('73a')).toBe(false);
    expect(utils.checkNumber(5353)).toBe(false);
  });

  test('Test implemented checkSoloMining [1]', () => {
    const data = { 'port': '3001' };
    const config = { 'ports': [{ 'port': '3001', 'type': 'solo' }]};
    expect(utils.checkSoloMining(config, data)).toBe(true);
  });

  test('Test implemented checkSoloMining [2]', () => {
    const data = { 'ports': { '3001': '' }};
    const config = { 'ports': [{ 'port': '3001', 'type': 'shared' }]};
    expect(utils.checkSoloMining(config, data)).toBe(false);
  });

  test('Test implemented checkSoloMining [3]', () => {
    const data = { 'port': '3001' };
    const config = { 'ports': [{ 'port': '3001' }]};
    expect(utils.checkSoloMining(config, data)).toBe(false);
  });

  test('Test implemented checkSoloMining [4]', () => {
    const data = { 'port': '3002' };
    const config = { 'ports': [{ 'port': '3001', 'type': 'solo' }]};
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

  test('Test implemented countMiners [1]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    expect(utils.countMiners(shares)).toBe(1);
  });

  test('Test implemented countMiners [2]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    expect(utils.countMiners(shares)).toBe(1);
  });

  test('Test implemented countMiners [3]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1","solo":false,"difficulty":8}'];
    expect(utils.countMiners(shares)).toBe(4);
  });

  test('Test implemented countMiners [4]', () => {
    expect(utils.countMiners(null)).toBe(0);
  });

  test('Test implemented countOccurences', () => {
    const array = [1, 5, 3, 2, 1, 2, 1, 1, 2, 3, 1];
    expect(utils.countOccurences(array, 1)).toBe(5);
    expect(utils.countOccurences(array, 2)).toBe(3);
    expect(utils.countOccurences(array, 5)).toBe(1);
  });

  test('Test implemented countWorkers [1]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    expect(utils.countWorkers(shares)).toBe(1);
  });

  test('Test implemented countWorkers [2]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    expect(utils.countWorkers(shares)).toBe(2);
  });

  test('Test implemented countWorkers [3]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1","solo":false,"difficulty":8}'];
    expect(utils.countWorkers(shares)).toBe(4);
  });

  test('Test implemented countWorkers [4]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1","solo":false,"difficulty":8}'];
    expect(utils.countWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a')).toBe(1);
  });

  test('Test implemented countWorkers [5]', () => {
    expect(utils.countWorkers(null)).toBe(0);
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

  test('Test implemented processBlocks', () => {
    const blocks = [
      '{"time":1623862569773,"height":1928702,"hash":"1a26babf21149764100660b6e75bff1e6d34926aa52366dc8323fa7456378943","reward":1250008474,"transaction":"61f857486100d35f5ccb447f55847924d463f7507c54882e5f518c6acdee7328","difficulty":8,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false}',
      '{"time":1623901893184,"height":1928855,"hash":"f5026aa6116665d3e18a4219d9ae93dab3a016feee7921726258bedee418af8d","reward":1250006928,"transaction":"2c81c6aed147484ca41cd977338826875b5e142f94321b1a508b71f29e515a63","difficulty":8,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false}'];
    const processed = utils.processBlocks(blocks);
    expect(processed.length).toBe(2);
    expect(processed[0].height).toBe(1928855);
    expect(processed[0].hash).toBe('f5026aa6116665d3e18a4219d9ae93dab3a016feee7921726258bedee418af8d');
    expect(processed[1].worker).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
  });

  test('Test implemented processDifficulty [1]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    expect(utils.processDifficulty(shares)).toBe(32);
  });

  test('Test implemented processDifficulty [2]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}'];
    expect(utils.processDifficulty(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2')).toBe(16);
  });

  test('Test implemented processDifficulty [3]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}'];
    expect(utils.processDifficulty(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a')).toBe(16);
  });

  test('Test implemented processDifficulty [4]', () => {
    expect(utils.processDifficulty(null)).toBe(0);
  });

  test('Test implemented processLuck [1]', () => {
    const blocks = ['{"luck":101.43}', '{"luck":19.47}', '{"luck":47.56}', '{"luck":87.13}',
      '{"luck":423.71}', '{"luck":114.65}', '{"luck":237.15}', '{"luck":12.11}', '{"luck":54.67}',
      '{"luck":667.10}', '{"luck":9.14}', '{"luck":17.23}', '{"luck":551.41}', '{"luck":67.79}'];
    const processed = utils.processLuck(blocks);
    expect(processed.luck1).toBe(101.43);
    expect(processed.luck10).toBe(176.5);
    expect(processed.luck100).toBe(172.18);
  });

  test('Test implemented processLuck [2]', () => {
    const processed = utils.processLuck([]);
    expect(processed.luck1).toBe(0);
    expect(processed.luck10).toBe(0);
    expect(processed.luck100).toBe(0);
  });

  test('Test implemented processLuck [3]', () => {
    const processed = utils.processLuck(['{"luck":101.43}']);
    expect(processed.luck1).toBe(101.43);
    expect(processed.luck10).toBe(101.43);
    expect(processed.luck100).toBe(101.43);
  });

  test('Test implemented processMiners [1]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    const processed = utils.processMiners(shares);
    expect(processed.length).toBe(1);
    expect(processed[0]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
  });

  test('Test implemented processMiners [2]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}'];
    const processed = utils.processMiners(shares);
    expect(processed.length).toBe(2);
    expect(processed[0]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed[1]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b');
  });

  test('Test implemented processMiners [3]', () => {
    expect(utils.processMiners(null)).toStrictEqual([]);
  });

  test('Test implemented processPayments [1]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051'};
    const processed = utils.processPayments(payments);
    expect(Object.keys(processed).length).toBe(2);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(11.87468051);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(11.87468051);
  });

  test('Test implemented processPayments [2]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051'};
    const processed = utils.processPayments(payments, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(Object.keys(processed).length).toBe(1);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(11.87468051);
  });

  test('Test implemented processPayments [3]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c: '0'};
    const processed = utils.processPayments(payments);
    expect(Object.keys(processed).length).toBe(2);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(11.87468051);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(11.87468051);
  });

  test('Test implemented processPayments [4]', () => {
    expect(utils.processPayments(null)).toStrictEqual({});
  });

  test('Test implemented processRecords', () => {
    const records = [
      '{"time":1623883249513,"paid":11.8746,"transaction":"31f5978a31a2bac842e383170b019e17415c12fd425f155269bafe7b4bb00a21","records":{"1928656":{"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a":{"times":118.44,"shares":81.84905658,"amounts":11.8746}}}}',
      '{"time":1623883249510,"paid":11.8749,"transaction":"31f5978a31a2bac842e383170b019e17415c12fd425f155269bafe7b4bb00a22","records":{"1928657":{"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b":{"times":93.44,"shares":81.89905658,"amounts":11.8146}}}}'];
    const processed = utils.processRecords(records);
    expect(processed.length).toBe(2);
    expect(processed[0].paid).toBe(11.8749);
    expect(processed[0].transaction).toBe('31f5978a31a2bac842e383170b019e17415c12fd425f155269bafe7b4bb00a22');
    expect(processed[1].transaction).toBe('31f5978a31a2bac842e383170b019e17415c12fd425f155269bafe7b4bb00a21');
  });

  test('Test implemented processShares [1]', () => {
    const shares = {
      '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":true,"difficulty":8}': '16'
    };
    const processed = utils.processShares(shares);
    expect(Object.keys(processed).length).toBe(2);
    expect(Object.keys(processed[0]).length).toBe(1);
    expect(Object.keys(processed[1]).length).toBe(2);
    expect(processed[0]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(16);
    expect(processed[1]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(16);
    expect(processed[1]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(8);
  });

  test('Test implemented processShares [2]', () => {
    const shares = {
      '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":true,"difficulty":8}': '16'
    };
    const processed = utils.processShares(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(Object.keys(processed).length).toBe(2);
    expect(Object.keys(processed[0]).length).toBe(0);
    expect(Object.keys(processed[1]).length).toBe(1);
    expect(processed[1]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(16);
  });

  test('Test implemented processShares [3]', () => {
    const shares = {
      '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}': '0',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":true,"difficulty":8}': '16',
      '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":true,"difficulty":8}': '8'
    };
    const processed = utils.processShares(shares);
    expect(Object.keys(processed).length).toBe(2);
    expect(Object.keys(processed[0]).length).toBe(1);
    expect(Object.keys(processed[1]).length).toBe(2);
    expect(processed[0]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(24);
    expect(processed[1]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(8);
    expect(processed[1]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(8);
  });

  test('Test implemented processShares [4]', () => {
    const shares = {
      '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569776,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}': '8',
      '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":true,"difficulty":8}': '16'
    };
    const processed = utils.processShares(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(Object.keys(processed).length).toBe(2);
    expect(Object.keys(processed[0]).length).toBe(0);
    expect(Object.keys(processed[1]).length).toBe(1);
    expect(processed[1]['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1']).toBe(8);
  });

  test('Test implemented processShares [5]', () => {
    const processed = utils.processShares(null);
    expect(Object.keys(processed).length).toBe(2);
    expect(Object.keys(processed[0]).length).toBe(0);
    expect(Object.keys(processed[1]).length).toBe(0);
  });

  test('Test implemented processTimes [1]', () => {
    const times = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '0',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '100.15',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '56.43',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '10.15'};
    const processed = utils.processTimes(times);
    expect(Object.keys(processed).length).toBe(2);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(100.15);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(56.43);
  });

  test('Test implemented processTimes [2]', () => {
    const times = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '40.33',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '100.15',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '56.43',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '10.15'};
    const processed = utils.processTimes(times);
    expect(Object.keys(processed).length).toBe(2);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(100.15);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b']).toBe(56.43);
  });

  test('Test implemented processTimes [3]', () => {
    const times = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '40.33',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '100.15',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '56.43',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '10.15'};
    const processed = utils.processTimes(times, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(Object.keys(processed).length).toBe(1);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a']).toBe(100.15);
  });

  test('Test implemented processTimes [4]', () => {
    const times = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '40.33',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '100.15',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '56.43',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '10.15'};
    const processed = utils.processTimes(times, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(Object.keys(processed).length).toBe(1);
    expect(processed['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1']).toBe(40.33);
  });

  test('Test implemented processTimes [5]', () => {
    expect(utils.processTimes(null)).toStrictEqual({});
  });

  test('Test implemented processWorkers [1]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}'];
    const processed = utils.processWorkers(shares);
    expect(processed.length).toBe(1);
    expect(processed[0]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2');
  });

  test('Test implemented processWorkers [2]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}'];
    const processed = utils.processWorkers(shares);
    expect(processed.length).toBe(3);
    expect(processed[0]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(processed[1]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2');
    expect(processed[2]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2');
  });

  test('Test implemented processWorkers [3]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}'];
    const processed = utils.processWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed.length).toBe(2);
    expect(processed[0]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(processed[1]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2');
  });

  test('Test implemented processWorkers [4]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"difficulty":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"difficulty":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"difficulty":8}'];
    const processed = utils.processWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(processed.length).toBe(1);
    expect(processed[0]).toBe('tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
  });

  test('Test implemented processWorkers [5]', () => {
    expect(utils.processWorkers(null)).toStrictEqual([]);
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

  test('Test implemented validateInput', () => {
    expect(utils.validateInput('test')).toBe('test');
    expect(utils.validateInput('example!@#$%^&')).toBe('example');
    expect(utils.validateInput('')).toBe('');
  });
});
