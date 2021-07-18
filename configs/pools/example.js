/*
 *
 * Example (Pools)
 *
 */

const config = {};

// Main Configuration
config.enabled = false;
config.featured = false;
config.address = 'example';
config.debug = false;
config.identifier = 'https://github.com/blinkhash/blinkhash-server';
config.logo = '';

// Coin Configuration
config.coin = {};
config.coin.name = 'Bitcoin';
config.coin.symbol = 'BTC';
config.coin.asicBoost = true;
config.coin.getInfo = false;
config.coin.segwit = true;
config.coin.rewards = '';

// Algorithm Configuration
config.coin.algorithms = {};
config.coin.algorithms.mining = 'sha256d';
config.coin.algorithms.block = 'sha256d';
config.coin.algorithms.coinbase = 'sha256d';

// Mainnet Configuration
config.coin.mainnet = {};
config.coin.mainnet.bech32 = 'bc';
config.coin.mainnet.bip32 = {};
config.coin.mainnet.bip32.public = Buffer.from('0488B21E', 'hex').readUInt32LE(0);
config.coin.mainnet.bip32.private = Buffer.from('0488ADE4', 'hex').readUInt32LE(0);
config.coin.mainnet.peerMagic = 'f9beb4d9';
config.coin.mainnet.pubKeyHash = Buffer.from('00', 'hex').readUInt8(0);
config.coin.mainnet.scriptHash = Buffer.from('05', 'hex').readUInt8(0);
config.coin.mainnet.wif = Buffer.from('80', 'hex').readUInt8(0);
config.coin.mainnet.coin = 'btc';

// Testnet Configuration
config.coin.testnet = {};
config.coin.testnet.bech32 = 'tb';
config.coin.testnet.bip32 = {};
config.coin.testnet.bip32.public = Buffer.from('043587CF', 'hex').readUInt32LE(0);
config.coin.testnet.bip32.private = Buffer.from('04358394', 'hex').readUInt32LE(0);
config.coin.testnet.peerMagic = '0b110907';
config.coin.testnet.pubKeyHash = Buffer.from('6F', 'hex').readUInt8(0);
config.coin.testnet.scriptHash = Buffer.from('C4', 'hex').readUInt8(0);
config.coin.testnet.wif = Buffer.from('EF', 'hex').readUInt8(0);
config.coin.testnet.coin = 'btc';

// Daemon Configuration
config.daemons = [];

const daemons1 = {};
daemons1.host = '127.0.0.1';
daemons1.port = 8332;
daemons1.username = '';
daemons1.password = '';
config.daemons.push(daemons1);

// Payment Configuration
config.payments = {};
config.payments.enabled = true;
config.payments.checkInterval = 20;
config.payments.paymentInterval = 7200;
config.payments.minConfirmations = 10;
config.payments.minPayment = 0.005;
config.payments.transactionFee = 0.0004;
config.payments.daemon = {};
config.payments.daemon.host = '127.0.0.1';
config.payments.daemon.port = 8332;
config.payments.daemon.username = '';
config.payments.daemon.password = '';

// Banning Configuration
config.banning = {};
config.banning.time = 600;
config.banning.invalidPercent = 0.5;
config.banning.checkThreshold = 500;
config.banning.purgeInterval = 300;

// Port Configuration
config.ports = [];

const ports1 = {};
ports1.port = 3002;
ports1.enabled = true;
ports1.type = 'shared';
ports1.difficulty = {};
ports1.difficulty.initial = 32;
ports1.difficulty.minimum = 8;
ports1.difficulty.maximum = 512;
ports1.difficulty.targetTime = 15;
ports1.difficulty.retargetTime = 90;
ports1.difficulty.variance = 0.3;
config.ports.push(ports1);

// Recipients Configuration
config.recipients = [];

const recipient1 = {};
recipient1.address = 'example';
recipient1.percentage = 0.05;
config.recipients.push(recipient1);

// P2P Configuration
config.p2p = {};
config.p2p.enabled = true;
config.p2p.host = '127.0.0.1';
config.p2p.port = 8333;

// Settings Configuration
config.settings = {};
config.settings.blockRefreshInterval = 1000;
config.settings.connectionTimeout = 600;
config.settings.emitInvalidBlockHashes = false;
config.settings.hashrateWindow = 300;
config.settings.jobRebroadcastTimeout = 60;
config.settings.tcpProxyProtocol = false;
config.settings.validateWorkerUsername = true;

// Export Configuration
module.exports = config;
