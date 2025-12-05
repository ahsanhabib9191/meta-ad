import { connectDB } from './client';

export async function initializeDatabase(): Promise<void> {
  await connectDB();

  const models = [
    (await import('./models/campaign')).CampaignModel,
    (await import('./models/optimization-log')).OptimizationLogModel,
    (await import('./models/Tenant')).TenantModel,
    (await import('./models/MetaConnection')).MetaConnectionModel,
    (await import('./models/WebsiteAudit')).WebsiteAuditModel,
    (await import('./models/GeneratedCopy')).GeneratedCopyModel,
    (await import('./models/ad-set')).AdSetModel,
    (await import('./models/ad')).AdModel,
  ];

  // Drop existing indexes to avoid duplicate/auto-named conflicts, then sync declared indexes.
  for (const m of models) {
    try {
      await m.collection.dropIndexes();
    } catch (err: any) {
      // Ignore if no indexes exist yet
      if (err?.codeName !== 'NamespaceNotFound' && err?.code !== 26) {
        console.warn(`Index drop warning for ${m.modelName}:`, err?.message || err);
      }
    }
    await m.syncIndexes();
  }

  console.log('✅ Database initialized with all required models and indexes');
}
