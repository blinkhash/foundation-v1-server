/*
 *
 * Example (Main)
 *
 */

const config = {};

// Logger Configuration
config.logger = {};
config.logger.logColors = true;
config.logger.logLevel = 'debug';

// Clustering Configuration
config.clustering = {};
config.clustering.enabled = true;
config.clustering.forks = 'auto';

// Redis Configuration
config.redis = {};
config.redis.host = '127.0.0.1';
config.redis.port = 6379;
config.redis.password = '';

// Server Configuration
config.server = {};
config.server.host = '127.0.0.1';
config.server.port = 3001;

// Export Configuration
module.exports = config;
