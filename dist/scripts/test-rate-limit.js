"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("../lib/db/redis");
const rate_limit_1 = require("../lib/middleware/rate-limit");
dotenv_1.default.config();
async function run() {
    await redis_1.redis.connect();
    const limiter = (0, rate_limit_1.createRateLimiter)({ windowMs: 1000, maxRequests: 3, keyPrefix: 'test' });
    const key = 'ip:127.0.0.1';
    // 3 allowed
    for (let i = 0; i < 3; i++) {
        const res = await limiter(key);
        if (!res.allowed)
            throw new Error(`Expected allowed at attempt ${i + 1}`);
    }
    // 4th blocked
    const res4 = await limiter(key);
    if (res4.allowed)
        throw new Error('Expected 4th attempt to be blocked');
    // Edge case: new key
    const resNew = await limiter('ip:127.0.0.2');
    if (!resNew.allowed)
        throw new Error('New key should be allowed');
    // Wait window to reset
    await new Promise((r) => setTimeout(r, 1100));
    const resAfter = await limiter(key);
    if (!resAfter.allowed)
        throw new Error('After window, should be allowed');
    console.log('Rate limiter tests passed');
    await redis_1.redis.disconnect();
}
run().catch(async (err) => {
    console.error(err);
    try {
        await redis_1.redis.disconnect();
    }
    catch { }
    process.exit(1);
});
