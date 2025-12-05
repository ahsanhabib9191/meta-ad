import Redis from 'ioredis';
import type { IncomingMessage } from 'http';
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

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true });

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix } = options;
  return async function (key: string): Promise<RateLimitResult> {
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

export async function rateLimitByIp(req: IncomingMessage): Promise<RateLimitResult> {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
  const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: 'rl:ip' });
  return limiter(ip);
}

export async function rateLimitByTenant(req: IncomingMessage, tenantId: string): Promise<RateLimitResult> {
  const tenant = await TenantModel.findOne({ tenantId }).lean();
  let max = 1000; // FREE default per day
  if (tenant?.plan === 'PRO') max = 10000;
  if (tenant?.plan === 'ENTERPRISE') max = Number.MAX_SAFE_INTEGER;
  const limiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, maxRequests: max, keyPrefix: 'rl:tenant' });
  return limiter(tenantId);
}

export async function rateLimitByApiKey(req: IncomingMessage, apiKey: string): Promise<RateLimitResult> {
  const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5000, keyPrefix: 'rl:apikey' });
  return limiter(apiKey);
}
