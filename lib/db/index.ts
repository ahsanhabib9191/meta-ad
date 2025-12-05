import { connectDB } from './client';

export async function initializeDatabase(): Promise<void> {
  await connectDB();

  const { CampaignModel } = await import('./models/campaign');
  const { OptimizationLogModel } = await import('./models/optimization-log');
  const { TenantModel } = await import('./models/Tenant');
  const { MetaConnectionModel } = await import('./models/MetaConnection');
  const { WebsiteAuditModel } = await import('./models/WebsiteAudit');
  const { GeneratedCopyModel } = await import('./models/GeneratedCopy');

  await Promise.all([
    CampaignModel.syncIndexes(),
    OptimizationLogModel.syncIndexes(),
    TenantModel.syncIndexes(),
    MetaConnectionModel.syncIndexes(),
    WebsiteAuditModel.syncIndexes(),
    GeneratedCopyModel.syncIndexes(),
  ]);

  console.log('✅ Database initialized with all required models and indexes');
}
