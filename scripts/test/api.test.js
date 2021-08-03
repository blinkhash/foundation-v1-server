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
const poolConfigs = { Bitcoin: poolConfig };

////////////////////////////////////////////////////////////////////////////////

function mockRequest(coin, endpoint, method) {
  return {
    params: { coin: coin, endpoint: endpoint },
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

function mockSetupClient(client, commands, coin, callback) {
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

  test('Test unknownCoin API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('');
      expect(processed.endpoint).toBe('/unknown/');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested coin was not found. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Bitcoin', () => {
      const request = mockRequest();
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test unknownMethod API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/unknown/');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested method is not currently supported. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'unknown', 'unknown');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test request without parameters', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.endpoint).toBe('/unknown/');
      expect(processed.response.code).toBe(405);
      expect(processed.response.message).toBe('The requested coin was not found. Verify your input and try again.');
      expect(processed.data).toBe(null);
      done();
    });
    mockSetupClient(client, [], 'Bitcoin', () => {
      const request = {};
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocksConfirmed API endpoint', (done) => {
    const commands = [
      ['sadd', 'Bitcoin:blocks:confirmed', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:confirmed', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:confirmed', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:confirmed', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/blocks/confirmed/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(processed.data.length).toBe(4);
      expect(processed.data[0].height).toBe(180);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'blocks', 'confirmed');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocksKicked API endpoint', (done) => {
    const commands = [
      ['sadd', 'Bitcoin:blocks:kicked', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:kicked', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:kicked', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:kicked', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/blocks/kicked/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(processed.data.length).toBe(4);
      expect(processed.data[0].height).toBe(180);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'blocks', 'kicked');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocksPending API endpoint', (done) => {
    const commands = [
      ['sadd', 'Bitcoin:blocks:pending', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:pending', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:pending', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/blocks/pending/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(processed.data.length).toBe(4);
      expect(processed.data[0].height).toBe(180);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'blocks', 'pending');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleBlocks API endpoint', (done) => {
    const commands = [
      ['sadd', 'Bitcoin:blocks:confirmed', mockBuildBlock(180, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:kicked', mockBuildBlock(181, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:pending', mockBuildBlock(182, 'hash', 12.5, 'txid', 8, 'worker', false)],
      ['sadd', 'Bitcoin:blocks:pending', mockBuildBlock(183, 'hash', 12.5, 'txid', 8, 'worker', false)]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/blocks/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.confirmed.length).toBe(1);
      expect(processed.data.confirmed[0].height).toBe(180);
      expect(processed.data.kicked.length).toBe(1);
      expect(processed.data.pending.length).toBe(2);
      expect(processed.data.pending[0].height).toBe(182);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'blocks');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleCoins API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Pool');
      expect(processed.endpoint).toBe('/coins/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(1);
      expect(processed.data[0]).toBe('Bitcoin');
      done();
    });
    mockSetupClient(client, [], 'Bitcoin', () => {
      const request = mockRequest('coins');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleMinersSpecific API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:balances', 'worker2', 37.43],
      ['hset', 'Bitcoin:payments:generate', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:generate', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:generate', 'worker3', 0],
      ['hset', 'Bitcoin:payments:immature', 'worker1', 76.23],
      ['hset', 'Bitcoin:payments:immature', 'worker2', 12.17],
      ['hset', 'Bitcoin:payments:immature', 'worker3', 76.4],
      ['hset', 'Bitcoin:payments:paid', 'worker1', 0],
      ['hset', 'Bitcoin:payments:paid', 'worker2', 123.5],
      ['hset', 'Bitcoin:payments:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'worker1', 20.15],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/miners/worker2/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.current.shared).toBe(108);
      expect(processed.data.current.solo).toBe(0);
      expect(processed.data.current.times).toBe(0);
      expect(processed.data.payments.balances).toBe(37.43);
      expect(processed.data.payments.generate).toBe(255.17);
      expect(processed.data.payments.immature).toBe(12.17);
      expect(processed.data.payments.paid).toBe(123.5);
      expect(processed.data.status.hashrate).toBe(1546188226.56);
      expect(processed.data.status.workers).toBe(2);
      expect(processed.data.workers.length).toBe(2);
      expect(processed.data.workers[0]).toBe('worker2.w1');
      expect(processed.data.workers[1]).toBe('worker2.w2');
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'miners', 'worker2');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleMinersSpecific API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:generate', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:generate', 'worker3', 0],
      ['hset', 'Bitcoin:payments:immature', 'worker2', 12.17],
      ['hset', 'Bitcoin:payments:immature', 'worker3', 76.4],
      ['hset', 'Bitcoin:payments:paid', 'worker1', 0],
      ['hset', 'Bitcoin:payments:paid', 'worker2', 123.5],
      ['hset', 'Bitcoin:payments:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'worker1', 20.15],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/miners/worker1/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.current.shared).toBe(0);
      expect(processed.data.current.solo).toBe(64);
      expect(processed.data.current.times).toBe(20.15);
      expect(processed.data.payments.generate).toBe(0);
      expect(processed.data.payments.immature).toBe(0);
      expect(processed.data.payments.paid).toBe(0);
      expect(processed.data.status.hashrate).toBe(916259689.8133334);
      expect(processed.data.status.workers).toBe(1);
      expect(processed.data.workers.length).toBe(1);
      expect(processed.data.workers[0]).toBe('worker1');
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'miners', 'worker1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleMiners API endpoint', (done) => {
    const commands = [
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker3', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w2', solo: false })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/miners/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(3);
      expect(processed.data[0]).toBe('worker1');
      expect(processed.data[1]).toBe('worker2');
      expect(processed.data[2]).toBe('worker3');
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'miners');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePartners API endpoint', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Pool');
      expect(processed.endpoint).toBe('/partners/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(1);
      expect(processed.data[0].partner.name).toBe('Blinkhash');
      expect(processed.data[0].partner.tier).toBe(4);
      expect(processed.data[0].partner.url).toBe('https://blinkhash.com');
      done();
    });
    mockSetupClient(client, [], 'Bitcoin', () => {
      const request = mockRequest('partners');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsBalances API endpoint', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:balances', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:balances', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:balances', 'worker3', 0]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/payments/balances/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.worker1).toBe(134.3);
      expect(processed.data.worker2).toBe(255.17);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'payments', 'balances');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsGenerate API endpoint', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:generate', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:generate', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:generate', 'worker3', 0]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/payments/generate/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.worker1).toBe(134.3);
      expect(processed.data.worker2).toBe(255.17);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'payments', 'generate');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsImmature API endpoint', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:immature', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:immature', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:immature', 'worker3', 0]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/payments/immature/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.worker1).toBe(134.3);
      expect(processed.data.worker2).toBe(255.17);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'payments', 'immature');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsPaid API endpoint', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:paid', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:paid', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:paid', 'worker3', 0]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/payments/paid/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.worker1).toBe(134.3);
      expect(processed.data.worker2).toBe(255.17);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'payments', 'paid');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePaymentsRecords API endpoint', (done) => {
    const commands = [
      ['zadd', 'Bitcoin:payments:records', 0, JSON.stringify({ time: 0, paid: 200.15, transaction: 'hash1', records: 'record1' })],
      ['zadd', 'Bitcoin:payments:records', 0, JSON.stringify({ time: 1, paid: 84.23, transaction: 'hash2', records: 'record2' })],
      ['zadd', 'Bitcoin:payments:records', 0, JSON.stringify({ time: 2, paid: 760.133, transaction: 'hash3', records: 'record3' })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/payments/records/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(3);
      expect(processed.data[0].paid).toBe(200.15);
      expect(processed.data[0].transaction).toBe('hash1');
      expect(processed.data[0].records).toBe('record1');
      expect(processed.data[1].paid).toBe(84.23);
      expect(processed.data[1].transaction).toBe('hash2');
      expect(processed.data[1].records).toBe('record2');
      expect(processed.data[2].paid).toBe(760.133);
      expect(processed.data[2].transaction).toBe('hash3');
      expect(processed.data[2].records).toBe('record3');
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'payments', 'records');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handlePayments API endpoint', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:generate', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:generate', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:generate', 'worker3', 0],
      ['hset', 'Bitcoin:payments:immature', 'worker1', 76.23],
      ['hset', 'Bitcoin:payments:immature', 'worker2', 12.17],
      ['hset', 'Bitcoin:payments:immature', 'worker3', 76.4],
      ['hset', 'Bitcoin:payments:paid', 'worker1', 0],
      ['hset', 'Bitcoin:payments:paid', 'worker2', 123.5],
      ['hset', 'Bitcoin:payments:paid', 'worker3', 45.66]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/payments/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.generate.worker1).toBe(134.3);
      expect(processed.data.generate.worker2).toBe(255.17);
      expect(processed.data.immature.worker1).toBe(76.23);
      expect(processed.data.immature.worker2).toBe(12.17);
      expect(processed.data.immature.worker3).toBe(76.4);
      expect(processed.data.paid.worker2).toBe(123.5);
      expect(processed.data.paid.worker3).toBe(45.66);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'payments');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRoundsCurrent API endpoint', (done) => {
    const commands = [
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'worker1', 20.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/rounds/current/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.shared.worker1).toBe(64);
      expect(processed.data.solo.worker2).toBe(108);
      expect(processed.data.times.worker1).toBe(20.15);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'rounds', 'current');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRoundsHeight API endpoint', (done) => {
    const commands = [
      ['hincrbyfloat', 'Bitcoin:rounds:round-180:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:round-180:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Bitcoin:rounds:round-180:times', 'worker1', 20.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/rounds/180/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.shared.worker1).toBe(64);
      expect(processed.data.solo.worker2).toBe(108);
      expect(processed.data.times.worker1).toBe(20.15);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'rounds', '180');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRounds API endpoint [1]', (done) => {
    const commands = [
      ['hincrbyfloat', 'Bitcoin:rounds:round-180:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:round-180:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 108],
      ['hincrbyfloat', 'Bitcoin:rounds:round-181:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: false }), 128],
      ['hincrbyfloat', 'Bitcoin:rounds:round-181:shares', JSON.stringify({ time: 0, worker: 'worker2', solo: true }), 256],
      ['hincrbyfloat', 'Bitcoin:rounds:round-180:times', 'worker1', 20.15],
      ['hincrbyfloat', 'Bitcoin:rounds:round-181:times', 'worker1', 25.15]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/rounds/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data['180'].shared.worker1).toBe(64);
      expect(processed.data['181'].shared.worker1).toBe(128);
      expect(processed.data['180'].solo.worker2).toBe(108);
      expect(processed.data['181'].solo.worker2).toBe(256);
      expect(processed.data['180'].times.worker1).toBe(20.15);
      expect(processed.data['181'].times.worker1).toBe(25.15);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'rounds');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleRounds API endpoint [2]', (done) => {
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/rounds/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(Object.keys(processed.data).length).toBe(0);
      done();
    });
    mockSetupClient(client, [], 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'rounds');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleStatistics API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Bitcoin:blocks:counts', 'valid', 500],
      ['hset', 'Bitcoin:blocks:counts', 'invalid', 2],
      ['hset', 'Bitcoin:payments:counts', 'total', 200.5],
      ['hset', 'Bitcoin:payments:counts', 'last', 0],
      ['hset', 'Bitcoin:payments:counts', 'next', 1],
      ['hset', 'Bitcoin:rounds:current:counts', 'valid', 3190],
      ['hset', 'Bitcoin:rounds:current:counts', 'invalid', 465],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/statistics/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.blocks.invalid).toBe(2);
      expect(processed.data.blocks.valid).toBe(500);
      expect(processed.data.config.algorithm).toBe('sha256d');
      expect(processed.data.config.featured).toBe(false);
      expect(processed.data.config.logo).toBe('');
      expect(processed.data.config.name).toBe('Bitcoin');
      expect(processed.data.config.symbol).toBe('BTC');
      expect(processed.data.payments.last).toBe(0);
      expect(processed.data.payments.next).toBe(1);
      expect(processed.data.payments.total).toBe(200.5);
      expect(processed.data.shares.invalid).toBe(465);
      expect(processed.data.shares.valid).toBe(3190);
      expect(processed.data.status.hashrate).toBe(2576980377.6);
      expect(processed.data.status.miners).toBe(3);
      expect(processed.data.status.workers).toBe(4);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'statistics');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleStatistics API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Bitcoin:blocks:counts', 'valid', 500],
      ['hset', 'Bitcoin:blocks:counts', 'invalid', 2],
      ['hset', 'Bitcoin:payments:counts', 'total', 200.5],
      ['hset', 'Bitcoin:payments:counts', 'last', 0],
      ['hset', 'Bitcoin:payments:counts', 'next', 1],
      ['hset', 'Bitcoin:rounds:current:counts', 'valid', 3190],
      ['hset', 'Bitcoin:rounds:current:counts', 'invalid', 465],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/statistics/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.blocks.invalid).toBe(2);
      expect(processed.data.blocks.valid).toBe(500);
      expect(processed.data.config.algorithm).toBe('sha256d');
      expect(processed.data.config.featured).toBe(false);
      expect(processed.data.config.logo).toBe('');
      expect(processed.data.config.name).toBe('Bitcoin');
      expect(processed.data.config.symbol).toBe('BTC');
      expect(processed.data.payments.last).toBe(0);
      expect(processed.data.payments.next).toBe(1);
      expect(processed.data.payments.total).toBe(200.5);
      expect(processed.data.shares.invalid).toBe(465);
      expect(processed.data.shares.valid).toBe(3190);
      expect(processed.data.status.hashrate).toBe(2576980377.6);
      expect(processed.data.status.miners).toBe(3);
      expect(processed.data.status.workers).toBe(4);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleWorkersSpecific API endpoint [1]', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:generate', 'worker1', 134.3],
      ['hset', 'Bitcoin:payments:generate', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:generate', 'worker3', 0],
      ['hset', 'Bitcoin:payments:immature', 'worker1', 76.23],
      ['hset', 'Bitcoin:payments:immature', 'worker2', 12.17],
      ['hset', 'Bitcoin:payments:immature', 'worker3', 76.4],
      ['hset', 'Bitcoin:payments:paid', 'worker1', 0],
      ['hset', 'Bitcoin:payments:paid', 'worker2', 123.5],
      ['hset', 'Bitcoin:payments:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'worker1', 20.15],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/workers/worker2.w1/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.current.shared).toBe(64);
      expect(processed.data.current.solo).toBe(0);
      expect(processed.data.current.times).toBe(0);
      expect(processed.data.status.hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'workers', 'worker2.w1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleWorkersSpecific API endpoint [2]', (done) => {
    const commands = [
      ['hset', 'Bitcoin:payments:generate', 'worker2', 255.17],
      ['hset', 'Bitcoin:payments:generate', 'worker3', 0],
      ['hset', 'Bitcoin:payments:immature', 'worker2', 12.17],
      ['hset', 'Bitcoin:payments:immature', 'worker3', 76.4],
      ['hset', 'Bitcoin:payments:paid', 'worker1', 0],
      ['hset', 'Bitcoin:payments:paid', 'worker2', 123.5],
      ['hset', 'Bitcoin:payments:paid', 'worker3', 45.66],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false }), 64],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker1', solo: true }), 32],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker3', solo: false }), 8],
      ['hincrbyfloat', 'Bitcoin:rounds:current:shares', JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false }), 44],
      ['hincrbyfloat', 'Bitcoin:rounds:current:times', 'worker1', 20.15],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false, difficulty: 64 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker1', solo: true, difficulty: 32 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker3', solo: false, difficulty: 8 })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 1, worker: 'worker2.w2', solo: false, difficulty: 44 })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/workers/worker1/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.current.shared).toBe(0);
      expect(processed.data.current.solo).toBe(64);
      expect(processed.data.current.times).toBe(20.15);
      expect(processed.data.status.hashrate).toBe(916259689.8133334);
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'workers', 'worker1');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });

  test('Test handleWorkers API endpoint', (done) => {
    const commands = [
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w1', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker1', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker3', solo: false })],
      ['zadd', 'Bitcoin:rounds:current:hashrate', Date.now() / 1000, JSON.stringify({ time: 0, worker: 'worker2.w2', solo: false })]];
    const response = mockResponse();
    response.on('end', (payload) => {
      const processed = JSON.parse(payload);
      expect(processed.coin).toBe('Bitcoin');
      expect(processed.endpoint).toBe('/workers/');
      expect(processed.response.code).toBe(200);
      expect(processed.response.message).toBe('');
      expect(typeof processed.data).toBe('object');
      expect(processed.data.length).toBe(4);
      expect(processed.data[0]).toBe('worker1');
      expect(processed.data[1]).toBe('worker2.w1');
      expect(processed.data[2]).toBe('worker2.w2');
      expect(processed.data[3]).toBe('worker3');
      done();
    });
    mockSetupClient(client, commands, 'Bitcoin', () => {
      const request = mockRequest('Bitcoin', 'workers');
      const poolApi = new PoolApi(client, partnerConfigs, poolConfigs, portalConfig);
      poolApi.handleApiV1(request, response);
    });
  });
});
