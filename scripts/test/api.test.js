/*
 *
 * API (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const events = require('events');
const partnerConfig = require('../../configs/partners/example.js');
const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');
const PoolApi = require('../main/api');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

const partnerConfigs = { Blinkhash: partnerConfig };
const poolConfigs = { Pool1: poolConfig };

////////////////////////////////////////////////////////////////////////////////

function mockRequest(pool, endpoint, method) {
  return {
    params: { pool: pool, endpoint: endpoint },
    query: { method: method }
  };
}

function mockResponse() {
  const response = new events.EventEmitter();
  response.writeHead = (code, headers) => {
    response.emit('header', [code, headers]);
  };
  response.end = (payload) => response.emit('end', payload);
  return response;
}

function mockBuildBlock(height, hash, reward, transaction, difficulty, worker, solo) {
  return JSON.stringify({
    height: height,
    hash: hash,
    reward: reward,
    transaction: transaction,
    difficulty: difficulty,
    worker: worker,
    solo: solo,
  });
}

function mockSetupClient(client, commands, pool, callback) {
  client.multi(commands).exec(() => callback());
}

////////////////////////////////////////////////////////////////////////////////

describe('Test API functionality', () => {

  beforeEach((done) => {
    client.flushall(() => done());
  });

  test('Test initialization of API', () => {
    const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
    expect(typeof poolApi.handleBlocksConfirmed).toBe('function');
    expect(typeof poolApi.messages).toBe('object');
    expect(poolApi.messages.success.code).toBe(200);
    expect(poolApi.messages.invalid.message).toBe('The server was unable to handle your request. Verify your input or try again later.');
  });

  test('Test unknownPool API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('');
      expect(processed.coins).toStrictEqual([]);
      expect(processed.logo).toBe('');
      expect(processed.coins).toStrictEqual([]);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/unknown');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested pool was not found. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest();
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test unknownMethod API endpoint [1]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/unknown');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested method is not currently supported. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'unknown', 'unknown');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test unknownMethod API endpoint [2]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual([]);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/unknown');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested method is not currently supported. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'unknown', 'unknown');
      const poolConfigsCopy = JSON.parse(JSON.stringify(poolConfigs));
      delete poolConfigsCopy.Pool1.coins;
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigsCopy, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test request without parameters', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.endpoint).toBe('/unknown');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested pool was not found. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = {};
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocksConfirmed API endpoint', (done) => {
    const commands = [
      ['sadd', 'Pool1:blocks:primary:confirmed', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:confirmed', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:confirmed', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:confirmed', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:confirmed', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:confirmed', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/blocks/confirmed');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(Object.keys(processed.data).length).toBe(2);
      expect(processed.data.primary.length).toBe(4);
      expect(processed.data.auxiliary.length).toBe(2);
      expect(processed.data.primary[0].height).toBe(183);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks', 'confirmed');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocksKicked API endpoint', (done) => {
    const commands = [
      ['sadd', 'Pool1:blocks:primary:kicked', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:kicked', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:kicked', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:kicked', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:kicked', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:kicked', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/blocks/kicked');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(Object.keys(processed.data).length).toBe(2);
      expect(processed.data.primary.length).toBe(4);
      expect(processed.data.auxiliary.length).toBe(2);
      expect(processed.data.primary[0].height).toBe(183);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks', 'kicked');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocksPending API endpoint', (done) => {
    const commands = [
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:pending', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:pending', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/blocks/pending');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(Object.keys(processed.data).length).toBe(2);
      expect(processed.data.primary.length).toBe(4);
      expect(processed.data.auxiliary.length).toBe(2);
      expect(processed.data.primary[0].height).toBe(183);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks', 'pending');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocks API endpoint', (done) => {
    const commands = [
      ['sadd', 'Pool1:blocks:primary:confirmed', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:kicked', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:primary:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Pool1:blocks:auxiliary:pending', mockBuildBlock(184, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/blocks');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data).length).toBe(2);
      expect(Object.keys(processed.data.primary).length).toBe(3);
      expect(Object.keys(processed.data.auxiliary).length).toBe(3);
      expect(processed.data.primary.confirmed.length).toBe(1);
      expect(processed.data.primary.confirmed[0].height).toBe(180);
      expect(processed.data.primary.kicked.length).toBe(1);
      expect(processed.data.primary.pending.length).toBe(2);
      expect(processed.data.primary.pending[0].height).toBe(183);
      expect(processed.data.auxiliary.pending.length).toBe(2);
      expect(processed.data.auxiliary.pending[0].height).toBe(184);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePools API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool');
      expect(processed.coins).toStrictEqual([]);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/pools');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(1);
      expect(processed.data[0]).toBe('Pool1');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('pools');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleMinersSpecific API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:balances', 'worker2', 37.43],
      ['hset', 'Pool1:payments:primary:generate', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:generate', 'worker3', 0],
      ['hset', 'Pool1:payments:primary:immature', 'worker1', 76.23],
      ['hset', 'Pool1:payments:primary:immature', 'worker2', 12.17],
      ['hset', 'Pool1:payments:primary:immature', 'worker3', 76.4],
      ['hset', 'Pool1:payments:primary:paid', 'worker1', 0],
      ['hset', 'Pool1:payments:primary:paid', 'worker2', 123.5],
      ['hset', 'Pool1:payments:primary:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/miners/worker2');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(4);
      expect(Object.keys(processed.data.auxiliary).length).toBe(4);
      expect(processed.data.primary.current.shared).toBe(108);
      expect(processed.data.primary.current.solo).toBe(0);
      expect(processed.data.primary.current.times).toBe(0);
      expect(processed.data.primary.payments.balances).toBe(37.43);
      expect(processed.data.primary.payments.generate).toBe(255.17);
      expect(processed.data.primary.payments.immature).toBe(12.17);
      expect(processed.data.primary.payments.paid).toBe(123.5);
      expect(processed.data.primary.status.hashrate).toBe(1546188226.56);
      expect(processed.data.primary.status.workers).toBe(2);
      expect(processed.data.primary.workers.length).toBe(2);
      expect(processed.data.primary.workers[0]).toBe('worker2.w1');
      expect(processed.data.primary.workers[1]).toBe('worker2.w2');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners', 'worker2');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleMinersSpecific API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker3', 0],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker2', 12.17],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker3', 76.4],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker1', 0],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker2', 123.5],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/miners/worker1');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(4);
      expect(Object.keys(processed.data.auxiliary).length).toBe(4);
      expect(processed.data.auxiliary.current.shared).toBe(0);
      expect(processed.data.auxiliary.current.solo).toBe(64);
      expect(processed.data.auxiliary.current.times).toBe(20.15);
      expect(processed.data.auxiliary.payments.generate).toBe(0);
      expect(processed.data.auxiliary.payments.immature).toBe(0);
      expect(processed.data.auxiliary.payments.paid).toBe(0);
      expect(processed.data.auxiliary.status.hashrate).toBe(916259689.8133334);
      expect(processed.data.auxiliary.status.workers).toBe(1);
      expect(processed.data.auxiliary.workers.length).toBe(1);
      expect(processed.data.auxiliary.workers[0]).toBe('worker1');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners', 'worker1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleMiners API endpoint', (done) => {
    const commands = [
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker3', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w2', solo: false })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w2', solo: false })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker3', solo: false })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/miners');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.length).toBe(3);
      expect(processed.data.auxiliary.length).toBe(2);
      expect(processed.data.primary[0]).toBe('worker1');
      expect(processed.data.primary[1]).toBe('worker2');
      expect(processed.data.primary[2]).toBe('worker3');
      expect(processed.data.auxiliary[0]).toBe('worker2');
      expect(processed.data.auxiliary[1]).toBe('worker3');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePartners API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool');
      expect(processed.coins).toStrictEqual([]);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/partners');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(1);
      expect(processed.data[0].name).toBe('Blinkhash');
      expect(processed.data[0].tier).toBe(4);
      expect(processed.data[0].url).toBe('https://blinkhash.com');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('partners');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsBalances API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:balances', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:balances', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:balances', 'worker3', 0],
      ['hset', 'Pool1:payments:auxiliary:balances', 'worker2', 1255.17],
      ['hset', 'Pool1:payments:auxiliary:balances', 'worker3', 135]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/payments/balances');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(2);
      expect(Object.keys(processed.data.auxiliary).length).toBe(2);
      expect(processed.data.primary.worker1).toBe(134.3);
      expect(processed.data.primary.worker2).toBe(255.17);
      expect(processed.data.auxiliary.worker2).toBe(1255.17);
      expect(processed.data.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'balances');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsGenerate API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:generate', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:generate', 'worker3', 0],
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker2', 1255.17],
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker3', 135]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/payments/generate');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(2);
      expect(Object.keys(processed.data.auxiliary).length).toBe(2);
      expect(processed.data.primary.worker1).toBe(134.3);
      expect(processed.data.primary.worker2).toBe(255.17);
      expect(processed.data.auxiliary.worker2).toBe(1255.17);
      expect(processed.data.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'generate');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsImmature API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:immature', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:immature', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:immature', 'worker3', 0],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker2', 1255.17],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker3', 135]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/payments/immature');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(2);
      expect(Object.keys(processed.data.auxiliary).length).toBe(2);
      expect(processed.data.primary.worker1).toBe(134.3);
      expect(processed.data.primary.worker2).toBe(255.17);
      expect(processed.data.auxiliary.worker2).toBe(1255.17);
      expect(processed.data.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'immature');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsPaid API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:paid', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:paid', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:paid', 'worker3', 0],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker2', 1255.17],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker3', 135]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/payments/paid');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(2);
      expect(Object.keys(processed.data.auxiliary).length).toBe(2);
      expect(processed.data.primary.worker1).toBe(134.3);
      expect(processed.data.primary.worker2).toBe(255.17);
      expect(processed.data.auxiliary.worker2).toBe(1255.17);
      expect(processed.data.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'paid');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsRecords API endpoint', (done) => {
    const commands = [
      ['zadd', 'Pool1:payments:primary:records', 0, JSON.stringify({ time: 0, paid: 200.15, transaction: 'hash1', records: 'record1' })],
      ['zadd', 'Pool1:payments:primary:records', 0, JSON.stringify({ time: 1, paid: 84.23, transaction: 'hash2', records: 'record2' })],
      ['zadd', 'Pool1:payments:auxiliary:records', 0, JSON.stringify({ time: 2, paid: 760.133, transaction: 'hash3', records: 'record3' })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/payments/records');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.length).toBe(2);
      expect(processed.data.auxiliary.length).toBe(1);
      expect(processed.data.primary[0].paid).toBe(200.15);
      expect(processed.data.primary[0].transaction).toBe('hash1');
      expect(processed.data.primary[0].records).toBe('record1');
      expect(processed.data.primary[1].paid).toBe(84.23);
      expect(processed.data.primary[1].transaction).toBe('hash2');
      expect(processed.data.primary[1].records).toBe('record2');
      expect(processed.data.auxiliary[0].paid).toBe(760.133);
      expect(processed.data.auxiliary[0].transaction).toBe('hash3');
      expect(processed.data.auxiliary[0].records).toBe('record3');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'records');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePayments API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:generate', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:generate', 'worker3', 0],
      ['hset', 'Pool1:payments:primary:immature', 'worker1', 76.23],
      ['hset', 'Pool1:payments:primary:immature', 'worker2', 12.17],
      ['hset', 'Pool1:payments:primary:immature', 'worker3', 76.4],
      ['hset', 'Pool1:payments:primary:paid', 'worker1', 0],
      ['hset', 'Pool1:payments:primary:paid', 'worker2', 123.5],
      ['hset', 'Pool1:payments:primary:paid', 'worker3', 45.66],
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker1', 134.3],
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker1', 76.23],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker2', 123.5]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/payments');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(4);
      expect(Object.keys(processed.data.auxiliary).length).toBe(4);
      expect(processed.data.primary.generate.worker1).toBe(134.3);
      expect(processed.data.primary.generate.worker2).toBe(255.17);
      expect(processed.data.primary.immature.worker1).toBe(76.23);
      expect(processed.data.primary.immature.worker2).toBe(12.17);
      expect(processed.data.primary.immature.worker3).toBe(76.4);
      expect(processed.data.primary.paid.worker2).toBe(123.5);
      expect(processed.data.primary.paid.worker3).toBe(45.66);
      expect(processed.data.auxiliary.generate.worker1).toBe(134.3);
      expect(processed.data.auxiliary.generate.worker2).toBe(255.17);
      expect(processed.data.auxiliary.immature.worker1).toBe(76.23);
      expect(processed.data.auxiliary.paid.worker2).toBe(123.5);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRoundsCurrent API endpoint', (done) => {
    const commands = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:times', 'worker1', 20.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/rounds/current');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.shared.worker1).toBe(64);
      expect(processed.data.primary.solo.worker2).toBe(108);
      expect(processed.data.primary.times.worker1).toBe(20.15);
      expect(processed.data.auxiliary.solo.worker2).toBe(108);
      expect(processed.data.auxiliary.times.worker1).toBe(20.15);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds', 'current');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRoundsHeight API endpoint', (done) => {
    const commands = [
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:times', 'worker1', 20.15],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:times', 'worker1', 20.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/rounds/180');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.shared.worker1).toBe(64);
      expect(processed.data.primary.solo.worker2).toBe(108);
      expect(processed.data.primary.times.worker1).toBe(20.15);
      expect(processed.data.auxiliary.solo.worker2).toBe(108);
      expect(processed.data.auxiliary.times.worker1).toBe(20.15);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds', '180');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRounds API endpoint [1]', (done) => {
    const commands = [
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-181:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 128],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-181:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 256],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:times', 'worker1', 20.15],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-181:times', 'worker1', 25.15],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-181:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 128],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-181:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 256],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:times', 'worker1', 20.15],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-181:times', 'worker1', 25.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/rounds');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary['180'].shared.worker1).toBe(64);
      expect(processed.data.primary['181'].shared.worker1).toBe(128);
      expect(processed.data.primary['180'].solo.worker2).toBe(108);
      expect(processed.data.primary['181'].solo.worker2).toBe(256);
      expect(processed.data.primary['180'].times.worker1).toBe(20.15);
      expect(processed.data.primary['181'].times.worker1).toBe(25.15);
      expect(processed.data.auxiliary['180'].shared.worker1).toBe(64);
      expect(processed.data.auxiliary['181'].shared.worker1).toBe(128);
      expect(processed.data.auxiliary['180'].solo.worker2).toBe(108);
      expect(processed.data.auxiliary['181'].solo.worker2).toBe(256);
      expect(processed.data.auxiliary['180'].times.worker1).toBe(20.15);
      expect(processed.data.auxiliary['181'].times.worker1).toBe(25.15);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRounds API endpoint [2]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/rounds');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data).length).toBe(2);
      expect(Object.keys(processed.data.primary).length).toBe(0);
      expect(Object.keys(processed.data.auxiliary).length).toBe(0);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleStatistics API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Pool1:blocks:primary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:primary:counts', 'invalid', 2],
      ['hset', 'Pool1:payments:primary:counts', 'total', 200.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 0],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1],
      ['hset', 'Pool1:rounds:primary:current:counts', 'valid', 3190],
      ['hset', 'Pool1:rounds:primary:current:counts', 'invalid', 465],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'invalid', 2]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/statistics');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.blocks.invalid).toBe(2);
      expect(processed.data.primary.blocks.valid).toBe(500);
      expect(processed.data.primary.payments.last).toBe(0);
      expect(processed.data.primary.payments.next).toBe(1);
      expect(processed.data.primary.payments.total).toBe(200.5);
      expect(processed.data.primary.shares.invalid).toBe(465);
      expect(processed.data.primary.shares.valid).toBe(3190);
      expect(processed.data.primary.status.hashrate).toBe(2576980377.6);
      expect(processed.data.primary.status.miners).toBe(3);
      expect(processed.data.primary.status.workers).toBe(4);
      expect(processed.data.auxiliary.blocks.invalid).toBe(2);
      expect(processed.data.auxiliary.blocks.valid).toBe(500);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'statistics');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleStatistics API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Pool1:blocks:primary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:primary:counts', 'invalid', 2],
      ['hset', 'Pool1:payments:primary:counts', 'total', 200.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 0],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1],
      ['hset', 'Pool1:rounds:primary:current:counts', 'valid', 3190],
      ['hset', 'Pool1:rounds:primary:current:counts', 'invalid', 465],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'invalid', 2]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/statistics');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.blocks.invalid).toBe(2);
      expect(processed.data.primary.blocks.valid).toBe(500);
      expect(processed.data.primary.payments.last).toBe(0);
      expect(processed.data.primary.payments.next).toBe(1);
      expect(processed.data.primary.payments.total).toBe(200.5);
      expect(processed.data.primary.shares.invalid).toBe(465);
      expect(processed.data.primary.shares.valid).toBe(3190);
      expect(processed.data.primary.status.hashrate).toBe(2576980377.6);
      expect(processed.data.primary.status.miners).toBe(3);
      expect(processed.data.primary.status.workers).toBe(4);
      expect(processed.data.auxiliary.blocks.invalid).toBe(2);
      expect(processed.data.auxiliary.blocks.valid).toBe(500);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleWorkersSpecific API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:primary:generate', 'worker1', 134.3],
      ['hset', 'Pool1:payments:primary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:primary:generate', 'worker3', 0],
      ['hset', 'Pool1:payments:primary:immature', 'worker1', 76.23],
      ['hset', 'Pool1:payments:primary:immature', 'worker2', 12.17],
      ['hset', 'Pool1:payments:primary:immature', 'worker3', 76.4],
      ['hset', 'Pool1:payments:primary:paid', 'worker1', 0],
      ['hset', 'Pool1:payments:primary:paid', 'worker2', 123.5],
      ['hset', 'Pool1:payments:primary:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/workers/worker2.w1');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(2);
      expect(Object.keys(processed.data.auxiliary).length).toBe(2);
      expect(processed.data.primary.current.shared).toBe(64);
      expect(processed.data.primary.current.solo).toBe(0);
      expect(processed.data.primary.current.times).toBe(0);
      expect(processed.data.primary.status.hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers', 'worker2.w1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleWorkersSpecific API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker2', 255.17],
      ['hset', 'Pool1:payments:auxiliary:generate', 'worker3', 0],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker2', 12.17],
      ['hset', 'Pool1:payments:auxiliary:immature', 'worker3', 76.4],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker1', 0],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker2', 123.5],
      ['hset', 'Pool1:payments:auxiliary:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/workers/worker1');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data.primary).length).toBe(2);
      expect(Object.keys(processed.data.auxiliary).length).toBe(2);
      expect(processed.data.auxiliary.current.shared).toBe(0);
      expect(processed.data.auxiliary.current.solo).toBe(64);
      expect(processed.data.auxiliary.current.times).toBe(20.15);
      expect(processed.data.auxiliary.status.hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers', 'worker1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleWorkers API endpoint', (done) => {
    const commands = [
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker3', solo: false })],
      ['zadd', 'Pool1:rounds:primary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w2', solo: false })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w2', solo: false })],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker3', solo: false })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.pool).toBe('Pool1');
      expect(processed.coins).toStrictEqual(['Bitcoin']);
      expect(processed.logo).toBe('');
      expect(processed.endpoint).toBe('/workers');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.primary.length).toBe(4);
      expect(processed.data.auxiliary.length).toBe(2);
      expect(processed.data.primary[0]).toBe('worker1');
      expect(processed.data.primary[1]).toBe('worker2.w1');
      expect(processed.data.primary[2]).toBe('worker2.w2');
      expect(processed.data.primary[3]).toBe('worker3');
      expect(processed.data.auxiliary[0]).toBe('worker2.w2');
      expect(processed.data.auxiliary[1]).toBe('worker3');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });
});
