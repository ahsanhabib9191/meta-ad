import { initializeDatabase } from '../lib/db';
import { MetaConnectionModel } from '../lib/db/models/MetaConnection';
import { connectRedis, disconnectRedis, redis } from '../lib/db/redis';
import { syncMetaConnection } from '../lib/services/meta-sync/sync-service';
import logger from '../lib/utils/logger';

const LOCK_KEY = 'meta-sync:lock';
const INTERVAL_MINUTES = parseInt(process.env.META_SYNC_INTERVAL_MINUTES || '15', 10);
const INTERVAL_MS = Math.max(INTERVAL_MINUTES, 1) * 60 * 1000;

async function acquireLock(value: string, ttlSeconds: number) {
  const result = await redis.set(LOCK_KEY, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

async function releaseLock(value: string) {
  const current = await redis.get(LOCK_KEY);
  if (current === value) {
    await redis.del(LOCK_KEY);
  }
}

async function runSyncCycle() {
  const connections = await MetaConnectionModel.find({ status: 'ACTIVE' }).exec();
  if (!connections || connections.length === 0) {
    logger.info('No active Meta connections found for sync');
    return;
  }

  for (const connection of connections) {
    try {
      await syncMetaConnection(connection);
    } catch (error) {
      logger.error('Meta sync worker failed for connection', {
        tenantId: connection.tenantId,
        adAccountId: connection.adAccountId,
        error,
      });
    }
  }
}

async function main() {
  await initializeDatabase();
  await connectRedis();

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
      logger.info('Another Meta sync job is currently running. Skipping this cycle.');
      return;
    }

    try {
      await runSyncCycle();
    } finally {
      await releaseLock(lockValue);
    }
  };

  await execute();

  if (runLoop) {
    logger.info('Starting periodic Meta sync loop', { intervalMinutes: intervalMs / 60000 });

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      await execute();
    }
  }
}

main()
  .catch((error) => {
    logger.error('Meta sync job failed', { error });
    process.exit(1);
  })
  .finally(async () => {
    await disconnectRedis();
  });
