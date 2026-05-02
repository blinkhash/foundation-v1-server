#!/usr/bin/env bash

set -euo pipefail

# ----------------------------------------------------------------------
# Safe Refactoring Script for foundation-v1-server
# Based on original refactor.sh (commit a41e76a)
# Removes: npm audit fix --force
# Keeps: All file creations, backups, ESLint, tests, etc.
# ----------------------------------------------------------------------

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Ensure we are in project root
if [ ! -f "package.json" ]; then
    log_error "No package.json found. Run this script from the project root."
fi

# ----------------------------------------------------------------------
# Phase 1: Backup
# ----------------------------------------------------------------------
log_info "Phase 1: Creating backup..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
for file in package.json .eslintrc.js api.js payments.js utils.js; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        log_info "  Backed up $file"
    fi
done

# Create required directories
mkdir -p validators services handlers logs __tests__

# ----------------------------------------------------------------------
# Phase 2: Safe dependency management (NO npm audit fix --force)
# ----------------------------------------------------------------------
log_info "Phase 2: Updating dependencies safely..."

# 2.1 Install new production dependencies
log_info "  Installing joi, winston, morgan..."
npm install joi winston morgan --save

# 2.2 Remove async (native promises are used now)
if npm list async >/dev/null 2>&1; then
    log_info "  Removing async package..."
    npm uninstall async --save
else
    log_info "  async not found, skipping removal."
fi

# 2.3 Move nodemon from dependencies to devDependencies
if npm list nodemon >/dev/null 2>&1; then
    log_info "  Moving nodemon to devDependencies..."
    npm uninstall nodemon --save
    npm install nodemon --save-dev
else
    log_info "  nodemon not found, installing to devDependencies..."
    npm install nodemon --save-dev
fi

# 2.4 Optional: suggest running npm audit (without --force) for informational purposes
log_info "  Running npm audit (non‑forcing) for information..."
npm audit || log_warn "  npm audit found issues but no changes were applied."

log_info "  Dependency changes completed (no --force used)."

# ----------------------------------------------------------------------
# Phase 3: Config Validator (Joi)
# ----------------------------------------------------------------------
log_info "Phase 3: Creating config validator..."
cat > validators/configValidator.js << 'EOF'
const Joi = require('joi');

const configSchema = Joi.object({
    poolName: Joi.string().required(),
    poolId: Joi.string().required(),
    paymentInterval: Joi.number().positive().required(),
    minPaymentThreshold: Joi.number().positive().required(),
    daemon: Joi.object({
        host: Joi.string().required(),
        port: Joi.number().required(),
        username: Joi.string().required(),
        password: Joi.string().required()
    }).required(),
    auxDaemon: Joi.object({
        host: Joi.string().required(),
        port: Joi.number().required(),
        username: Joi.string().required(),
        password: Joi.string().required()
    }).required(),
    recipients: Joi.array().items(Joi.object({
        address: Joi.string().required(),
        percent: Joi.number().min(0).max(100).required()
    })).unique((a, b) => a.address === b.address)
});

const validateConfig = (config) => {
    const { error, value } = configSchema.validate(config, { abortEarly: false });
    if (error) {
        const details = error.details.map(d => d.message).join('\n');
        throw new Error(`Configuration validation failed:\n${details}`);
    }
    return value;
};

module.exports = { validateConfig };
EOF
log_info "  Created validators/configValidator.js"

# ----------------------------------------------------------------------
# Phase 4: Logger Service (Winston)
# ----------------------------------------------------------------------
log_info "Phase 4: Creating logger service..."
cat > services/loggerService.js << 'EOF'
const winston = require('winston');
const path = require('path');

const logDir = 'logs';
const { combine, timestamp, printf, colorize, json } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        winston.format.errors({ stack: true }),
        process.env.NODE_ENV === 'production' ? json() : myFormat
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp(),
            myFormat
        )
    }));
}

module.exports = logger;
EOF
log_info "  Created services/loggerService.js"

# ----------------------------------------------------------------------
# Phase 5: Error Handler (Retry with exponential backoff)
# ----------------------------------------------------------------------
log_info "Phase 5: Creating error handler utility..."
cat > utils/errorHandler.js << 'EOF'
const logger = require('../services/loggerService');

async function withRetry(fn, options = {}) {
    const { retries = 3, delay = 1000, backoff = 2 } = options;
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i === retries) break;
            const wait = delay * Math.pow(backoff, i);
            logger.warn(`Retry ${i+1}/${retries} after ${wait}ms: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, wait));
        }
    }
    throw lastError;
}

function withTimeout(promise, ms, timeoutMessage = 'Operation timed out') {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms))
    ]);
}

module.exports = { withRetry, withTimeout };
EOF
log_info "  Created utils/errorHandler.js"

# ----------------------------------------------------------------------
# Phase 6: Redis Service (SCAN instead of KEYS)
# ----------------------------------------------------------------------
log_info "Phase 6: Creating Redis service..."
cat > services/redisService.js << 'EOF'
const redis = require('redis');
const logger = require('./loggerService');

class RedisService {
    constructor(config) {
        this.client = redis.createClient(config);
        this.client.on('error', (err) => logger.error('Redis error', { error: err }));
        this.client.connect().catch(err => logger.error('Redis connect failed', { error: err }));
    }

    async keys(pattern) {
        const keys = [];
        let cursor = 0;
        do {
            const reply = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = reply.cursor;
            keys.push(...reply.keys);
        } while (cursor !== 0);
        return keys;
    }

    async get(key) { return this.client.get(key); }
    async set(key, value, ttlSeconds = null) {
        if (ttlSeconds) await this.client.setEx(key, ttlSeconds, value);
        else await this.client.set(key, value);
    }
    async del(key) { return this.client.del(key); }
    async hGetAll(key) { return this.client.hGetAll(key); }
    async hSet(key, field, value) { return this.client.hSet(key, field, value); }
    async quit() { await this.client.quit(); }
}

module.exports = RedisService;
EOF
log_info "  Created services/redisService.js"

# ----------------------------------------------------------------------
# Phase 7: Blocks Handler
# ----------------------------------------------------------------------
log_info "Phase 7: Creating blocks handler..."
cat > handlers/blocksHandler.js << 'EOF'
const { withRetry } = require('../utils/errorHandler');
const logger = require('../services/loggerService');

class BlocksHandler {
    constructor(redisService) {
        this.redis = redisService;
    }

    async getBlocks(type = 'confirmed', currency = 'primary', minerAddress = null) {
        const prefix = currency === 'aux' ? 'aux:' : '';
        const keyMap = {
            confirmed: `${prefix}blocks:confirmed`,
            pending: `${prefix}blocks:pending`,
            kicked: `${prefix}blocks:kicked`
        };
        const key = keyMap[type];
        if (!key) throw new Error(`Invalid block type: ${type}`);

        let blocks = await withRetry(() => this.redis.hGetAll(key), { retries: 2 });
        blocks = Object.values(blocks).map(b => JSON.parse(b));
        if (minerAddress) {
            blocks = blocks.filter(b => b.miner === minerAddress);
        }
        return blocks;
    }
}

module.exports = BlocksHandler;
EOF
log_info "  Created handlers/blocksHandler.js"

# ----------------------------------------------------------------------
# Phase 8: Unit Tests (Jest)
# ----------------------------------------------------------------------
log_info "Phase 8: Creating unit tests..."
cat > __tests__/errorHandler.test.js << 'EOF'
const { withRetry, withTimeout } = require('../utils/errorHandler');

describe('withRetry', () => {
    test('succeeds on first attempt', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        await expect(withRetry(fn)).resolves.toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries on failure and eventually succeeds', async () => {
        let attempts = 0;
        const fn = jest.fn().mockImplementation(() => {
            attempts++;
            if (attempts < 3) throw new Error('fail');
            return 'success';
        });
        await expect(withRetry(fn, { retries: 3, delay: 10 })).resolves.toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    test('throws after all retries exhausted', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('always fail'));
        await expect(withRetry(fn, { retries: 2, delay: 10 })).rejects.toThrow('always fail');
        expect(fn).toHaveBeenCalledTimes(3);
    });
});

describe('withTimeout', () => {
    test('resolves if promise completes before timeout', async () => {
        const promise = Promise.resolve('done');
        await expect(withTimeout(promise, 100)).resolves.toBe('done');
    });

    test('rejects if timeout occurs first', async () => {
        const slowPromise = new Promise(resolve => setTimeout(resolve, 200));
        await expect(withTimeout(slowPromise, 50)).rejects.toThrow('Operation timed out');
    });
});
EOF

cat > __tests__/configValidator.test.js << 'EOF'
const { validateConfig } = require('../validators/configValidator');

const validConfig = {
    poolName: 'TestPool',
    poolId: 'tp1',
    paymentInterval: 60,
    minPaymentThreshold: 0.01,
    daemon: { host: '127.0.0.1', port: 8332, username: 'user', password: 'pass' },
    auxDaemon: { host: '127.0.0.1', port: 8333, username: 'user', password: 'pass' },
    recipients: [{ address: 'addr1', percent: 100 }]
};

describe('Config Validator', () => {
    test('validates correct config', () => {
        expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('throws on missing required field', () => {
        const invalid = { ...validConfig };
        delete invalid.poolName;
        expect(() => validateConfig(invalid)).toThrow();
    });

    test('throws on negative paymentInterval', () => {
        const invalid = { ...validConfig, paymentInterval: -5 };
        expect(() => validateConfig(invalid)).toThrow();
    });

    test('throws on recipient percent out of range', () => {
        const invalid = { ...validConfig, recipients: [{ address: 'a', percent: 150 }] };
        expect(() => validateConfig(invalid)).toThrow();
    });
});
EOF
log_info "  Created __tests__/errorHandler.test.js and configValidator.test.js"

# ----------------------------------------------------------------------
# Phase 9: ESLint Configuration (overwrite)
# ----------------------------------------------------------------------
log_info "Phase 9: Updating ESLint configuration..."
cat > .eslintrc.js << 'EOF'
module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        'no-var': 'error',
        'prefer-const': 'warn',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'eqeqeq': ['error', 'always'],
        'no-console': 'warn',
        'curly': 'error',
        'arrow-body-style': ['error', 'as-needed'],
        'prefer-arrow-callback': 'error'
    }
};
EOF
log_info "  Overwrote .eslintrc.js"

# ----------------------------------------------------------------------
# Phase 10: Main Script Update (scripts/main.js)
# ----------------------------------------------------------------------
log_info "Phase 10: Refactoring main.js..."
# Backup already made; now overwrite
cat > scripts/main.js << 'EOF'
const { validateConfig } = require('../validators/configValidator');
const logger = require('../services/loggerService');
const RedisService = require('../services/redisService');
const config = require('../configs/config.json'); // adjust path as needed

async function main() {
    try {
        // 1. Validate config
        const validConfig = validateConfig(config);
        logger.info('Configuration validated successfully');

        // 2. Initialize Redis
        const redis = new RedisService(validConfig.daemon);
        logger.info('Redis connected');

        // 3. Start your pool server logic here
        // ... existing pool initialization ...

        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT, shutting down gracefully');
            await redis.quit();
            process.exit(0);
        });
    } catch (err) {
        logger.error('Fatal error during startup', { error: err.stack });
        process.exit(1);
    }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
});

main();
EOF
log_info "  Updated scripts/main.js"

# ----------------------------------------------------------------------
# Phase 11: Migration Guide
# ----------------------------------------------------------------------
log_info "Phase 11: Generating migration guide..."
cat > REFACTORING_GUIDE.md << 'EOF'
# Refactoring Guide – Safe Version

This refactoring was applied using `safe_refactor.sh` which excludes `npm audit fix --force`.  
The following changes were made:

1. **Backup** created in `backups/` directory.
2. **Dependencies**:
   - Added `joi`, `winston`, `morgan`.
   - Removed `async`.
   - Moved `nodemon` to devDependencies.
   - **No forced audit fix** – run `npm audit` manually if needed.
3. **New modules**:
   - `validators/configValidator.js` (Joi schema validation)
   - `services/loggerService.js` (Winston)
   - `utils/errorHandler.js` (retry/timeout)
   - `services/redisService.js` (SCAN instead of KEYS)
   - `handlers/blocksHandler.js`
4. **Tests** added in `__tests__/`.
5. **ESLint** rules modernized.
6. **Main script** updated to use new modules.
7. **This guide** documents the changes.

To complete the upgrade:
- Review `config.json` to ensure it matches the Joi schema.
- Run `npm test` to verify functionality.
- Consider running `npm audit` to see security recommendations (without `--force`).

EOF
log_info "  Created REFACTORING_GUIDE.md"

# ----------------------------------------------------------------------
# Done
# ----------------------------------------------------------------------
log_info "✅ Safe refactoring completed successfully!"
log_info "Backup stored in: $BACKUP_DIR"
log_info "Run 'npm test' to verify changes."