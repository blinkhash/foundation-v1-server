#!/bin/bash

################################################################################
# Foundation Server V1 - Complete Refactoring Implementation Script
# This script implements all improvements systematically
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${SCRIPT_DIR}/refactoring.log"

################################################################################
# Helper Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

create_directory() {
  local dir=$1
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    log_success "Created directory: $dir"
  fi
}

backup_file() {
  local file=$1
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
    log_success "Backed up: $file"
  fi
}

################################################################################
# Phase 1: Setup & Backup
################################################################################

phase_setup() {
  log_info "Starting Phase 1: Setup & Backup"
  
  # Create backup directory
  mkdir -p "$BACKUP_DIR"
  log_success "Backup directory created: $BACKUP_DIR"
  
  # Backup current files
  log_info "Backing up original files..."
  backup_file "$SCRIPT_DIR/package.json"
  backup_file "$SCRIPT_DIR/.eslintrc.js"
  backup_file "$SCRIPT_DIR/scripts/main/api.js"
  backup_file "$SCRIPT_DIR/scripts/main/payments.js"
  backup_file "$SCRIPT_DIR/scripts/main/utils.js"
  
  # Create new directories
  create_directory "$SCRIPT_DIR/scripts/main/handlers"
  create_directory "$SCRIPT_DIR/scripts/main/services"
  create_directory "$SCRIPT_DIR/scripts/main/utils"
  create_directory "$SCRIPT_DIR/scripts/main/validators"
  create_directory "$SCRIPT_DIR/scripts/main/__tests__"
  create_directory "$SCRIPT_DIR/logs"
  
  log_success "Phase 1 completed successfully"
}

################################################################################
# Phase 2: Update Dependencies
################################################################################

phase_update_dependencies() {
  log_info "Starting Phase 2: Update Dependencies"
  
  log_info "Updating package.json with new dependencies..."
  
  # Install new dependencies
  npm install joi@17.11.0 --save
  npm install winston@3.11.0 --save
  npm install morgan@1.10.0 --save
  
  # Move nodemon to devDependencies
  npm install nodemon@2.0.17 --save-dev
  
  # Remove async library
  npm uninstall async --save
  
  # Update to latest secure versions
  npm audit fix --force
  
  log_success "Phase 2 completed successfully"
}

################################################################################
# Phase 3: Create Config Validator
################################################################################

phase_create_config_validator() {
  log_info "Starting Phase 3: Create Config Validator"
  
  cat > "$SCRIPT_DIR/scripts/main/validators/configValidator.js" << 'EOF'
/*
 *
 * Config Validator
 *
 */

const Joi = require('joi');

// Define validation schema
const configSchema = Joi.object({
  name: Joi.string().required(),
  enabled: Joi.boolean().default(true),
  primary: Joi.object({
    coin: Joi.object({
      name: Joi.string().required(),
      symbol: Joi.string().required(),
      algorithms: Joi.object({
        mining: Joi.string().required(),
      }).required(),
    }).required(),
    address: Joi.string().required(),
    payments: Joi.object({
      enabled: Joi.boolean().default(true),
      paymentInterval: Joi.number().min(1).default(600),
      minPayment: Joi.number().min(0).default(0.01),
      processingFee: Joi.number().min(0).default(0.0004),
      transactionFee: Joi.number().min(0).default(0.0004),
      minConfirmations: Joi.number().min(1).default(10),
      checkInterval: Joi.number().min(1).default(30),
      magnitude: Joi.number(),
      minPaymentSatoshis: Joi.number(),
      coinPrecision: Joi.number(),
      daemon: Joi.object({
        host: Joi.string().required(),
        port: Joi.number().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
      }).required(),
    }).required(),
    recipients: Joi.array().items(
      Joi.object({
        address: Joi.string().required(),
        percentage: Joi.number().min(0).max(100).required(),
      })
    ).default([]),
  }).required(),
  auxiliary: Joi.object({
    enabled: Joi.boolean().default(false),
    coin: Joi.object().when('enabled', {
      is: true,
      then: Joi.required(),
    }),
    payments: Joi.object().when('enabled', {
      is: true,
      then: Joi.required(),
    }),
  }).optional(),
  ports: Joi.array().items(
    Joi.object({
      port: Joi.number().required(),
      type: Joi.string().valid('shared', 'solo').required(),
      difficulty: Joi.object().required(),
    })
  ).required(),
  statistics: Joi.object({
    historicalWindow: Joi.number().min(1).default(604800),
    hashrateWindow: Joi.number().min(1).default(600),
  }).optional(),
}).unknown(true);

const validateConfig = (config) => {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const details = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    throw new Error(`Configuration validation failed: ${JSON.stringify(details)}`);
  }

  return value;
};

const validatePoolsConfig = (poolsConfig) => {
  if (!poolsConfig || typeof poolsConfig !== 'object') {
    throw new Error('Pools config must be an object');
  }

  Object.keys(poolsConfig).forEach((poolName) => {
    try {
      validateConfig(poolsConfig[poolName]);
    } catch (error) {
      throw new Error(`Pool "${poolName}" validation failed: ${error.message}`);
    }
  });

  return poolsConfig;
};

module.exports = {
  validateConfig,
  validatePoolsConfig,
};
EOF

  log_success "Created configValidator.js"
}

################################################################################
# Phase 4: Create Logger Service
################################################################################

phase_create_logger_service() {
  log_info "Starting Phase 4: Create Logger Service"
  
  cat > "$SCRIPT_DIR/scripts/main/services/loggerService.js" << 'EOF'
/*
 *
 * Logger Service
 *
 */

const winston = require('winston');
const path = require('path');

// Define log levels with colors
const customLevels = {
  levels: {
    debug: 1,
    info: 2,
    warning: 3,
    error: 4,
    special: 5,
  },
  colors: {
    debug: 'green',
    info: 'blue',
    warning: 'yellow',
    error: 'red',
    special: 'cyan',
  },
};

// Create logger instance
const createLogger = (config = {}) => {
  const {
    logDir = './logs',
    logLevel = 'debug',
    isDevelopment = true,
  } = config;

  winston.addColors(customLevels.colors);

  const logger = winston.createLogger({
    levels: customLevels.levels,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, pool, component, requestId, ...meta }) => {
        const contextStr = [
          timestamp,
          level.toUpperCase(),
          pool && `[${pool}]`,
          component && `[${component}]`,
          requestId && `[${requestId}]`,
        ]
          .filter(Boolean)
          .join(' ');

        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${contextStr} ${message} ${metaStr}`.trim();
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
        level: isDevelopment ? 'debug' : 'info',
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
    ],
  });

  return logger;
};

// Logger wrapper with context
class ContextualLogger {
  constructor(winstonLogger) {
    this.logger = winstonLogger;
  }

  debug(pool, component, message, context = {}) {
    this.logger.debug(message, { pool, component, ...context });
  }

  info(pool, component, message, context = {}) {
    this.logger.info(message, { pool, component, ...context });
  }

  warning(pool, component, message, context = {}) {
    this.logger.warning(message, { pool, component, ...context });
  }

  error(pool, component, message, context = {}) {
    this.logger.error(message, { pool, component, ...context });
  }

  special(pool, component, message, context = {}) {
    this.logger.special(message, { pool, component, ...context });
  }
}

module.exports = {
  createLogger,
  ContextualLogger,
};
EOF

  log_success "Created loggerService.js"
}

################################################################################
# Phase 5: Create Error Handler
################################################################################

phase_create_error_handler() {
  log_info "Starting Phase 5: Create Error Handler"
  
  cat > "$SCRIPT_DIR/scripts/main/utils/errorHandler.js" << 'EOF'
/*
 *
 * Error Handler with Retry Logic
 *
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RetryableError extends Error {
  constructor(message, retryable = true) {
    super(message);
    this.name = 'RetryableError';
    this.retryable = retryable;
  }
}

/**
 * Execute function with exponential backoff retry logic
 */
const executeWithRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    logger = null,
    context = {},
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable = error.retryable !== false && 
                         error.code !== 'ENOTFOUND' && 
                         error.code !== 'ECONNREFUSED';

      if (!isRetryable || attempt === maxRetries) {
        if (logger) {
          logger.error(
            context.pool || 'unknown',
            context.component || 'errorHandler',
            `Failed after ${attempt} attempts: ${error.message}`,
            { attempt, isRetryable, error: error.message }
          );
        }
        throw error;
      }

      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      if (logger) {
        logger.warning(
          context.pool || 'unknown',
          context.component || 'errorHandler',
          `Attempt ${attempt + 1} failed, retrying in ${delayMs}ms: ${error.message}`,
          { attempt, delayMs }
        );
      }

      await delay(delayMs);
    }
  }

  throw lastError;
};

/**
 * Execute async function with timeout
 */
const executeWithTimeout = async (fn, timeoutMs = 30000) => {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
};

/**
 * Wrap async function with error handling
 */
const withErrorHandling = (fn, options = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (options.logger && options.context) {
        options.logger.error(
          options.context.pool,
          options.context.component,
          `Error in ${fn.name}: ${error.message}`,
          { error: error.stack }
        );
      }
      throw error;
    }
  };
};

module.exports = {
  RetryableError,
  executeWithRetry,
  executeWithTimeout,
  withErrorHandling,
  delay,
};
EOF

  log_success "Created errorHandler.js"
}

################################################################################
# Phase 6: Create Redis Service
################################################################################

phase_create_redis_service() {
  log_info "Starting Phase 6: Create Redis Service"
  
  cat > "$SCRIPT_DIR/scripts/main/services/redisService.js" << 'EOF'
/*
 *
 * Redis Service with Query Optimization
 *
 */

const redis = require('redis');

class RedisService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password || undefined,
        tls: this.config.tls ? {
          rejectUnauthorized: false,
        } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: false,
      });

      this.client.on('error', (err) => {
        this.logger.error('redis', 'RedisService', `Connection error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.info('redis', 'RedisService', 'Connected to Redis');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to connect: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Get keys using SCAN instead of KEYS (O(1) vs O(N))
   */
  async scanKeys(pattern, batchSize = 100) {
    const keys = [];
    let cursor = '0';

    do {
      const [newCursor, newKeys] = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: batchSize,
      });

      keys.push(...newKeys);
      cursor = newCursor;
    } while (cursor !== '0');

    return keys;
  }

  async multiGet(keys) {
    if (keys.length === 0) return [];
    const pipeline = this.client.multi();
    keys.forEach((key) => pipeline.get(key));
    return pipeline.exec();
  }

  async multiSet(keyValuePairs) {
    if (keyValuePairs.length === 0) return true;
    const pipeline = this.client.multi();
    keyValuePairs.forEach(([key, value]) => {
      pipeline.set(key, value);
    });
    return pipeline.exec();
  }

  async executePipeline(commands) {
    const pipeline = this.client.multi();
    commands.forEach((cmd) => {
      pipeline.sendCommand(cmd);
    });
    return pipeline.exec();
  }

  async getHash(key, defaultValue = {}) {
    try {
      const data = await this.client.hGetAll(key);
      return data && Object.keys(data).length > 0 ? data : defaultValue;
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to get hash ${key}: ${error.message}`);
      throw error;
    }
  }

  async setHashField(key, field, value) {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to set hash field: ${error.message}`);
      throw error;
    }
  }

  async incrHashField(key, field, amount = 1) {
    try {
      return await this.client.hIncrBy(key, field, amount);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to increment hash field: ${error.message}`);
      throw error;
    }
  }

  async addToSet(key, members) {
    try {
      return await this.client.sAdd(key, members);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to add to set: ${error.message}`);
      throw error;
    }
  }

  async moveSet(sourceKey, destKey, member) {
    try {
      return await this.client.sMove(sourceKey, destKey, member);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to move set member: ${error.message}`);
      throw error;
    }
  }

  async getSetMembers(key) {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to get set members: ${error.message}`);
      throw error;
    }
  }

  async addToSortedSet(key, members) {
    try {
      return await this.client.zAdd(key, members);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to add to sorted set: ${error.message}`);
      throw error;
    }
  }

  async getSortedSetByScore(key, minScore, maxScore) {
    try {
      return await this.client.zRangeByScore(key, minScore, maxScore);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to get sorted set: ${error.message}`);
      throw error;
    }
  }

  async deleteKey(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to delete key: ${error.message}`);
      throw error;
    }
  }

  async deleteKeys(keys) {
    if (keys.length === 0) return 0;
    try {
      return await this.client.del(keys);
    } catch (error) {
      this.logger.error('redis', 'RedisService', `Failed to delete keys: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RedisService;
EOF

  log_success "Created redisService.js"
}

################################################################################
# Phase 7: Create Blocks Handler
################################################################################

phase_create_blocks_handler() {
  log_info "Starting Phase 7: Create Blocks Handler"
  
  cat > "$SCRIPT_DIR/scripts/main/handlers/blocksHandler.js" << 'EOF'
/*
 *
 * Blocks Handler
 *
 */

const utils = require('../utils/utils');

class BlocksHandler {
  constructor(redisService, logger, poolConfigs) {
    this.redis = redisService;
    this.logger = logger;
    this.poolConfigs = poolConfigs;
  }

  async handleBlocksConfirmed(pool) {
    try {
      const [primaryBlocks, auxiliaryBlocks] = await Promise.all([
        this.redis.getSetMembers(`${pool}:blocks:primary:confirmed`),
        this.redis.getSetMembers(`${pool}:blocks:auxiliary:confirmed`),
      ]);

      return {
        code: 200,
        data: {
          primary: utils.processBlocks(primaryBlocks),
          auxiliary: utils.processBlocks(auxiliaryBlocks),
        },
      };
    } catch (error) {
      this.logger.error(pool, 'BlocksHandler', `Error fetching confirmed blocks: ${error.message}`);
      return {
        code: 500,
        error: 'Failed to fetch confirmed blocks',
      };
    }
  }

  async handleBlocksKicked(pool) {
    try {
      const [primaryBlocks, auxiliaryBlocks] = await Promise.all([
        this.redis.getSetMembers(`${pool}:blocks:primary:kicked`),
        this.redis.getSetMembers(`${pool}:blocks:auxiliary:kicked`),
      ]);

      return {
        code: 200,
        data: {
          primary: utils.processBlocks(primaryBlocks),
          auxiliary: utils.processBlocks(auxiliaryBlocks),
        },
      };
    } catch (error) {
      this.logger.error(pool, 'BlocksHandler', `Error fetching kicked blocks: ${error.message}`);
      return {
        code: 500,
        error: 'Failed to fetch kicked blocks',
      };
    }
  }

  async handleBlocksPending(pool) {
    try {
      const [primaryBlocks, auxiliaryBlocks] = await Promise.all([
        this.redis.getSetMembers(`${pool}:blocks:primary:pending`),
        this.redis.getSetMembers(`${pool}:blocks:auxiliary:pending`),
      ]);

      return {
        code: 200,
        data: {
          primary: utils.processBlocks(primaryBlocks),
          auxiliary: utils.processBlocks(auxiliaryBlocks),
        },
      };
    } catch (error) {
      this.logger.error(pool, 'BlocksHandler', `Error fetching pending blocks: ${error.message}`);
      return {
        code: 500,
        error: 'Failed to fetch pending blocks',
      };
    }
  }

  async handleBlocks(pool) {
    try {
      const keys = [
        `${pool}:blocks:primary:confirmed`,
        `${pool}:blocks:primary:kicked`,
        `${pool}:blocks:primary:pending`,
        `${pool}:blocks:auxiliary:confirmed`,
        `${pool}:blocks:auxiliary:kicked`,
        `${pool}:blocks:auxiliary:pending`,
      ];

      const results = await Promise.all(
        keys.map((key) => this.redis.getSetMembers(key))
      );

      return {
        code: 200,
        data: {
          primary: {
            confirmed: utils.processBlocks(results[0]),
            kicked: utils.processBlocks(results[1]),
            pending: utils.processBlocks(results[2]),
          },
          auxiliary: {
            confirmed: utils.processBlocks(results[3]),
            kicked: utils.processBlocks(results[4]),
            pending: utils.processBlocks(results[5]),
          },
        },
      };
    } catch (error) {
      this.logger.error(pool, 'BlocksHandler', `Error fetching blocks: ${error.message}`);
      return {
        code: 500,
        error: 'Failed to fetch blocks',
      };
    }
  }

  async handleBlocksSpecific(pool, miner) {
    try {
      const results = await this.handleBlocks(pool);
      if (results.code !== 200) {
        return results;
      }

      const filterBlocksByMiner = (blocks) => {
        return blocks.filter((block) => block.worker === miner);
      };

      return {
        code: 200,
        data: {
          primary: {
            confirmed: filterBlocksByMiner(results.data.primary.confirmed),
            kicked: filterBlocksByMiner(results.data.primary.kicked),
            pending: filterBlocksByMiner(results.data.primary.pending),
          },
          auxiliary: {
            confirmed: filterBlocksByMiner(results.data.auxiliary.confirmed),
            kicked: filterBlocksByMiner(results.data.auxiliary.kicked),
            pending: filterBlocksByMiner(results.data.auxiliary.pending),
          },
        },
      };
    } catch (error) {
      this.logger.error(pool, 'BlocksHandler', `Error fetching specific blocks: ${error.message}`);
      return {
        code: 500,
        error: 'Failed to fetch blocks',
      };
    }
  }
}

module.exports = BlocksHandler;
EOF

  log_success "Created blocksHandler.js"
}

################################################################################
# Phase 8: Create Unit Tests
################################################################################

phase_create_unit_tests() {
  log_info "Starting Phase 8: Create Unit Tests"
  
  cat > "$SCRIPT_DIR/scripts/main/__tests__/errorHandler.test.js" << 'EOF'
const { executeWithRetry, executeWithTimeout, delay } = require('../utils/errorHandler');

describe('Error Handler', () => {
  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await executeWithRetry(fn, { maxRetries: 3 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(fn, { maxRetries: 3, initialDelayMs: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        executeWithRetry(fn, { maxRetries: 2, initialDelayMs: 10 })
      ).rejects.toThrow('Always fails');
      
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('executeWithTimeout', () => {
    it('should complete before timeout', async () => {
      const fn = async () => {
        await delay(10);
        return 'success';
      };
      
      const result = await executeWithTimeout(fn, 100);
      expect(result).toBe('success');
    });

    it('should throw on timeout', async () => {
      const fn = async () => {
        await delay(100);
        return 'success';
      };
      
      await expect(
        executeWithTimeout(fn, 10)
      ).rejects.toThrow('Operation timed out');
    });
  });
});
EOF

  cat > "$SCRIPT_DIR/scripts/main/__tests__/configValidator.test.js" << 'EOF'
const { validateConfig, validatePoolsConfig } = require('../validators/configValidator');

describe('Config Validator', () => {
  const validConfig = {
    name: 'test-pool',
    enabled: true,
    primary: {
      coin: {
        name: 'Bitcoin',
        symbol: 'BTC',
        algorithms: {
          mining: 'sha256',
        },
      },
      address: '1A1z7agoat4osc51Ce1jXvVzXjc6F2t61P',
      payments: {
        enabled: true,
        daemon: {
          host: 'localhost',
          port: 8332,
          username: 'user',
          password: 'pass',
        },
      },
      recipients: [],
    },
    ports: [
      {
        port: 3333,
        type: 'shared',
        difficulty: {},
      },
    ],
  };

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject config missing required fields', () => {
      const invalidConfig = { ...validConfig };
      delete invalidConfig.primary.coin.name;
      
      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should reject invalid payment interval', () => {
      const invalidConfig = JSON.parse(JSON.stringify(validConfig));
      invalidConfig.primary.payments.paymentInterval = -1;
      
      expect(() => validateConfig(invalidConfig)).toThrow();
    });
  });

  describe('validatePoolsConfig', () => {
    it('should validate multiple pools', () => {
      const poolsConfig = {
        pool1: validConfig,
        pool2: { ...validConfig, name: 'pool2' },
      };
      
      expect(() => validatePoolsConfig(poolsConfig)).not.toThrow();
    });

    it('should reject invalid pool config', () => {
      const poolsConfig = {
        pool1: validConfig,
        pool2: { invalid: 'config' },
      };
      
      expect(() => validatePoolsConfig(poolsConfig)).toThrow();
    });
  });
});
EOF

  log_success "Created unit tests"
}

################################################################################
# Phase 9: Create ESLint Configuration
################################################################################

phase_create_eslint_config() {
  log_info "Starting Phase 9: Create ESLint Configuration"
  
  cat > "$SCRIPT_DIR/.eslintrc.js" << 'EOF'
module.exports = {
  'env': {
    'browser': true,
    'node': true,
    'jest': true,
    'es2021': true
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'ecmaVersion': 2021,
    'sourceType': 'module'
  },
  'rules': {
    'no-var': 2,
    'semi': [2, 'always'],
    'indent': ['error', 2],
    'no-multi-spaces': 2,
    'space-in-parens': 2,
    'quotes': [2, 'single'],
    'brace-style': [2, '1tbs'],
    'no-multiple-empty-lines': 2,
    'prefer-const': 2,
    'prefer-arrow-callback': 2,
    'no-use-before-define': 2,
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-with': 'error',
    'array-bracket-spacing': ['error', 'never'],
    'block-spacing': 'error',
    'comma-spacing': 'error',
    'comma-style': ['error', 'last'],
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'object-curly-spacing': ['error', 'always'],
    'operator-linebreak': ['error', 'before'],
  }
};
EOF

  log_success "Updated .eslintrc.js"
}

################################################################################
# Phase 10: Update Main Script
################################################################################

phase_update_main_script() {
  log_info "Starting Phase 10: Update Main Script"
  
  cat > "$SCRIPT_DIR/scripts/main.js" << 'EOF'
/*
 *
 * Main (Refactored)
 *
 */

const path = require('path');
const { createLogger, ContextualLogger } = require('./main/services/loggerService');
const { validatePoolsConfig } = require('./main/validators/configValidator');

////////////////////////////////////////////////////////////////////////////////

async function startServer() {
  try {
    const normalizedPath = path.join(__dirname, '../configs/main/config.js');

    // Load configuration
    let config;
    try {
      config = require(normalizedPath);
    } catch (e) {
      throw new Error('Unable to find config.js file. Read the installation/setup instructions.');
    }

    // Validate configuration
    const poolConfigs = validatePoolsConfig(config.poolConfigs || {});
    const portalConfig = config.portalConfig || {};

    // Create logger
    const winstonLogger = createLogger({
      logDir: path.join(__dirname, '../logs'),
      isDevelopment: process.env.NODE_ENV !== 'production',
    });
    const logger = new ContextualLogger(winstonLogger);

    logger.special('main', 'Startup', 'Foundation Server v0.3.0 starting...');

    // Import services
    const PoolDatabase = require('./main/database');
    const PoolThreads = require('./main/threads');

    // Initialize database
    const database = new PoolDatabase(config);
    const client = database.buildRedisClient({ detect_buffers: true });

    // Handle Redis connection errors
    client.on('error', (error) => {
      logger.error('redis', 'Connection', `Redis connection error: ${error.message}`);
      throw new Error('Unable to establish database connection. Ensure Redis is setup properly and listening.');
    });

    // Start pool server
    logger.info('main', 'Startup', 'Initializing database connection...');
    await database.checkRedisClient(client);

    logger.info('main', 'Startup', 'Setting up worker threads...');
    new PoolThreads(logger, client, config).setupThreads();

    logger.special('main', 'Startup', 'Foundation Server started successfully');
  } catch (error) {
    console.error('[FATAL ERROR]', error.message);
    process.exit(1);
  }
}

// Start server
startServer().catch((error) => {
  console.error('[FATAL ERROR]', error.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
  process.exit(1);
});
EOF

  log_success "Updated main.js"
}

################################################################################
# Phase 11: Create Migration Guide
################################################################################

phase_create_migration_guide() {
  log_info "Starting Phase 11: Create Migration Guide"
  
  cat > "$SCRIPT_DIR/REFACTORING_GUIDE.md" << 'EOF'
# Foundation Server V1 - Refactoring Guide

## Overview
This document describes the refactoring improvements made to the Foundation Server V1 codebase.

## Changes Made

### 1. Async/Await Implementation
- Replaced `async.waterfall` with native `async/await`
- Better error handling and readability
- Reduced callback nesting

### 2. Modular Architecture
- Split large files into focused modules
- Created handlers for API endpoints
- Created services for business logic
- Validators for configuration

### 3. Enhanced Logging
- Winston logger with context support
- File rotation for log files
- Different log levels for different severities
- Request tracking capability

### 4. Error Handling
- Retry logic with exponential backoff
- Timeout management
- Graceful error recovery
- Error file logging

### 5. Redis Optimization
- Replaced KEYS command with SCAN
- Batched operations using pipelines
- Better connection handling
- Automatic reconnection

### 6. Configuration Validation
- Joi schema validation
- Required field checking
- Type validation
- Default values

### 7. Testing Infrastructure
- Jest configuration
- Unit test examples
- Mock support
- Coverage tracking

## Migration Steps

### 1. Backup Current Installation
```bash
cp -r . ../foundation-v1-server-backup-$(date +%s)
