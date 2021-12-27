/*
 *
 * Daemon (Mock)
 *
 */

const nock = require('nock');

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

////////////////////////////////////////////////////////////////////////////////

exports.mockDuplicateRounds = function() {
  const response = [
    {
      id: 'nocktest',
      error: null,
      result: { 'confirmations': 10 }
    },
    {
      id: 'nocktest',
      error: null,
      result: { 'confirmations': -1 }
    },
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 2))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockDuplicateBlocks = function() {
  const response = [
    {
      id: 'nocktest',
      error: null,
      result: { 'confirmations': 10 }
    },
    {
      id: 'nocktest',
      error: null,
      result: { 'confirmations': 10 }
    },
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 2))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetAddressInfo = function() {
  const response = {
    'address': 'tb1qa0zev5j6tpvu9sjlt3evkzzm9u2pcnfe94qm6v',
    'scriptPubKey': '0014ebc596525a5859c2c25f5c72cb085b2f141c4d39',
    'ismine': true,
    'solvable': true,
    'desc': 'wpkh([d62a9d16/0\'/0\'/0\']0327f696589a4b7366ef12312a8b5a5b11ffb56f817b4b10f18eec939339f78c41)#7jenc2fq',
    'iswatchonly': false,
    'isscript': false,
    'iswitness': true,
    'witness_version': 0,
    'witness_program': 'ebc596525a5859c2c25f5c72cb085b2f141c4d39',
    'pubkey': '0327f696589a4b7366ef12312a8b5a5b11ffb56f817b4b10f18eec939339f78c41',
    'ischange': false,
    'timestamp': 1620585313,
    'hdkeypath': 'm/0\'/0\'/0\'',
    'hdseedid': '6ef9b0dbd268f043f7c684f9ec8a45bea9b5cc72',
    'hdmasterfingerprint': 'd62a9d16',
    'labels': [ '' ]
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getaddressinfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockGetMiningInfo = function() {
  const response = {
    blocks: 611207,
    currentblocksize: 1000,
    currentblocktx: 0,
    difficulty: 0.001978989105730653,
    networkhashps: 52007.68563030699,
    pooledtx: 0,
    chain: 'test',
    warnings: 'Warning: unknown new rules activated (versionbit 3)'
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getmininginfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockGetMiningInfoError1 = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getmininginfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: { code: -5 },
      result: null,
    })
    );
};

exports.mockGetBalance = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getbalance')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: 687.50089138,
      error: null,
    })
    );
};

exports.mockGetBalanceInvalid = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getbalance')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: '687.5008/134#9138',
      error: null,
    })
    );
};

// Mock GetBlockchainInfo Command
exports.mockGetBlockchainInfo = function() {
  const response = {
    'chain': 'test',
    'blocks': 1972578,
    'headers': 1972578,
    'bestblockhash': '00000000000000060d6237a02663c8349a53a31643f885dcfd5964c21d4d7bff',
    'difficulty': 137403310.5898755,
    'mediantime': 1619285398,
    'verificationprogress': 0.9999994240210751,
    'initialblockdownload': false,
    'chainwork': '000000000000000000000000000000000000000000000481e9b8863a961dd431',
    'size_on_disk': 10183079035,
    'pruned': true,
    'pruneheight': 1408279,
    'automatic_pruning': true,
    'prune_target_size': 10485760000,
    'softforks': {},
    'warnings': 'Warning: unknown new rules activated (versionbit 28)'
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getblockchaininfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

// Mock GetBlockTemplate Command
exports.mockGetBlockTemplate = function() {
  const response = {
    'capabilities': ['proposal'],
    'version': 536870912,
    'rules': ['csv', '!segwit'],
    'vbavailable': {},
    'vbrequired': 0,
    'previousblockhash': '000000000000001af03bed83ba8cefd1588ce5c8a3d82b5f80db0e5f12d7d2fc',
    'transactions': [],
    'coinbaseaux': {},
    'coinbasevalue': 9800773,
    'longpollid': '000000000000001af03bed83ba8cefd1588ce5c8a3d82b5f80db0e5f12d7d2fc197126',
    'target': '000000000000001f41f400000000000000000000000000000000000000000000',
    'mintime': 1619285535,
    'mutable': ['time', 'transactions', 'prevblock'],
    'noncerange': '00000000ffffffff',
    'sigoplimit': 80000,
    'sizelimit': 4000000,
    'weightlimit': 4000000,
    'curtime': 1619290195,
    'bits': '191f41f4',
    'height': 1972580,
    'default_witness_commitment': '6a24aa21a9edcb1adcc76efeb174c451b8682c8c23e377c0f7b31c6dab0d3b4bfdda74c95e9c'
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getblocktemplate')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

// Mock Initial Batch Request
exports.mockGetInitialBatch = function() {
  const response = [
    {
      id: 'nocktest',
      error: null,
      result: {
        'isvalid': true,
        'address': 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw',
        'scriptPubKey': '0014c61ff12ea94ac5b09b84ce80764d33471f1271c1',
        'isscript': false,
        'iswitness': true,
        'witness_version': 0,
        'witness_program': 'c61ff12ea94ac5b09b84ce80764d33471f1271c1'
      }
    },
    {
      id: 'nocktest',
      error: null,
      result: {
        'blocks': 1972577,
        'currentblockweight': 16427,
        'currentblocktx': 14,
        'difficulty': 1,
        'networkhashps': 438518351881541.6,
        'pooledtx': 22,
        'chain': 'test',
        'warnings': 'Warning: unknown new rules activated (versionbit 28)'
      }
    },
    {
      id: 'nocktest',
      error: {
        'code': -1,
        'message': null,
      },
      result: null
    },
    {
      id: 'nocktest',
      error: null,
      result: {
        'chain': 'test',
        'blocks': 1972578,
        'headers': 1972578,
        'bestblockhash': '00000000000000060d6237a02663c8349a53a31643f885dcfd5964c21d4d7bff',
        'difficulty': 137403310.5898755,
        'mediantime': 1619285398,
        'verificationprogress': 0.9999994240210751,
        'initialblockdownload': false,
        'chainwork': '000000000000000000000000000000000000000000000481e9b8863a961dd431',
        'size_on_disk': 10183079035,
        'pruned': true,
        'pruneheight': 1408279,
        'automatic_pruning': true,
        'prune_target_size': 10485760000,
        'softforks': {},
        'warnings': 'Warning: unknown new rules activated (versionbit 28)'
      }
    },
    {
      id: 'nocktest',
      error: null,
      result: {
        'version': 210000,
        'subversion': '/Satoshi:0.21.0/',
        'protocolversion': 70016,
        'localservices': '0000000000000408',
        'localservicesnames': [],
        'localrelay': true,
        'timeoffset': 0,
        'networkactive': true,
        'connections': 30,
        'connections_in': 20,
        'connections_out': 10,
        'networks': [],
        'relayfee': 0.00001,
        'incrementalfee': 0.00001,
        'localaddresses': [],
        'warnings': 'Warning: unknown new rules activated (versionbit 28)'
      }
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 3))
    .reply(200, JSON.stringify(response)
    );
};

// Mock GetPeerInfo Command
exports.mockGetPeerInfo = function() {
  const response = [{
    'id': 0,
    'addr': '00.00.00.00:18333',
    'addrbind': '00.00.00.00:34916',
    'addrlocal': '00.00.00.00:34916',
    'network': 'ipv4',
    'services': '000000000000040d',
    'relaytxes': false,
    'lastsend': 1618673060,
    'lastrecv': 1618673060,
    'last_transaction': 0,
    'last_block': 0,
    'bytessent': 610183,
    'bytesrecv': 568071,
    'conntime': 1617843983,
    'timeoffset': -1,
    'pingtime': 0.096146,
    'minping': 0.090799,
    'version': 70015,
    'subver': '/Satoshi:0.18.0/',
    'inbound': false,
    'startingheight': 1970529,
    'synced_headers': 1971786,
    'synced_blocks': 1971786,
    'minfeefilter': 0.00000000,
    'connection_type': 'block-relay-only'
  }];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'getpeerinfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockGetTransactionsGenerate = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'amount': 11.87510021,
            'label': '',
            'vout': 1
          },
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'amount': 0.62500527,
            'label': '',
            'vout': 2
          }
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsImmature = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'immature',
            'amount': 11.87510021,
            'label': '',
            'vout': 1
          },
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'immature',
            'amount': 0.62500527,
            'label': '',
            'vout': 2
          }
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsOrphan = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'orphan',
            'amount': 11.87510021,
            'label': '',
            'vout': 1
          },
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'orphan',
            'amount': 0.62500527,
            'label': '',
            'vout': 2
          }
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsSingle = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'amount': 11.87510021,
            'label': '',
            'vout': 1
          },
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsSplit = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': '0:tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'amount': 11.87510021,
            'label': '',
            'vout': 1
          },
          {
            'address': '1:tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'amount': 0.62500527,
            'label': '',
            'vout': 2
          }
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsValue = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'value': 11.87510021,
            'label': '',
            'vout': 1
          },
          {
            'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
            'category': 'generate',
            'value': 0.62500527,
            'label': '',
            'vout': 2
          }
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsError1 = function() {
  const response = [
    {
      result: {},
      error: { code: -5 },
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsError2 = function() {
  const response = [
    {
      result: {},
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsError3 = function() {
  const response = [
    {
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockGetTransactionsError4 = function() {
  const response = [
    {
      result: {
        'amount': 12.50010548,
        'confirmations': 8025,
        'generated': true,
        'blockhash': 'ec336911046ee016e65f237bea6be2d480adc199a218e04db328c840871a4050',
        'blockindex': 0,
        'blocktime': 1621214597,
        'txid': 'efaab94af3973b6d1148d030a75abbea6b5e2af4e4c989738393a55e1d44fd2c',
        'walletconflicts': [],
        'time': 1621214597,
        'timereceived': 1621214619,
        'bip125-replaceable': 'no',
        'details': [
          {
            'address': '',
            'category': 'generate',
            'amount': 11.87510021,
            'label': '',
            'vout': 1
          },
          {
            'address': '',
            'category': 'generate',
            'amount': 0.62500527,
            'label': '',
            'vout': 2
          }
        ],
        'hex': '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff400302f91c0485c5a1600840000001000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ed76be2ad9979cec5de07dd66c259327061a78a1c3c21fc770f96d5f2bbba327e105f7c74600000000160014ebc454c07d0059d82132d63caed0a2599e6b9589afaeb90300000000160014ebc454c07d0059d82132d63caed0a2599e6b95890120000000000000000000000000000000000000000000000000000000000000000000000000'
      },
      error: null,
      id: 1621968566366
    }
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => (Array.isArray(body) && body.length >= 1))
    .reply(200, JSON.stringify(response)
    );
};

exports.mockListUnspent = function() {
  const response = [
    {
      'txid': 'ef96b2787bae51e147f6bf10bba38ce88ac45d52f8f1f1474d3a8566f97b9305',
      'vout': 1,
      'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
      'label': '',
      'scriptPubKey': '0014ebc454c07d0059d82132d63caed0a2599e6b9589',
      'amount': 11.875,
      'confirmations': 20533,
      'spendable': true,
      'solvable': true,
      'desc': 'wpkh([e046bc57/0\'/0\'/1\']02153745d8d712267913cf4197e6a135a9d4b32f3389b060f9ee720cf086af64b5)#pj07q5a6',
      'safe': true
    },
    {
      'txid': 'ef96b2787bae51e147f6bf10bba38ce88ac45d52f8f1f1474d3a8566f97b9305',
      'vout': 1,
      'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
      'label': '',
      'scriptPubKey': '0014ebc454c07d0059d82132d63caed0a2599e6b9589',
      'amount': 11.875,
      'confirmations': 20534,
      'spendable': true,
      'solvable': true,
      'desc': 'wpkh([e046bc57/0\'/0\'/1\']02153745d8d712267913cf4197e6a135a9d4b32f3389b060f9ee720cf086af64b5)#pj07q5a6',
      'safe': true
    },
    {
      'txid': 'ef96b2787bae51e147f6bf10bba38ce88ac45d52f8f1f1474d3a8566f97b9305',
      'vout': 1,
      'address': 'tltc1qa0z9fsraqpvasgfj6c72a59ztx0xh9vfv9ccwd',
      'label': '',
      'scriptPubKey': '0014ebc454c07d0059d82132d63caed0a2599e6b9589',
      'amount': null,
      'confirmations': 20535,
      'spendable': true,
      'solvable': true,
      'desc': 'wpkh([e046bc57/0\'/0\'/1\']02153745d8d712267913cf4197e6a135a9d4b32f3389b060f9ee720cf086af64b5)#pj07q5a6',
      'safe': true
    },
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'listunspent')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockListUnspentEmpty = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'listunspent')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: [],
    })
    );
};

exports.mockListUnspentInvalid = function() {
  const response = [
    {
      'txid': 'ef96b2787bae51e147f6bf10bba38ce88ac45d52f8f1f1474d3a8566f97b9305',
      'vout': 1,
      'address': null,
      'label': '',
      'scriptPubKey': '0014ebc454c07d0059d82132d63caed0a2599e6b9589',
      'amount': 11.875,
      'confirmations': 20533,
      'spendable': true,
      'solvable': true,
      'desc': 'wpkh([e046bc57/0\'/0\'/1\']02153745d8d712267913cf4197e6a135a9d4b32f3389b060f9ee720cf086af64b5)#pj07q5a6',
      'safe': true
    },
  ];
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'listunspent')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockSendMany = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'sendmany')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: 'transactionID',
      error: null,
    })
    );
};

exports.mockSendManyError1 = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'sendmany')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: null,
      error: null,
    })
    );
};

exports.mockSendManyError2 = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'sendmany')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: null,
      error: { code: -5 },
    })
    );
};

exports.mockSendManyError3 = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'sendmany')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: null,
      error: { code: -6 },
    })
    );
};

exports.mockSendManyError4 = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'sendmany')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: null,
      error: { message: 'error' },
    })
    );
};

exports.mockSendManyError5 = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'sendmany')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      result: null,
      error: true,
    })
    );
};

exports.mockValidateAddress = function() {
  const response = {
    'isvalid': true,
    'address': 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw',
    'scriptPubKey': '0014c61ff12ea94ac5b09b84ce80764d33471f1271c1',
    'isscript': false,
    'iswitness': true,
    'witness_version': 0,
    'witness_program': 'c61ff12ea94ac5b09b84ce80764d33471f1271c1'
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'validateaddress')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockValidateAddressError = function() {
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'validateaddress')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: { error: true },
      result: {},
    })
    );
};

exports.mockAuxiliaryValidateAddressError = function() {
  nock('http://127.0.0.1:8336')
    .persist()
    .post('/', body => body.method === 'validateaddress')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: { error: true },
      result: {},
    })
    );
};

exports.mockValidateAddressInvalid = function() {
  const response = {
    'isvalid': false,
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'validateaddress')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

exports.mockValidateAddressSecondary = function() {
  const response = {
    'isvalid': true,
    'ismine': true,
    'address': 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw',
    'scriptPubKey': '0014c61ff12ea94ac5b09b84ce80764d33471f1271c1',
    'isscript': false,
    'iswitness': true,
    'witness_version': 0,
    'witness_program': 'c61ff12ea94ac5b09b84ce80764d33471f1271c1'
  };
  nock('http://127.0.0.1:8332')
    .persist()
    .post('/', body => body.method === 'validateaddress')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: response,
    })
    );
};

// Mock Daemon Process
exports.mockDaemon = function() {
  exports.mockGetInitialBatch();
  exports.mockGetBlockchainInfo();
  exports.mockGetBlockTemplate();
  exports.mockGetPeerInfo();
};
