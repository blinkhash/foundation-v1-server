/*
 *
 * Example (Pools)
 *
 */

// Main Configuration
////////////////////////////////////////////////////////////////////////////////

// Miscellaneous Configuration
const config = {};
config.enabled = false;
config.name = 'Pool1';
config.coins = ['Bitcoin'];

// Banning Configuration
config.banning = {};
config.banning.time = 600;
config.banning.invalidPercent = 50;
config.banning.checkThreshold = 500;
config.banning.purgeInterval = 300;

// Port Configuration
config.ports = [];

const ports1 = {};
ports1.port = 3002;
ports1.enabled = true;
ports1.type = 'shared';
ports1.tls = false;
ports1.difficulty = {};
ports1.difficulty.initial = 32;
ports1.difficulty.minimum = 8;
ports1.difficulty.maximum = 512;
ports1.difficulty.targetTime = 15;
ports1.difficulty.retargetTime = 90;
ports1.difficulty.variance = 0.3;
config.ports.push(ports1);

const ports2 = {};
ports2.port = 3003;
ports2.enabled = true;
ports2.type = 'solo';
ports2.tls = false;
ports2.difficulty = {};
ports2.difficulty.initial = 32;
ports2.difficulty.minimum = 8;
ports2.difficulty.maximum = 512;
ports2.difficulty.targetTime = 15;
ports2.difficulty.retargetTime = 90;
ports2.difficulty.variance = 0.3;
config.ports.push(ports2);

// P2P Configuration
config.p2p = {};
config.p2p.enabled = true;
config.p2p.host = '127.0.0.1';
config.p2p.port = 8333;

// Statistics Configuration
config.statistics = {};
config.statistics.blocksInterval = 20; // s;
config.statistics.hashrateInterval = 20; // s;
config.statistics.historicalInterval = 1800; // s;
config.statistics.refreshInterval = 20; // s;
config.statistics.paymentsInterval = 20; // s;
config.statistics.hashrateWindow = 300; // s;
config.statistics.historicalWindow = 86400; // s;

// Settings Configuration
config.settings = {};
config.settings.blockRefreshInterval = 1000; // ms;
config.settings.connectionTimeout = 600; // s;
config.settings.jobRebroadcastTimeout = 60; // s;
config.settings.tcpProxyProtocol = false;

// Primary Configuration
////////////////////////////////////////////////////////////////////////////////

// Miscellaneous Configuration
config.primary = {};
config.primary.address = 'example';

// Coin Configuration
config.primary.coin = {};
config.primary.coin.name = 'Bitcoin';
config.primary.coin.symbol = 'BTC';
config.primary.coin.asicboost = true;
config.primary.coin.getinfo = false;
config.primary.coin.hybrid = false;
config.primary.coin.parameters = {};
config.primary.coin.segwit = true;
config.primary.coin.version = 4;

// Algorithm Configuration
config.primary.coin.algorithms = {};
config.primary.coin.algorithms.mining = 'sha256d';
config.primary.coin.algorithms.block = 'sha256d';
config.primary.coin.algorithms.coinbase = 'sha256d';

// Rewards Configuration
config.primary.coin.rewards = {};
config.primary.coin.rewards.type = '';
config.primary.coin.rewards.addresses = [];

// Mainnet Configuration
config.primary.coin.mainnet = {};
config.primary.coin.mainnet.bech32 = 'bc';
config.primary.coin.mainnet.bip32 = {};
config.primary.coin.mainnet.bip32.public = Buffer.from('0488B21E', 'hex').readUInt32LE(0);
config.primary.coin.mainnet.bip32.private = Buffer.from('0488ADE4', 'hex').readUInt32LE(0);
config.primary.coin.mainnet.peerMagic = 'f9beb4d9';
config.primary.coin.mainnet.pubKeyHash = Buffer.from('00', 'hex').readUInt8(0);
config.primary.coin.mainnet.scriptHash = Buffer.from('05', 'hex').readUInt8(0);
config.primary.coin.mainnet.wif = Buffer.from('80', 'hex').readUInt8(0);
config.primary.coin.mainnet.coin = 'btc';

// Testnet Configuration
config.primary.coin.testnet = {};
config.primary.coin.testnet.bech32 = 'tb';
config.primary.coin.testnet.bip32 = {};
config.primary.coin.testnet.bip32.public = Buffer.from('043587CF', 'hex').readUInt32LE(0);
config.primary.coin.testnet.bip32.private = Buffer.from('04358394', 'hex').readUInt32LE(0);
config.primary.coin.testnet.peerMagic = '0b110907';
config.primary.coin.testnet.pubKeyHash = Buffer.from('6F', 'hex').readUInt8(0);
config.primary.coin.testnet.scriptHash = Buffer.from('C4', 'hex').readUInt8(0);
config.primary.coin.testnet.wif = Buffer.from('EF', 'hex').readUInt8(0);
config.primary.coin.testnet.coin = 'btc';

// Daemon Configuration
config.primary.daemons = [];

const daemons1 = {};
daemons1.host = '127.0.0.1';
daemons1.port = 8332;
daemons1.username = '';
daemons1.password = '';
config.primary.daemons.push(daemons1);

// Payment Configuration
config.primary.payments = {};
config.primary.payments.enabled = true;
config.primary.payments.checkInterval = 20; // s;
config.primary.payments.paymentInterval = 7200; // s;
config.primary.payments.minConfirmations = 10;
config.primary.payments.minPayment = 0.005;
config.primary.payments.transactionFee = 0.0004;
config.primary.payments.daemon = {};
config.primary.payments.daemon.host = '127.0.0.1';
config.primary.payments.daemon.port = 8332;
config.primary.payments.daemon.username = '';
config.primary.payments.daemon.password = '';

// Recipients Configuration
config.primary.recipients = [];

const recipient1 = {};
recipient1.address = 'example';
recipient1.percentage = 0.05;
config.primary.recipients.push(recipient1);

// Export Configuration
module.exports = config;
