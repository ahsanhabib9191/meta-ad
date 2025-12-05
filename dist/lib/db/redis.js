"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
let cached = global.redis;
if (!cached) {
    cached = global.redis = new ioredis_1.default({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
}
exports.redis = cached;
/**
 * Connect to Redis
 */
async function connectRedis() {
    if (exports.redis.status !== 'ready') {
        await exports.redis.connect();
        console.log('✅ Redis connected successfully');
    }
}
/**
 * Disconnect from Redis
 */
async function disconnectRedis() {
    await exports.redis.quit();
    console.log('✅ Redis disconnected');
}
exports.default = exports.redis;
