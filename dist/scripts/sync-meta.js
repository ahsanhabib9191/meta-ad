"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../lib/db");
const MetaConnection_1 = require("../lib/db/models/MetaConnection");
const redis_1 = require("../lib/db/redis");
const sync_service_1 = require("../lib/services/meta-sync/sync-service");
const logger_1 = __importDefault(require("../lib/utils/logger"));
const LOCK_KEY = 'meta-sync:lock';
const INTERVAL_MINUTES = parseInt(process.env.META_SYNC_INTERVAL_MINUTES || '15', 10);
const INTERVAL_MS = Math.max(INTERVAL_MINUTES, 1) * 60 * 1000;
async function acquireLock(value, ttlSeconds) {
    const result = await redis_1.redis.set(LOCK_KEY, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
}
async function releaseLock(value) {
    const current = await redis_1.redis.get(LOCK_KEY);
    if (current === value) {
        await redis_1.redis.del(LOCK_KEY);
    }
}
async function runSyncCycle() {
    const connections = await MetaConnection_1.MetaConnectionModel.find({ status: 'ACTIVE' }).exec();
    if (!connections || connections.length === 0) {
        logger_1.default.info('No active Meta connections found for sync');
        return;
    }
    for (const connection of connections) {
        try {
            await (0, sync_service_1.syncMetaConnection)(connection);
        }
        catch (error) {
            logger_1.default.error('Meta sync worker failed for connection', {
                tenantId: connection.tenantId,
                adAccountId: connection.adAccountId,
                error,
            });
        }
    }
}
async function main() {
    await (0, db_1.initializeDatabase)();
    await (0, redis_1.connectRedis)();
    const args = process.argv.slice(2);
    const runLoop = args.includes('--loop');
    const intervalArg = args.find((arg) => arg.startsWith('--interval='));
    const intervalOverride = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : undefined;
    const intervalMs = intervalOverride ? Math.max(intervalOverride, 1) * 60 * 1000 : INTERVAL_MS;
    const lockValue = `${process.pid}-${Date.now()}`;
    const ttlSeconds = Math.ceil(intervalMs / 1000) + 5;
    const execute = async () => {
        const locked = await acquireLock(lockValue, ttlSeconds);
        if (!locked) {
            logger_1.default.info('Another Meta sync job is currently running. Skipping this cycle.');
            return;
        }
        try {
            await runSyncCycle();
        }
        finally {
            await releaseLock(lockValue);
        }
    };
    await execute();
    if (runLoop) {
        logger_1.default.info('Starting periodic Meta sync loop', { intervalMinutes: intervalMs / 60000 });
        while (true) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            await execute();
        }
    }
}
main()
    .catch((error) => {
    logger_1.default.error('Meta sync job failed', { error });
    process.exit(1);
})
    .finally(async () => {
    await (0, redis_1.disconnectRedis)();
});
