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

  test('Test implemented combineMiners [1]', () => {
    const shared = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const solo = [
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.combineMiners(shared, solo)).toBe(2);
  });

  test('Test implemented combineMiners [2]', () => {
    const shared = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.combineMiners(shared)).toBe(1);
  });

  test('Test implemented combineMiners [3]', () => {
    const solo = [
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.combineMiners(null, solo)).toBe(1);
  });

  test('Test implemented combineMiners [4]', () => {
    expect(utils.combineMiners(null)).toBe(0);
  });

  test('Test implemented countMiners [1]', () => {
    const shares = [
      { time: 1623901893182, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901919389, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 }];
    expect(utils.countMiners(shares)).toBe(1);
  });

  test('Test implemented countMiners [2]', () => {
    const shares = [
      { time: 1623901893182, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', solo: false, work: 8 },
      { time: 1623901919389, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 }];
    expect(utils.countMiners(shares)).toBe(1);
  });

  test('Test implemented countMiners [3]', () => {
    const shares = [
      { time: 1623901893182, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', solo: false, work: 8 },
      { time: 1623901919389, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1', solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1', solo: false, work: 8 }];
    expect(utils.countMiners(shares)).toBe(4);
  });

  test('Test implemented countMiners [4]', () => {
    const shares = [
      { time: 1623901893182, solo: false, work: 8 },
      { time: 1623901919389, solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1', solo: false, work: 8 }];
    expect(utils.countMiners(shares)).toBe(2);
  });

  test('Test implemented countMiners [5]', () => {
    expect(utils.countMiners(null)).toBe(0);
  });

  test('Test implemented countOccurences', () => {
    const array = [1, 5, 3, 2, 1, 2, 1, 1, 2, 3, 1];
    expect(utils.countOccurences(array, 1)).toBe(5);
    expect(utils.countOccurences(array, 2)).toBe(3);
    expect(utils.countOccurences(array, 5)).toBe(1);
  });

  test('Test implemented combineWorkers [1]', () => {
    const shared = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const solo = [
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.combineWorkers(shared, solo)).toBe(3);
  });

  test('Test implemented combineWorkers [2]', () => {
    const shared = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.combineWorkers(shared)).toBe(2);
  });

  test('Test implemented combineWorkers [3]', () => {
    const solo = [
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.combineWorkers(null, solo)).toBe(2);
  });

  test('Test implemented combineWorkers [4]', () => {
    expect(utils.combineWorkers(null)).toBe(0);
  });

  test('Test implemented countWorkers [1]', () => {
    const shares = [
      { time: 1623901893182, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901919389, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 }];
    expect(utils.countWorkers(shares)).toBe(1);
  });

  test('Test implemented countWorkers [2]', () => {
    const shares = [
      { time: 1623901893182, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', solo: false, work: 8 },
      { time: 1623901919389, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', solo: false, work: 8 }];
    expect(utils.countWorkers(shares)).toBe(2);
  });

  test('Test implemented countWorkers [3]', () => {
    const shares = [
      { time: 1623901893182, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', solo: false, work: 8 },
      { time: 1623901919389, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1', solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1', solo: false, work: 8 }];
    expect(utils.countWorkers(shares)).toBe(4);
  });

  test('Test implemented countWorkers [4]', () => {
    const shares = [
      { time: 1623901893182, solo: false, work: 8 },
      { time: 1623901919389, solo: false, work: 8 },
      { time: 1623901929800, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1', solo: false, work: 8 },
      { time: 1623901944054, worker: 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3d.worker1', solo: false, work: 8 }];
    expect(utils.countWorkers(shares)).toBe(2);
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

  test('Test implemented listBlocks [1]', () => {
    const blocks = [
      '{"time":1623901893182,"height":123456,"hash":"8de06f6e73dbff454023a95f29f87c3","reward":123,"transaction":"bc0b3f953ff408cfb298b034daf5ecd480","work":234,"luck":34.56,"worker":"miner2","solo":false,"round":"12345678"}',
      '{"time":1623901893183,"height":123457,"hash":"8de0623a95f29f6e73dbff4540f87c3","reward":123,"transaction":"b53ff408cfb298c0b3f9b034daf5ecd480","work":234,"luck":34.56,"worker":"miner1","solo":false,"round":"12345679"}',
      '{"time":1623901893184,"height":123458,"hash":"8de0bff4540236f6e73da95f29f87c3","reward":123,"transaction":"bc0b3f4daf5ecd4953ff408cfb298b0380","work":234,"luck":34.56,"worker":"miner1","solo":false,"round":"12345680"}'];
    const expected = [
      {'hash': '8de0bff4540236f6e73da95f29f87c3', 'height': 123458, 'luck': 34.56, 'reward': 123, 'round': '12345680', 'solo': false, 'time': 1623901893184, 'transaction': 'bc0b3f4daf5ecd4953ff408cfb298b0380', 'work': 234, 'worker': 'miner1'},
      {'hash': '8de0623a95f29f6e73dbff4540f87c3', 'height': 123457, 'luck': 34.56, 'reward': 123, 'round': '12345679', 'solo': false, 'time': 1623901893183, 'transaction': 'b53ff408cfb298c0b3f9b034daf5ecd480', 'work': 234, 'worker': 'miner1'}];
    const processed = utils.listBlocks(blocks, 'miner1');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listBlocks [2]', () => {
    const blocks = [
      '{"time":1623901893182,"height":123456,"hash":"8de06f6e73dbff454023a95f29f87c3","reward":123,"transaction":"bc0b3f953ff408cfb298b034daf5ecd480","work":234,"luck":34.56,"worker":"miner2","solo":false,"round":"12345678"}',
      '{"time":1623901893183,"height":123457,"hash":"8de0623a95f29f6e73dbff4540f87c3","reward":123,"transaction":"b53ff408cfb298c0b3f9b034daf5ecd480","work":234,"luck":34.56,"worker":"miner1","solo":false,"round":"12345679"}',
      '{"time":1623901893184,"height":123458,"hash":"8de0bff4540236f6e73da95f29f87c3","reward":123,"transaction":"bc0b3f4daf5ecd4953ff408cfb298b0380","work":234,"luck":34.56,"worker":"miner1","solo":false,"round":"12345680"}'];
    const processed = utils.listBlocks(blocks, 'miner3');
    expect(processed).toStrictEqual([]);
  });

  test('Test implemented listBlocks [3]', () => {
    const processed = utils.listBlocks(null, 'miner3');
    expect(processed).toStrictEqual([]);
  });

  test('Test implemented listIdentifiers [1]', () => {
    const shares = [
      '{"time":1623901893182,"identifier":"","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const expected = [''];
    const processed = utils.listIdentifiers(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listIdentifiers [2]', () => {
    const shares = [
      '{"time":1623901893182,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901893182,"identifier":"b","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const expected = ['a', 'b'];
    const processed = utils.listIdentifiers(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listIdentifiers [3]', () => {
    const shares = [
      '{"time":1623901893182,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901893182,"identifier":"","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const expected = ['a', ''];
    const processed = utils.listIdentifiers(shares);
    expect(processed).toStrictEqual(expected);
  });


  test('Test implemented listIdentifiers [4]', () => {
    const shares = [
      '{"time":1623901893182,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901893182,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const expected = ['a'];
    const processed = utils.listIdentifiers(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listIdentifiers [5]', () => {
    const processed = utils.listIdentifiers(null);
    expect(processed).toStrictEqual(['']);
  });

  test('Test implemented listIdentifiers [6]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    const expected = [''];
    const processed = utils.listIdentifiers(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [1]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'};
    const expected = ['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2'];
    const processed = utils.listWorkers(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [2]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"work":8}'};
    const expected = [
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2'];
    const processed = utils.listWorkers(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [3]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"work":8}'};
    const expected = [
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2'];
    const processed = utils.listWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [4]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"work":8}'};
    const expected = ['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1'];
    const processed = utils.listWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [5]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"work":8}'};
    const expected = ['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1'];
    const processed = utils.listWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [6]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901944054,"solo":false,"work":8}'};
    const expected = ['tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1'];
    const processed = utils.listWorkers(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented listWorkers [7]', () => {
    expect(utils.listWorkers(null)).toStrictEqual([]);
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
      '{"time":1623862569773,"height":1928702,"hash":"1a26babf21149764100660b6e75bff1e6d34926aa52366dc8323fa7456378943","reward":1250008474,"transaction":"61f857486100d35f5ccb447f55847924d463f7507c54882e5f518c6acdee7328","work":8,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false}',
      '{"time":1623901893184,"height":1928855,"hash":"f5026aa6116665d3e18a4219d9ae93dab3a016feee7921726258bedee418af8d","reward":1250006928,"transaction":"2c81c6aed147484ca41cd977338826875b5e142f94321b1a508b71f29e515a63","work":8,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false}'];
    const expected = [
      {'hash': 'f5026aa6116665d3e18a4219d9ae93dab3a016feee7921726258bedee418af8d', 'height': 1928855, 'reward': 1250006928, 'solo': false, 'time': 1623901893184, 'transaction': '2c81c6aed147484ca41cd977338826875b5e142f94321b1a508b71f29e515a63', 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a'},
      {'hash': '1a26babf21149764100660b6e75bff1e6d34926aa52366dc8323fa7456378943', 'height': 1928702, 'reward': 1250008474, 'solo': false, 'time': 1623862569773, 'transaction': '61f857486100d35f5ccb447f55847924d463f7507c54882e5f518c6acdee7328', 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a'}];
    const processed = utils.processBlocks(blocks);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processHistorical [1]', () => {
    const history = [
      '{"time":1644811914019,"hashrate":{"shared":0,"solo":0},"network":{"difficulty":"30.92082613006793","hashrate":"238159035.4426813"},"status":{"miners":0,"workers":0}}',
      '{"time":1644811916016,"hashrate":{"shared":0,"solo":0},"network":{"difficulty":"30.92082613006793","hashrate":"238159035.4426813"},"status":{"miners":0,"workers":0}}',
      '{"time":1644811918017,"hashrate":{"shared":0,"solo":0},"network":{"difficulty":"30.92082613006793","hashrate":"238159035.4426813"},"status":{"miners":0,"workers":0}}'];
    const processed = utils.processHistorical(history);
    const expected = [
      {'hashrate': {'shared': 0, 'solo': 0}, 'network': {'difficulty': '30.92082613006793', 'hashrate': '238159035.4426813'}, 'status': {'miners': 0, 'workers': 0}, 'time': 1644811914019},
      {'hashrate': {'shared': 0, 'solo': 0}, 'network': {'difficulty': '30.92082613006793', 'hashrate': '238159035.4426813'}, 'status': {'miners': 0, 'workers': 0}, 'time': 1644811916016},
      {'hashrate': {'shared': 0, 'solo': 0}, 'network': {'difficulty': '30.92082613006793', 'hashrate': '238159035.4426813'}, 'status': {'miners': 0, 'workers': 0}, 'time': 1644811918017}];
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processHistorical [2]', () => {
    expect(utils.processHistorical(null)).toStrictEqual([]);
  });

  test('Test implemented processIdentifiers [1]', () => {
    const multiplier = 10;
    const hashrateWindow = 10;
    const processed = utils.processIdentifiers(null, multiplier, hashrateWindow);
    const expected = [];
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processIdentifiers [2]', () => {
    const shares = [
      '{"time":1623901893182,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":20.15,"solo":false,"types":{"valid":1,"invalid":0,"stale":0},"work":8}'];
    const multiplier = 10;
    const hashrateWindow = 10;
    const processed = utils.processIdentifiers(shares, multiplier, hashrateWindow);
    const expected = [{'hashrate': 8,'identifier':'a'}];
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processLuck [1]', () => {
    const blocks = ['{"luck":101.43}', '{"luck":19.47}', '{"luck":47.56}', '{"luck":87.13}',
      '{"luck":423.71}', '{"luck":114.65}', '{"luck":237.15}', '{"luck":12.11}', '{"luck":54.67}',
      '{"luck":667.10}', '{"luck":9.14}', '{"luck":17.23}', '{"luck":551.41}', '{"luck":67.79}'];
    const processed = utils.processLuck(blocks, []);
    expect(processed.luck1).toBe(101.43);
    expect(processed.luck10).toBe(176.5);
    expect(processed.luck100).toBe(172.18);
  });

  test('Test implemented processLuck [2]', () => {
    const processed = utils.processLuck([], []);
    expect(processed.luck1).toBe(0);
    expect(processed.luck10).toBe(0);
    expect(processed.luck100).toBe(0);
  });

  test('Test implemented processLuck [3]', () => {
    const processed = utils.processLuck(['{"luck":101.43}'], []);
    expect(processed.luck1).toBe(101.43);
    expect(processed.luck10).toBe(101.43);
    expect(processed.luck100).toBe(101.43);
  });

  test('Test implemented processLuck [4]', () => {
    const pending = ['{"luck":101.43}', '{"luck":19.47}', '{"luck":47.56}', '{"luck":87.13}',
      '{"luck":423.71}', '{"luck":114.65}', '{"luck":237.15}', '{"luck":12.11}', '{"luck":54.67}',
      '{"luck":667.10}', '{"luck":9.14}', '{"luck":17.23}', '{"luck":551.41}', '{"luck":67.79}'];
    const confirmed = ['{"luck":222.55}'];
    const processed = utils.processLuck(pending, confirmed);
    expect(processed.luck1).toBe(101.43);
    expect(processed.luck10).toBe(176.5);
    expect(processed.luck100).toBe(175.54);
  });

  test('Test implemented processMiners [1]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":20.15,"solo":false,"types":{"valid":1,"invalid":0,"stale":0},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":18.75,"solo":false,"types":{"valid":1,"invalid":0,"stale":0},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","times":16.14,"solo":false,"types":{"valid":1,"invalid":1,"stale":0},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901949876,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","times":75.15,"solo":false,"types":{"valid":1,"invalid":0,"stale":0},"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901949876,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901893182, 'effort': null, 'hashrate': 0.02666666666666667, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a', 'shares': {'invalid': 0, 'stale': 0, 'valid': 1}, 'times': 20.15, 'work': 8},
      {"time": 1623901919389, 'effort': null, 'hashrate': 0.02666666666666667, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b', 'shares': {'invalid': 0, 'stale': 0, 'valid': 1}, 'times': 18.75, 'work': 8},
      {"time": 1623901949876, 'effort': null, 'hashrate': 0.05333333333333334, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c', 'shares': {'invalid': 1, 'stale': 0, 'valid': 2}, 'times': 75.15, 'work': 16}];
    const processed = utils.processMiners(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [2]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"effort":45.66}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8,"effort":76.12}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901919389, 'effort': null, 'hashrate': 0.02666666666666667, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': null, 'work': 8},
      {"time": 1623901944054, 'effort': null, 'hashrate': 0.05333333333333334, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': null, 'work': 16}];
    const processed = utils.processMiners(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [3]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":20.15,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":10.15,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":100.55,"solo":true,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","times":24.15,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","times":75.15,"solo":false,"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":0}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901893182, 'effort': null, 'hashrate': 0.02666666666666667, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20.15, 'work': 16},
      {"time": 1623901944054, 'effort': null, 'hashrate': 0.05333333333333334, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 75.15, 'work': 16}];
    const processed = utils.processMiners(shares, hashrate, 1, 300, true);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [4]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":20.15,"solo":false,"types":{},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":10.15,"solo":false,"types":{},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":100.55,"solo":true,"types":{},"work":0}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","times":24.15,"solo":false,"types":{},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901929799,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","times":75.15,"solo":false,"types":{},"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901893182, 'effort': null, 'hashrate': 0.02666666666666667, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20.15, 'work': 16},
      {"time": 1623901929800, 'effort': null, 'hashrate': 0.05333333333333334, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 75.15, 'work': 16}];
    const processed = utils.processMiners(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [5]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":0,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":0,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":20.15,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","times":20.15,"solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","times":18.17,"solo":false,"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901893182, 'effort': null, 'hashrate': 0.02666666666666667, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 0, 'work': 16},
      {"time": 1623901919389, 'effort': null, 'hashrate': 0, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20.15, 'work': 8},
      {"time": 1623901944054, 'effort': null, 'hashrate': 0.05333333333333334, 'miner': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20.15, 'work': 16}];
    const processed = utils.processMiners(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [6]', () => {
    const shares = {
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j","times":20.15,"solo":false,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","times":20530.15,"solo":false,"work":5517}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}'];
    const expected = [{"time": 1623901893182, 'effort': null, 'hashrate': 0.08, 'miner': 'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20530.15, 'work': 5713}];
    const processed = utils.processMiners(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [7]', () => {
    const shares = {
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker1': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker1","times":20.15,"solo":true,"effort":42.65,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker2': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker2","times":20.15,"solo":true,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker3': '{"time":1623901893185,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker3","times":77.15,"solo":true,"effort":95.65,"work":5517}'};
    const expected = [{"time": 1623901893185, 'effort': 138.3, 'hashrate': 0, 'miner': 'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 77.15, 'work': 5909}];
    const processed = utils.processMiners(shares, [], 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [7]', () => {
    const shares = {
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker1': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker1","times":20.15,"solo":true,"effort":42.65,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker2': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker2","times":20.15,"solo":true,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker3': '{"time":1623901893185,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.worker3","times":77.15,"solo":true,"effort":95.65,"work":5517}'};
    const expected = [{"time": 1623901893185, 'effort': 138.3, 'hashrate': 0, 'miner': 'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j', 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 77.15, 'work': 5909}];
    const processed = utils.processMiners(shares, [], 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processMiners [8]', () => {
    expect(utils.processMiners(null)).toStrictEqual([]);
  });

  test('Test implemented processPayments [1]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051'};
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 11.87468051,
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 11.87468051};
    const processed = utils.processPayments(payments);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processPayments [2]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051'};
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 11.87468051};
    const processed = utils.processPayments(payments, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processPayments [3]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c: '0'};
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 11.87468051,
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 11.87468051};
    const processed = utils.processPayments(payments);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processPayments [4]', () => {
    const payments = {
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a: 'test',
      tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b: '11.87468051'};
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 11.87468051};
    const processed = utils.processPayments(payments);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processPayments [5]', () => {
    expect(utils.processPayments(null)).toStrictEqual({});
  });

  test('Test implemented processRecords', () => {
    const records = [
      '{"time":1643679193061,"paid":284.9976,"transaction":"6105c705c2db1b4835083e57b6a8ed146681354c628afb08c818472bd392010b"}',
      '{"time":1643679193061,"paid":288.9976,"transaction":"6105c705c2db1b4835083e57b6a8ed146681354c628afb08c818472bd392010c"}'];
    const expected = [
      {'paid': 284.9976, 'time': 1643679193061, 'transaction': '6105c705c2db1b4835083e57b6a8ed146681354c628afb08c818472bd392010b'},
      {'paid': 288.9976, 'time': 1643679193061, 'transaction': '6105c705c2db1b4835083e57b6a8ed146681354c628afb08c818472bd392010c'}];
    const processed = utils.processRecords(records);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processShares [1]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","work":24,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","work":16,"effort":41.65}',
    };
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 24,
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 16};
    const processed = utils.processShares(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processShares [2]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","work":16,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 16};
    const processed = utils.processShares(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processShares [3]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","work":0,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","work":8,"effort":43.11}',
    };
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 8,
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 24};
    const processed = utils.processShares(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processShares [4]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': 8};
    const processed = utils.processShares(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', 'worker');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processShares [5]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","work":"blah","effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","work":8,"effort":43.11}',
    };
    const processed = utils.processShares(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1');
    expect(processed).toStrictEqual({});
  });

  test('Test implemented processShares [6]', () => {
    const processed = utils.processShares(null);
    expect(processed).toStrictEqual({});
  });

  test('Test implemented processTimes [1]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":20,"work":24,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","times":15,"work":16,"effort":41.65}',
    };
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 20,
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 15};
    const processed = utils.processTimes(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTimes [2]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":20.531,"work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","times":210,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":13.40,"work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","times":20,"work":16,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 210};
    const processed = utils.processTimes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTimes [3]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":2130,"work":0,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","times":200.03,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":1389.33,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","times":38.33,"work":8,"effort":43.11}',
    };
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 2130,
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': 1389.33};
    const processed = utils.processTimes(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTimes [4]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":3320,"work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","times":1.20,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":3.120,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","times":244.30,"work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': 3320};
    const processed = utils.processTimes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', 'worker');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTimes [5]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":38,"work":"blah","effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","times":398.3,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":910.1,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","times":20,"work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': 38};
    const processed = utils.processTimes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', 'worker');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTimes [6]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":"test","work":"blah","effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","times":398.3,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","times":910.1,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","times":-1,"work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': 398.3};
    const processed = utils.processTimes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTimes [7]', () => {
    const processed = utils.processTimes(null);
    expect(processed).toStrictEqual({});
  });

  test('Test implemented processTypes [1]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","types":{"valid":10, "invalid":0, "stale": 0},"times":20,"work":24,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569778,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","types":{"valid":15, "invalid":1, "stale": 0},"times":15,"work":16,"effort":41.65}',
    };
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': {'invalid': 0, 'stale': 0, 'valid': 10},
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': {'invalid': 1, 'stale': 0, 'valid': 15}};
    const processed = utils.processTypes(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTypes [2]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","types":{"valid":103, "invalid":1, "stale": 0},"times":20.531,"work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","types":{"valid":20, "invalid":2, "stale": 1},"times":210,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","types":{"valid":531, "invalid":1, "stale": 1},"times":13.40,"work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","types":{"valid":5, "invalid":1, "stale": 0},"times":20,"work":16,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': {'invalid': 3, 'stale': 1, 'valid': 123}};
    const processed = utils.processTypes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTypes [3]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","types":{"valid":106, "invalid":5, "stale": 0},"times":2130,"work":0,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","types":{"valid":330, "invalid":1, "stale": 3},"times":200.03,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","types":{"valid":1, "invalid":0, "stale": 0},"times":1389.33,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","types":{"valid":5, "invalid":0, "stale": 0},"times":38.33,"work":8,"effort":43.11}',
    };
    const expected = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': {'invalid': 6, 'stale': 3, 'valid': 436},
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b': {'invalid': 0, 'stale': 0, 'valid': 6}};
    const processed = utils.processTypes(shares);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTypes [4]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","types":{"valid":50, "invalid":0, "stale": 0},"times":3320,"work":8,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","types":{"valid":333, "invalid":5, "stale": 2},"times":1.20,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","types":{"valid":47, "invalid":0, "stale": 0},"times":3.120,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","types":{"valid":53, "invalid":0, "stale": 0},"times":244.30,"work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': {'invalid': 0, 'stale': 0, 'valid': 50}};
    const processed = utils.processTypes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', 'worker');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTypes [5]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","times":38,"work":"blah","effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","types":{"valid":147, "invalid":3},"times":398.3,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","types":{"valid":133, "stale": 0},"times":910.1,"work":16,"effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","types":{"invalid":0},"times":20,"work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': {'invalid': 0, 'stale': 0, 'valid': 0}};
    const processed = utils.processTypes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', 'worker');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTypes [6]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","types":{"valid":133, "invalid":0, "stale": 0},"times":38,"work":"blah","effort":42.16}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","times":398.3,"work":8,"effort":43.11}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker3': '{"time":1623862569772,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker3","times":398.3,"work":8,"effort":43.11}',
    };
    const expected = {'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a': {'invalid': 0, 'stale': 0, 'valid': 133}};
    const processed = utils.processTypes(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a');
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processTypes [7]', () => {
    const processed = utils.processTypes(null);
    expect(processed).toStrictEqual({});
  });

  test('Test implemented processWork [1]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.processWork(shares)).toBe(32);
  });

  test('Test implemented processWork [2]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', 'worker')).toBe(16);
  });

  test('Test implemented processWork [3]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', 'worker')).toBe(8);
  });

  test('Test implemented processWork [4]', () => {
    const shares = [
      '{"time":1623901893182,"solo":false,"work":8}',
      '{"time":1623901919389,"solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1', 'worker')).toBe(8);
  });

  test('Test implemented processWork [5]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":"test"}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":"test"}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', 'worker')).toBe(16);
  });

  test('Test implemented processWork [6]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2', 'worker')).toBe(32);
  });

  test('Test implemented processWork [7]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a', 'miner')).toBe(32);
  });

  test('Test implemented processWork [8]', () => {
    const shares = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.processWork(shares, 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a', 'worker')).toBe(0);
  });

  test('Test implemented processWork [9]', () => {
    expect(utils.processWork(null)).toBe(0);
  });

  test('Test implemented processWork [10]', () => {
    const shares = [
      '{"time":1623901893182,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901919389,"identifier":"a","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901929800,"identifier":"","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"identifier":"","worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker2","solo":false,"work":8}'];
    expect(utils.processWork(shares, null, null, 'a')).toBe(16);
  });

  test('Test implemented processWorkers [1]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"times":20.15,"types":{"valid":1,"invalid":0,"stale":0},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"times":18.75,"types":{"valid":1,"invalid":0,"stale":0},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"times":16.14,"types":{"valid":1,"invalid":0,"stale":0},"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901998765,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"times":75.15,"types":{"valid":1,"invalid":0,"stale":1},"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901893182, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 1}, 'times': 20.15, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1'},
      {"time": 1623901919389, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 1}, 'times': 18.75, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1'},
      {"time": 1623901929800, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 1}, 'times': 16.14, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1'},
      {"time": 1623901998765, 'effort': null, 'hashrate': 0.05333333333333334, 'shares': {'invalid': 0, 'stale': 1, 'valid': 1}, 'times': 75.15, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2'}];
    const processed = utils.processWorkers(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processWorkers [2]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":true,"work":8,"effort":16.15}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"work":8}',
      '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time": 1623901893182, 'effort': 16.15, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': null, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1'},
      {"time": 1623901929800, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': null, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1'},
      {"time": 1623901944054, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': null, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2'}];
    const processed = utils.processWorkers(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processWorkers [3]', () => {
    const shares = {
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1': '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"times":20.15,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1': '{"time":1623901919389,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3b.worker1","solo":false,"times":0,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1': '{"time":1623901929800,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker1","solo":false,"times":0,"work":8}',
      'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2': '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"times":75.15,"work":8}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2","solo":false,"work":8}'];
    const expected = [
      {"time":1623901893182, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20.15, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3a.worker1'},
      {"time":1623901944054, 'effort': null, 'hashrate': 0.02666666666666667, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 75.15, 'work': 8, 'worker': 'tltc1qkek8r3uymzqyajzezqgl84u08c0z8shjuwqv3c.worker2'}];
    const processed = utils.processWorkers(shares, hashrate, 1, 300, true);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processWorkers [4]', () => {
    const shares = {
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j","solo":false,"times":20.15,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"times":20530.15,"work":5517}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}'];
    const expected = [{"time":1623901893182, 'effort': null, 'hashrate': 0.08, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20530.15, 'work': 5517, 'worker': 'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR'}];
    const processed = utils.processWorkers(shares, hashrate, 1, 300, true);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processWorkers [5]', () => {
    const shares = {
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j","solo":false,"times":20.15,"work":196}',
      'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR': '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"times":20530.15,"work":5517}'};
    const hashrate = [
      '{"time":1623901893182,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}',
      '{"time":1623901944054,"worker":"RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR","solo":false,"work":8}'];
    const expected = [
      {"time":1623901893182, 'effort': null, 'hashrate': 0, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20.15, 'work': 196, 'worker': 'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j'},
      {"time":1623901893182, 'effort': null, 'hashrate': 0.08, 'shares': {'invalid': 0, 'stale': 0, 'valid': 0}, 'times': 20530.15, 'work': 5517, 'worker': 'RFeE924XmUhqJqUpRJykryxumNBwiMfZ4j.minerLHR'}];
    const processed = utils.processWorkers(shares, hashrate, 1, 300, false);
    expect(processed).toStrictEqual(expected);
  });

  test('Test implemented processWorkers [6]', () => {
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
