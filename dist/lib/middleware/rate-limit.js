"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
exports.rateLimitByIp = rateLimitByIp;
exports.rateLimitByTenant = rateLimitByTenant;
exports.rateLimitByApiKey = rateLimitByApiKey;
const ioredis_1 = __importDefault(require("ioredis"));
const Tenant_1 = require("../db/models/Tenant");
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true });
function createRateLimiter(options) {
    const { windowMs, maxRequests, keyPrefix } = options;
    return async function (key) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const zkey = `${keyPrefix}:${key}`;
        // Add current request timestamp
        await redis.zadd(zkey, now, `${now}`);
        // Remove expired entries
        await redis.zremrangebyscore(zkey, 0, windowStart);
        // Count entries in window
        const count = await redis.zcount(zkey, windowStart, now);
        const allowed = count <= maxRequests;
        const resetAtTs = windowStart + windowMs;
        const resetAt = new Date(resetAtTs);
        const remaining = Math.max(0, maxRequests - count);
        const retryAfter = allowed ? undefined : Math.ceil((resetAtTs - now) / 1000);
        return { allowed, remaining, resetAt, retryAfter };
    };
}
async function rateLimitByIp(req) {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: 'rl:ip' });
    return limiter(ip);
}
async function rateLimitByTenant(req, tenantId) {
    const tenant = await Tenant_1.TenantModel.findOne({ tenantId }).lean();
    let max = 1000; // FREE default per day
    if (tenant?.plan === 'PRO')
        max = 10000;
    if (tenant?.plan === 'ENTERPRISE')
        max = Number.MAX_SAFE_INTEGER;
    const limiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: max, keyPrefix: 'rl:tenant' });
    return limiter(tenantId);
}
async function rateLimitByApiKey(req, apiKey) {
    const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5000, keyPrefix: 'rl:apikey' });
    return limiter(apiKey);
}
