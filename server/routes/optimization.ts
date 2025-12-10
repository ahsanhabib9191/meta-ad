import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { getDb } from '../db';
import { adSets, performanceSnapshots, optimizationLogs } from '../../shared/schema';
import { eq, and, gte, sql, desc, inArray } from 'drizzle-orm';
import { logger } from '../../lib/utils/logger';

const router = Router();

interface OptimizationRecommendation {
  entityType: 'AD_SET' | 'AD';
  entityId: string;
  entityName: string;
  action: 'PAUSE' | 'SCALE' | 'REDUCE_BUDGET' | 'MONITOR';
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  metrics: {
    spend: number;
    conversions: number;
    roas: number;
    cpa: number;
    ctr: number;
  };
}

router.get('/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.query;
    const db = getDb();

    const conditions = [eq(adSets.status, 'ACTIVE')];
    if (accountId) conditions.push(eq(adSets.accountId, accountId as string));

    const activeAdSets = await db.select().from(adSets).where(and(...conditions));
    
    const recommendations: OptimizationRecommendation[] = [];

    for (const adSet of activeAdSets) {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const [perf] = await db.select({
        spend: sql<number>`COALESCE(SUM(${performanceSnapshots.spend}), 0)`,
        impressions: sql<number>`COALESCE(SUM(${performanceSnapshots.impressions}), 0)`,
        clicks: sql<number>`COALESCE(SUM(${performanceSnapshots.clicks}), 0)`,
        conversions: sql<number>`COALESCE(SUM(${performanceSnapshots.conversions}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${performanceSnapshots.revenue}), 0)`,
      }).from(performanceSnapshots)
        .where(and(
          eq(performanceSnapshots.entityType, 'AD_SET'),
          eq(performanceSnapshots.entityId, adSet.adSetId),
          gte(performanceSnapshots.date, last7Days)
        ));

      const metrics = perf || { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };

      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions * 100) : 0;
      const cpa = metrics.conversions > 0 ? (metrics.spend / metrics.conversions) : 0;
      const roas = metrics.spend > 0 ? (metrics.revenue / metrics.spend) : 0;

      if (adSet.learningPhaseStatus === 'LEARNING') {
        recommendations.push({
          entityType: 'AD_SET',
          entityId: adSet.adSetId,
          entityName: adSet.name,
          action: 'MONITOR',
          reason: 'Ad set is in learning phase - avoid making changes',
          priority: 'LOW',
          metrics: { spend: metrics.spend, conversions: metrics.conversions, roas, cpa, ctr },
        });
        continue;
      }

      if (metrics.conversions >= 10) {
        if (cpa > 50 && roas < 1) {
          recommendations.push({
            entityType: 'AD_SET',
            entityId: adSet.adSetId,
            entityName: adSet.name,
            action: 'PAUSE',
            reason: `High CPA ($${cpa.toFixed(2)}) and low ROAS (${roas.toFixed(2)}x) - consider pausing`,
            priority: 'HIGH',
            metrics: { spend: metrics.spend, conversions: metrics.conversions, roas, cpa, ctr },
          });
        } else if (roas > 3) {
          recommendations.push({
            entityType: 'AD_SET',
            entityId: adSet.adSetId,
            entityName: adSet.name,
            action: 'SCALE',
            reason: `Strong ROAS (${roas.toFixed(2)}x) - consider increasing budget by 20%`,
            priority: 'MEDIUM',
            metrics: { spend: metrics.spend, conversions: metrics.conversions, roas, cpa, ctr },
          });
        }
      }

      if (ctr < 0.5 && metrics.impressions > 1000) {
        recommendations.push({
          entityType: 'AD_SET',
          entityId: adSet.adSetId,
          entityName: adSet.name,
          action: 'PAUSE',
          reason: `Very low CTR (${ctr.toFixed(2)}%) - creative or targeting may need refresh`,
          priority: 'MEDIUM',
          metrics: { spend: metrics.spend, conversions: metrics.conversions, roas, cpa, ctr },
        });
      }
    }

    recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    res.json({ data: recommendations });
  } catch (error) {
    next(error);
  }
});

router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, action, reason, performedBy } = req.body;

    if (!entityType || !entityId || !action) {
      return res.status(400).json({ error: 'entityType, entityId, and action are required' });
    }

    let result;
    let previousValue;
    let newValue;

    if (entityType === 'AD_SET') {
      const adSet = await storage.getAdSet(entityId);
      if (!adSet) {
        return res.status(404).json({ error: 'Ad set not found' });
      }

      previousValue = { status: adSet.status, budget: adSet.budget };

      if (action === 'PAUSE') {
        result = await storage.updateAdSet(entityId, { status: 'PAUSED' });
        newValue = { status: 'PAUSED', budget: adSet.budget };
      } else if (action === 'SCALE') {
        const newBudget = String(Math.round(Number(adSet.budget) * 1.2));
        result = await storage.updateAdSet(entityId, { budget: newBudget });
        newValue = { status: adSet.status, budget: newBudget };
      } else if (action === 'REDUCE_BUDGET') {
        const newBudget = String(Math.round(Number(adSet.budget) * 0.8));
        result = await storage.updateAdSet(entityId, { budget: newBudget });
        newValue = { status: adSet.status, budget: newBudget };
      } else if (action === 'ACTIVATE') {
        result = await storage.updateAdSet(entityId, { status: 'ACTIVE' });
        newValue = { status: 'ACTIVE', budget: adSet.budget };
      }
    } else if (entityType === 'AD') {
      const ad = await storage.getAd(entityId);
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      previousValue = { status: ad.status };

      if (action === 'PAUSE') {
        result = await storage.updateAd(entityId, { status: 'PAUSED' });
        newValue = { status: 'PAUSED' };
      } else if (action === 'ACTIVATE') {
        result = await storage.updateAd(entityId, { status: 'ACTIVE' });
        newValue = { status: 'ACTIVE' };
      }
    }

    const log = await storage.createOptimizationLog({
      entityType,
      entityId,
      action,
      reason: reason || `Manual ${action.toLowerCase()} action`,
      previousValue: JSON.stringify(previousValue),
      newValue: JSON.stringify(newValue),
      performedBy: performedBy || 'system',
      performedAt: new Date(),
      accountId: null,
      tenantId: null,
    });

    logger.info('Optimization action executed', { 
      entityType, 
      entityId, 
      action,
      logId: log.id 
    });

    res.json({ 
      data: result,
      log,
      message: `${action} action executed successfully`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, limit = 50 } = req.query;

    const logs = await storage.getOptimizationLogs(
      {
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
      },
      Number(limit)
    );

    res.json({
      data: logs,
      pagination: {
        total: logs.length,
        limit: Number(limit),
        offset: 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/learning-phase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.query;
    const db = getDb();

    const conditions = [
      eq(adSets.status, 'ACTIVE'),
      inArray(adSets.learningPhaseStatus, ['LEARNING', 'LEARNING_LIMITED']),
    ];
    if (accountId) conditions.push(eq(adSets.accountId, accountId as string));

    const learningAdSets = await db.select({
      adSetId: adSets.adSetId,
      name: adSets.name,
      campaignId: adSets.campaignId,
      learningPhaseStatus: adSets.learningPhaseStatus,
      optimizationEventsCount: adSets.optimizationEventsCount,
      createdAt: adSets.createdAt,
    }).from(adSets).where(and(...conditions));

    const result = learningAdSets.map(adSet => ({
      ...adSet,
      eventsNeeded: Math.max(0, 50 - (adSet.optimizationEventsCount || 0)),
      estimatedCompletion: adSet.optimizationEventsCount && adSet.optimizationEventsCount > 0
        ? `~${Math.ceil((50 - adSet.optimizationEventsCount) / (adSet.optimizationEventsCount / 7))} days`
        : 'Unknown'
    }));

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
