import type { IncomingMessage } from 'http';
import { redis } from '../db/redis';
import { TenantModel } from '../db/models/Tenant';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

// Cache tenant plans to avoid repeated DB queries
const tenantPlanCache = new Map<string, { plan: string; expires: number }>();
const TENANT_PLAN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_CLEANUP_PROBABILITY = 0.01; // 1% chance to run cleanup on each lookup
const MAX_CACHE_SIZE = 1000; // Maximum number of cached tenant plans

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
-- Set TTL on the key to auto-cleanup (ensure minimum of 1ms to prevent immediate expiration)
if ttlMs > 0 then
  redis.call('PEXPIRE', key, ttlMs)
end
-- Return count of entries in window
return redis.call('ZCARD', key)
`;

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix } = options;
  
  return async function (key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const zkey = `${keyPrefix}:${key}`;
    
    // Execute atomic rate limit check using Lua script (single round-trip)
    const count = await redis.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      zkey,
      now.toString(),
      windowStart.toString(),
      windowMs.toString()
    ) as number;
    
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
const tenantLimiters: Record<string, ReturnType<typeof createRateLimiter>> = {
  FREE: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 1000, keyPrefix: 'rl:tenant' }),
  PRO: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 10000, keyPrefix: 'rl:tenant' }),
  BUSINESS: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 50000, keyPrefix: 'rl:tenant' }),
  ENTERPRISE: createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: Number.MAX_SAFE_INTEGER, keyPrefix: 'rl:tenant' }),
};

export async function rateLimitByIp(req: IncomingMessage): Promise<RateLimitResult> {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
  return ipLimiter(ip);
}

export async function rateLimitByTenant(req: IncomingMessage, tenantId: string): Promise<RateLimitResult> {
  // Check cache first
  const now = Date.now();
  const cached = tenantPlanCache.get(tenantId);
  let plan: string;

  if (cached && cached.expires > now) {
    plan = cached.plan;
  } else {
    // Use lean() and select only the plan field for efficiency
    const tenant = await TenantModel.findOne({ tenantId }).select('plan').lean();
    plan = tenant?.plan || 'FREE';
    
    // Cache the result
    tenantPlanCache.set(tenantId, {
      plan,
      expires: now + TENANT_PLAN_CACHE_TTL_MS,
    });
    
    // Clean up old cache entries periodically
    if (tenantPlanCache.size > MAX_CACHE_SIZE && Math.random() < CACHE_CLEANUP_PROBABILITY) {
      for (const [key, value] of tenantPlanCache.entries()) {
        if (value.expires <= now) {
          tenantPlanCache.delete(key);
        }
      }
    }
  }

  const limiter = tenantLimiters[plan] || tenantLimiters.FREE;
  return limiter(tenantId);
}

export async function rateLimitByApiKey(req: IncomingMessage, apiKey: string): Promise<RateLimitResult> {
  return apiKeyLimiter(apiKey);
}
