"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("../lib/db/redis");
dotenv_1.default.config();
async function run() {
    console.log('Testing Redis client...');
    // Test connection
    await (0, redis_1.connectRedis)();
    if (redis_1.redis.status !== 'ready')
        throw new Error('Redis not connected');
    // Test basic operations
    const testKey = `test:${Math.random().toString(36).slice(2)}`;
    // SET operation
    await redis_1.redis.set(testKey, 'test-value');
    // GET operation
    const value = await redis_1.redis.get(testKey);
    if (value !== 'test-value')
        throw new Error('Redis GET returned incorrect value');
    // SET with expiration
    const expiringKey = `expiring:${Math.random().toString(36).slice(2)}`;
    await redis_1.redis.set(expiringKey, 'expires-soon', 'EX', 2); // 2 seconds
    const expiringValue = await redis_1.redis.get(expiringKey);
    if (expiringValue !== 'expires-soon')
        throw new Error('Expiring key not set correctly');
    const ttl = await redis_1.redis.ttl(expiringKey);
    if (ttl <= 0 || ttl > 2)
        throw new Error('TTL not set correctly');
    // Test DELETE
    await redis_1.redis.del(testKey);
    const deletedValue = await redis_1.redis.get(testKey);
    if (deletedValue !== null)
        throw new Error('Key not deleted');
    // Test hash operations
    const hashKey = `hash:${Math.random().toString(36).slice(2)}`;
    await redis_1.redis.hset(hashKey, 'field1', 'value1');
    await redis_1.redis.hset(hashKey, 'field2', 'value2');
    const hashValue = await redis_1.redis.hget(hashKey, 'field1');
    if (hashValue !== 'value1')
        throw new Error('HGET returned incorrect value');
    const allFields = await redis_1.redis.hgetall(hashKey);
    if (allFields.field1 !== 'value1' || allFields.field2 !== 'value2') {
        throw new Error('HGETALL returned incorrect values');
    }
    // Test list operations
    const listKey = `list:${Math.random().toString(36).slice(2)}`;
    await redis_1.redis.rpush(listKey, 'item1', 'item2', 'item3');
    const listLength = await redis_1.redis.llen(listKey);
    if (listLength !== 3)
        throw new Error('List length incorrect');
    const listItems = await redis_1.redis.lrange(listKey, 0, -1);
    if (listItems.length !== 3 || listItems[0] !== 'item1') {
        throw new Error('LRANGE returned incorrect items');
    }
    // Test set operations
    const setKey = `set:${Math.random().toString(36).slice(2)}`;
    await redis_1.redis.sadd(setKey, 'member1', 'member2', 'member3');
    const isMember = await redis_1.redis.sismember(setKey, 'member1');
    if (!isMember)
        throw new Error('SISMEMBER returned incorrect result');
    const setMembers = await redis_1.redis.smembers(setKey);
    if (setMembers.length !== 3)
        throw new Error('SMEMBERS returned incorrect count');
    // Test sorted set operations (for rate limiting)
    const zsetKey = `zset:${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    await redis_1.redis.zadd(zsetKey, now, `req-${now}`);
    await redis_1.redis.zadd(zsetKey, now + 1000, `req-${now + 1000}`);
    const zcount = await redis_1.redis.zcount(zsetKey, now, now + 2000);
    if (zcount !== 2)
        throw new Error('ZCOUNT returned incorrect count');
    // Test ZREMRANGEBYSCORE (cleanup old entries)
    await redis_1.redis.zremrangebyscore(zsetKey, 0, now - 1000);
    const remainingCount = await redis_1.redis.zcard(zsetKey);
    if (remainingCount !== 2)
        throw new Error('ZREMRANGEBYSCORE did not work correctly');
    // Test key expiration
    await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for expiring key to expire
    const expiredValue = await redis_1.redis.get(expiringKey);
    if (expiredValue !== null)
        throw new Error('Key did not expire');
    // Test increment operations
    const counterKey = `counter:${Math.random().toString(36).slice(2)}`;
    await redis_1.redis.incr(counterKey);
    await redis_1.redis.incr(counterKey);
    const counterValue = await redis_1.redis.get(counterKey);
    if (counterValue !== '2')
        throw new Error('INCR did not work correctly');
    await redis_1.redis.incrby(counterKey, 10);
    const counterValue2 = await redis_1.redis.get(counterKey);
    if (counterValue2 !== '12')
        throw new Error('INCRBY did not work correctly');
    // Test EXISTS
    const exists = await redis_1.redis.exists(counterKey);
    if (exists !== 1)
        throw new Error('EXISTS returned incorrect value');
    const notExists = await redis_1.redis.exists('non-existent-key');
    if (notExists !== 0)
        throw new Error('EXISTS should return 0 for non-existent key');
    // Cleanup test keys
    await redis_1.redis.del(hashKey, listKey, setKey, zsetKey, counterKey);
    // Test disconnection
    await (0, redis_1.disconnectRedis)();
    if (redis_1.redis.status === 'ready')
        throw new Error('Redis still connected after disconnect');
    // Reconnect for other tests
    await (0, redis_1.connectRedis)();
    console.log('✅ All Redis client tests passed');
    await (0, redis_1.disconnectRedis)();
}
run().catch(async (err) => {
    console.error('❌ Redis client tests failed:', err.message);
    try {
        await (0, redis_1.disconnectRedis)();
    }
    catch { }
    process.exit(1);
});
