/*
 *
 * API (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const events = require('events');
const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');
const PoolApi = require('../main/api');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;
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
    const poolApi = new PoolApi(client, poolConfigs, portalConfig);
    expect(typeof poolApi.handleBlocksConfirmed).toBe('function');
    expect(typeof poolApi.handleMinersActive).toBe('function');
    expect(typeof poolApi.handleApiV1).toBe('function');
  });

  test('Test unknownPool API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(400);
      expect(processed.body).toBe('The requested pool was not found. Verify your input and try again');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest();
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test unknownMethod API endpoint [1]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(400);
      expect(processed.body).toBe('The requested method is not currently supported. Verify your input and try again');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'unknown', 'unknown');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test unknownMethod API endpoint [2]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(400);
      expect(processed.body).toBe('The requested method is not currently supported. Verify your input and try again');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'unknown', 'unknown');
      const poolConfigsCopy = JSON.parse(JSON.stringify(poolConfigs));
      const poolApi = new PoolApi(client, poolConfigsCopy, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test request without parameters', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(400);
      expect(processed.body).toBe('The requested pool was not found. Verify your input and try again');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = {};
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(Object.keys(processed.body).length).toBe(2);
      expect(processed.body.primary.length).toBe(4);
      expect(processed.body.auxiliary.length).toBe(2);
      expect(processed.body.primary[0].height).toBe(183);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks', 'confirmed');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(Object.keys(processed.body).length).toBe(2);
      expect(processed.body.primary.length).toBe(4);
      expect(processed.body.auxiliary.length).toBe(2);
      expect(processed.body.primary[0].height).toBe(183);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks', 'kicked');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(Object.keys(processed.body).length).toBe(2);
      expect(processed.body.primary.length).toBe(4);
      expect(processed.body.auxiliary.length).toBe(2);
      expect(processed.body.primary[0].height).toBe(183);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks', 'pending');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body).length).toBe(2);
      expect(Object.keys(processed.body.primary).length).toBe(3);
      expect(Object.keys(processed.body.auxiliary).length).toBe(3);
      expect(processed.body.primary.confirmed.length).toBe(1);
      expect(processed.body.primary.confirmed[0].height).toBe(180);
      expect(processed.body.primary.kicked.length).toBe(1);
      expect(processed.body.primary.pending.length).toBe(2);
      expect(processed.body.primary.pending[0].height).toBe(183);
      expect(processed.body.auxiliary.pending.length).toBe(2);
      expect(processed.body.auxiliary.pending[0].height).toBe(184);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'blocks');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handlePools API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.length).toBe(1);
      expect(processed.body[0]).toBe('Pool1');
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('pools');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleMinersActive API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 0, difficulty: 44, worker: 'worker2.w2' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker3', JSON.stringify({ time: 0, difficulty: 8, worker: 'worker3' })],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.shared.length).toBe(1);
      expect(processed.body.primary.solo.length).toBe(1);
      expect(processed.body.primary.shared[0].miner).toBe('worker2');
      expect(processed.body.primary.shared[0].shares).toBe(108);
      expect(processed.body.primary.shared[0].hashrate).toBe(1546188226.56);
      expect(processed.body.primary.solo[0].miner).toBe('worker1');
      expect(processed.body.primary.solo[0].shares).toBe(64);
      expect(processed.body.primary.solo[0].hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners', 'active');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {

        poolApi.buildResponse(code, message, response);
      });
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
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 0, difficulty: 44, worker: 'worker2.w2' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker3', JSON.stringify({ time: 0, difficulty: 8, worker: 'worker3' })],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(4);
      expect(Object.keys(processed.body.auxiliary).length).toBe(4);
      expect(processed.body.primary.current.shared).toBe(108);
      expect(processed.body.primary.current.solo).toBe(0);
      expect(processed.body.primary.current.times).toBe(0);
      expect(processed.body.primary.payments.balances).toBe(37.43);
      expect(processed.body.primary.payments.generate).toBe(255.17);
      expect(processed.body.primary.payments.immature).toBe(12.17);
      expect(processed.body.primary.payments.paid).toBe(123.5);
      expect(processed.body.primary.hashrate.shared).toBe(1546188226.56);
      expect(processed.body.primary.workers.shared.length).toBe(2);
      expect(processed.body.primary.workers.shared[0]).toBe('worker2.w1');
      expect(processed.body.primary.workers.shared[1]).toBe('worker2.w2');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners', 'worker2');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, solo: true, worker: 'worker1' })],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, solo: false, worker: 'worker2.w1' })],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 0, difficulty: 44, solo: false, worker: 'worker2.w2' })],
      ['hset', 'Pool1:rounds:auxiliary:current:shared:shares', 'worker3', JSON.stringify({ time: 0, difficulty: 8, solo: false, worker: 'worker3' })],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shared:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', difficulty: 64 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', difficulty: 8 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(4);
      expect(Object.keys(processed.body.auxiliary).length).toBe(4);
      expect(processed.body.auxiliary.current.shared).toBe(0);
      expect(processed.body.auxiliary.current.solo).toBe(64);
      expect(processed.body.auxiliary.current.times).toBe(20.15);
      expect(processed.body.auxiliary.payments.generate).toBe(0);
      expect(processed.body.auxiliary.payments.immature).toBe(0);
      expect(processed.body.auxiliary.payments.paid).toBe(0);
      expect(processed.body.auxiliary.hashrate.solo).toBe(916259689.8133334);
      expect(processed.body.auxiliary.workers.solo.length).toBe(1);
      expect(processed.body.auxiliary.workers.solo[0]).toBe('worker1');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners', 'worker1');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleMiners API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 0, difficulty: 44, worker: 'worker2.w2' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker3', JSON.stringify({ time: 0, difficulty: 8, worker: 'worker3' })],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.shared.length).toBe(2);
      expect(processed.body.primary.solo.length).toBe(1);
      expect(processed.body.primary.shared[0].miner).toBe('worker2');
      expect(processed.body.primary.shared[0].shares).toBe(108);
      expect(processed.body.primary.shared[0].hashrate).toBe(1546188226.56);
      expect(processed.body.primary.shared[1].miner).toBe('worker3');
      expect(processed.body.primary.shared[1].shares).toBe(8);
      expect(processed.body.primary.shared[1].hashrate).toBe(114532461.22666667);
      expect(processed.body.primary.solo[0].miner).toBe('worker1');
      expect(processed.body.primary.solo[0].shares).toBe(64);
      expect(processed.body.primary.solo[0].hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'miners');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(2);
      expect(Object.keys(processed.body.auxiliary).length).toBe(2);
      expect(processed.body.primary.worker1).toBe(134.3);
      expect(processed.body.primary.worker2).toBe(255.17);
      expect(processed.body.auxiliary.worker2).toBe(1255.17);
      expect(processed.body.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'balances');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(2);
      expect(Object.keys(processed.body.auxiliary).length).toBe(2);
      expect(processed.body.primary.worker1).toBe(134.3);
      expect(processed.body.primary.worker2).toBe(255.17);
      expect(processed.body.auxiliary.worker2).toBe(1255.17);
      expect(processed.body.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'generate');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(2);
      expect(Object.keys(processed.body.auxiliary).length).toBe(2);
      expect(processed.body.primary.worker1).toBe(134.3);
      expect(processed.body.primary.worker2).toBe(255.17);
      expect(processed.body.auxiliary.worker2).toBe(1255.17);
      expect(processed.body.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'immature');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(2);
      expect(Object.keys(processed.body.auxiliary).length).toBe(2);
      expect(processed.body.primary.worker1).toBe(134.3);
      expect(processed.body.primary.worker2).toBe(255.17);
      expect(processed.body.auxiliary.worker2).toBe(1255.17);
      expect(processed.body.auxiliary.worker3).toBe(135);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'paid');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handlePorts API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(typeof processed.body.ports[0]).toBe('object');
      expect(processed.body.ports[0].difficulty.initial).toBe(32);
      expect(processed.body.ports[0].difficulty.maximum).toBe(512);
      expect(processed.body.ports[0].difficulty.minimum).toBe(8);
      expect(processed.body.ports[0].enabled).toBe(true);
      expect(processed.body.ports[0].port).toBe(3002);
      expect(processed.body.ports[1].port).toBe(3003);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'ports');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.length).toBe(2);
      expect(processed.body.auxiliary.length).toBe(1);
      expect(processed.body.primary[0].paid).toBe(200.15);
      expect(processed.body.primary[0].transaction).toBe('hash1');
      expect(processed.body.primary[0].records).toBe('record1');
      expect(processed.body.primary[1].paid).toBe(84.23);
      expect(processed.body.primary[1].transaction).toBe('hash2');
      expect(processed.body.primary[1].records).toBe('record2');
      expect(processed.body.auxiliary[0].paid).toBe(760.133);
      expect(processed.body.auxiliary[0].transaction).toBe('hash3');
      expect(processed.body.auxiliary[0].records).toBe('record3');
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments', 'records');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(4);
      expect(Object.keys(processed.body.auxiliary).length).toBe(4);
      expect(processed.body.primary.generate.worker1).toBe(134.3);
      expect(processed.body.primary.generate.worker2).toBe(255.17);
      expect(processed.body.primary.immature.worker1).toBe(76.23);
      expect(processed.body.primary.immature.worker2).toBe(12.17);
      expect(processed.body.primary.immature.worker3).toBe(76.4);
      expect(processed.body.primary.paid.worker2).toBe(123.5);
      expect(processed.body.primary.paid.worker3).toBe(45.66);
      expect(processed.body.auxiliary.generate.worker1).toBe(134.3);
      expect(processed.body.auxiliary.generate.worker2).toBe(255.17);
      expect(processed.body.auxiliary.immature.worker1).toBe(76.23);
      expect(processed.body.auxiliary.paid.worker2).toBe(123.5);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'payments');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleRoundsCurrent API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1', solo: false })],
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'worker2', JSON.stringify({ time: 0, difficulty: 108, worker: 'worker2', solo: true })],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shared:times', 'worker1', 20.15],
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'worker2', JSON.stringify({ time: 0, difficulty: 108, worker: 'worker2', solo: true })],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shared:times', 'worker1', 20.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.shared.worker1).toBe(64);
      expect(processed.body.primary.solo.worker2).toBe(108);
      expect(processed.body.primary.times.worker1).toBe(20.15);
      expect(processed.body.auxiliary.solo.worker2).toBe(108);
      expect(processed.body.auxiliary.times.worker1).toBe(20.15);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds', 'current');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleRoundsHeight API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1', solo: false })],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:times', 'worker1', 20.15],
      ['hset', 'Pool1:rounds:auxiliary:round-180:shares', 'worker2', JSON.stringify({ time: 0, difficulty: 108, worker: 'worker2', solo: true })],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:times', 'worker1', 20.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.shares.worker1).toBe(64);
      expect(processed.body.primary.times.worker1).toBe(20.15);
      expect(processed.body.auxiliary.shares.worker2).toBe(108);
      expect(processed.body.auxiliary.times.worker1).toBe(20.15);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds', '180');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleRounds API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:round-180:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1', solo: false })],
      ['hset', 'Pool1:rounds:primary:round-181:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 128, worker: 'worker1', solo: false })],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-180:times', 'worker1', 20.15],
      ['hincrbyfloat', 'Pool1:rounds:primary:round-181:times', 'worker1', 25.15],
      ['hset', 'Pool1:rounds:auxiliary:round-180:shares', 'worker2', JSON.stringify({ time: 0, difficulty: 108, worker: 'worker2', solo: true })],
      ['hset', 'Pool1:rounds:auxiliary:round-181:shares', 'worker2', JSON.stringify({ time: 0, difficulty: 256, worker: 'worker2', solo: true })],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-180:times', 'worker2', 20.15],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:round-181:times', 'worker2', 25.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary['180'].shares.worker1).toBe(64);
      expect(processed.body.primary['181'].shares.worker1).toBe(128);
      expect(processed.body.primary['180'].times.worker1).toBe(20.15);
      expect(processed.body.primary['181'].times.worker1).toBe(25.15);
      expect(processed.body.auxiliary['180'].shares.worker2).toBe(108);
      expect(processed.body.auxiliary['181'].shares.worker2).toBe(256);
      expect(processed.body.auxiliary['180'].times.worker2).toBe(20.15);
      expect(processed.body.auxiliary['181'].times.worker2).toBe(25.15);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleRounds API endpoint [2]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body).length).toBe(2);
      expect(Object.keys(processed.body.primary).length).toBe(0);
      expect(Object.keys(processed.body.auxiliary).length).toBe(0);
      done();
    });
    mockSetupClient(client, [], 'Pool1', () => {
      const request = mockRequest('Pool1', 'rounds');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleStatistics API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Pool1:blocks:primary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:primary:counts', 'invalid', 2],
      ['hset', 'Pool1:payments:primary:counts', 'total', 200.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 0],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'valid', 3190],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'stale', 123],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'invalid', 465],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'invalid', 2]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.blocks.invalid).toBe(2);
      expect(processed.body.primary.blocks.valid).toBe(500);
      expect(processed.body.primary.payments.last).toBe(0);
      expect(processed.body.primary.payments.next).toBe(1);
      expect(processed.body.primary.payments.total).toBe(200.5);
      expect(processed.body.primary.shares.invalid).toBe(465);
      expect(processed.body.primary.shares.stale).toBe(123);
      expect(processed.body.primary.shares.valid).toBe(3190);
      expect(processed.body.primary.hashrate.shared).toBe(2576980377.6);
      expect(processed.body.primary.status.miners).toBe(6);
      expect(processed.body.primary.status.workers).toBe(8);
      expect(processed.body.auxiliary.blocks.invalid).toBe(2);
      expect(processed.body.auxiliary.blocks.valid).toBe(500);
      expect(processed.body.auxiliary.blocks.invalid).toBe(2);
      expect(processed.body.auxiliary.blocks.valid).toBe(500);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'statistics');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleStatistics API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Pool1:blocks:primary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:primary:counts', 'invalid', 2],
      ['hset', 'Pool1:payments:primary:counts', 'total', 200.5],
      ['hset', 'Pool1:payments:primary:counts', 'last', 0],
      ['hset', 'Pool1:payments:primary:counts', 'next', 1],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'valid', 3190],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'stale', 123],
      ['hset', 'Pool1:rounds:primary:current:shared:counts', 'invalid', 465],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'valid', 500],
      ['hset', 'Pool1:blocks:auxiliary:counts', 'invalid', 2]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.blocks.invalid).toBe(2);
      expect(processed.body.primary.blocks.valid).toBe(500);
      expect(processed.body.primary.payments.last).toBe(0);
      expect(processed.body.primary.payments.next).toBe(1);
      expect(processed.body.primary.payments.total).toBe(200.5);
      expect(processed.body.primary.shares.invalid).toBe(465);
      expect(processed.body.primary.shares.stale).toBe(123);
      expect(processed.body.primary.shares.valid).toBe(3190);
      expect(processed.body.primary.hashrate.shared).toBe(2576980377.6);
      expect(processed.body.primary.status.miners).toBe(6);
      expect(processed.body.primary.status.workers).toBe(8);
      expect(processed.body.auxiliary.blocks.invalid).toBe(2);
      expect(processed.body.auxiliary.blocks.valid).toBe(500);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleWorkersActive API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 0, difficulty: 44, worker: 'worker2.w2' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker3', JSON.stringify({ time: 0, difficulty: 8, worker: 'worker3' })],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.shared.length).toBe(2);
      expect(processed.body.primary.solo.length).toBe(1);
      expect(processed.body.primary.shared[0].worker).toBe('worker2.w1');
      expect(processed.body.primary.shared[0].shares).toBe(64);
      expect(processed.body.primary.shared[0].hashrate).toBe(916259689.8133334);
      expect(processed.body.primary.shared[1].worker).toBe('worker2.w2');
      expect(processed.body.primary.shared[1].shares).toBe(44);
      expect(processed.body.primary.shared[1].hashrate).toBe(629928536.7466667);
      expect(processed.body.primary.solo[0].worker).toBe('worker1');
      expect(processed.body.primary.solo[0].shares).toBe(64);
      expect(processed.body.primary.solo[0].hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers', 'active');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1', solo: true })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1', solo: false })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker3', JSON.stringify({ time: 1, difficulty: 8, worker: 'worker3', solo: false })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 1, difficulty: 44, worker: 'worker2.w2', solo: false })],
      ['hset', 'Pool1:rounds:primary:current:shared:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(2);
      expect(Object.keys(processed.body.auxiliary).length).toBe(2);
      expect(processed.body.primary.current.shared).toBe(64);
      expect(processed.body.primary.current.solo).toBe(0);
      expect(processed.body.primary.current.times).toBe(0);
      expect(processed.body.primary.hashrate.shared).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers', 'worker2.w1');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
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
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1', solo: true })],
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1', solo: false })],
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'worker3', JSON.stringify({ time: 1, difficulty: 8, worker: 'worker3', solo: false })],
      ['hset', 'Pool1:rounds:auxiliary:current:solo:shares', 'worker2.w2', JSON.stringify({ time: 1, difficulty: 44, worker: 'worker2.w2', solo: false })],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Pool1:rounds:auxiliary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(Object.keys(processed.body.primary).length).toBe(2);
      expect(Object.keys(processed.body.auxiliary).length).toBe(2);
      expect(processed.body.auxiliary.current.shared).toBe(0);
      expect(processed.body.auxiliary.current.solo).toBe(64);
      expect(processed.body.auxiliary.hashrate.solo).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers', 'worker1');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });

  test('Test handleWorkers API endpoint', (done) => {
    const commands = [
      ['hset', 'Pool1:rounds:primary:current:solo:shares', 'worker1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w1', JSON.stringify({ time: 0, difficulty: 64, worker: 'worker2.w1' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker2.w2', JSON.stringify({ time: 0, difficulty: 44, worker: 'worker2.w2' })],
      ['hset', 'Pool1:rounds:primary:current:shared:shares', 'worker3', JSON.stringify({ time: 0, difficulty: 8, worker: 'worker3' })],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'worker1', 20.15],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', difficulty: 64 })],
      ['zadd', 'Pool1:rounds:primary:current:solo:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', difficulty: 32 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', difficulty: 8 })],
      ['zadd', 'Pool1:rounds:primary:current:shared:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.statusCode).toBe(200);
      expect(typeof processed.body).toBe('object');
      expect(processed.body.primary.shared.length).toBe(3);
      expect(processed.body.primary.solo.length).toBe(1);
      expect(processed.body.primary.shared[0].worker).toBe('worker2.w1');
      expect(processed.body.primary.shared[0].shares).toBe(64);
      expect(processed.body.primary.shared[0].hashrate).toBe(916259689.8133334);
      expect(processed.body.primary.shared[1].worker).toBe('worker2.w2');
      expect(processed.body.primary.shared[1].shares).toBe(44);
      expect(processed.body.primary.shared[1].hashrate).toBe(629928536.7466667);
      expect(processed.body.primary.shared[2].worker).toBe('worker3');
      expect(processed.body.primary.shared[2].shares).toBe(8);
      expect(processed.body.primary.shared[2].hashrate).toBe(114532461.22666667);
      expect(processed.body.primary.solo[0].worker).toBe('worker1');
      expect(processed.body.primary.solo[0].shares).toBe(64);
      expect(processed.body.primary.solo[0].hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Pool1', () => {
      const request = mockRequest('Pool1', 'workers');
      const poolApi = new PoolApi(client, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, (code, message) => {
        poolApi.buildResponse(code, message, response);
      });
    });
  });
});
