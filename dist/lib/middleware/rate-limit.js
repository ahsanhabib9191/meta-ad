"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
exports.rateLimitByIp = rateLimitByIp;
exports.rateLimitByTenant = rateLimitByTenant;
exports.rateLimitByApiKey = rateLimitByApiKey;
const redis_1 = require("../db/redis");
const Tenant_1 = require("../db/models/Tenant");
/**
 * Lua script for atomic rate limiting using sorted sets.
 * Operations: ZADD, ZREMRANGEBYSCORE, ZCARD are combined into one round-trip.
 * Returns the count of requests in the current window after cleanup.
 */
const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local ttlMs = tonumber(ARGV[3])

-- Add current request timestamp
redis.call('ZADD', key, now, now)
-- Remove expired entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
-- Set TTL on the key to auto-cleanup (convert ms to seconds, round up)
redis.call('PEXPIRE', key, ttlMs)
-- Return count of entries in window
return redis.call('ZCARD', key)
`;
function createRateLimiter(options) {
    const { windowMs, maxRequests, keyPrefix } = options;
    return async function (key) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const zkey = `${keyPrefix}:${key}`;
        // Execute atomic rate limit check using Lua script (single round-trip)
        const count = await redis_1.redis.eval(RATE_LIMIT_LUA_SCRIPT, 1, zkey, now.toString(), windowStart.toString(), windowMs.toString());
        const allowed = count <= maxRequests;
        const resetAtTs = windowStart + windowMs;
        const resetAt = new Date(resetAtTs);
        const remaining = Math.max(0, maxRequests - count);
        const retryAfter = allowed ? undefined : Math.ceil((resetAtTs - now) / 1000);
        return { allowed, remaining, resetAt, retryAfter };
    };
}
// Pre-created rate limiters for common use cases (avoid recreation on every request)
const ipLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: 'rl:ip' });
const apiKeyLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5000, keyPrefix: 'rl:apikey' });
// Tenant limiters cached by plan tier
const tenantLimiters = {
    FREE: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 1000, keyPrefix: 'rl:tenant' }),
    PRO: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 10000, keyPrefix: 'rl:tenant' }),
    BUSINESS: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 50000, keyPrefix: 'rl:tenant' }),
    ENTERPRISE: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: Number.MAX_SAFE_INTEGER, keyPrefix: 'rl:tenant' }),
};
async function rateLimitByIp(req) {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    return ipLimiter(ip);
}
async function rateLimitByTenant(req, tenantId) {
    // Use lean() and select only the plan field for efficiency
    const tenant = await Tenant_1.TenantModel.findOne({ tenantId }).select('plan').lean();
    const plan = tenant?.plan || 'FREE';
    const limiter = tenantLimiters[plan] || tenantLimiters.FREE;
    return limiter(tenantId);
}
async function rateLimitByApiKey(req, apiKey) {
    return apiKeyLimiter(apiKey);
}
