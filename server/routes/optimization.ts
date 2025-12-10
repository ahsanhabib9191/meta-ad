import { Router, Request, Response, NextFunction } from 'express';
import { AdSetModel, AdModel, OptimizationLogModel, PerformanceSnapshotModel } from '../../lib/db/models';
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

    const filter: Record<string, unknown> = { status: 'ACTIVE' };
    if (accountId) filter.accountId = accountId;

    const adSets = await AdSetModel.find(filter).lean().exec();
    
    const recommendations: OptimizationRecommendation[] = [];

    for (const adSet of adSets) {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const performance = await PerformanceSnapshotModel.aggregate([
        { 
          $match: { 
            entityType: 'AD_SET',
            entityId: adSet.adSetId,
            date: { $gte: last7Days }
          }
        },
        {
          $group: {
            _id: null,
            spend: { $sum: '$spend' },
            impressions: { $sum: '$impressions' },
            clicks: { $sum: '$clicks' },
            conversions: { $sum: '$conversions' },
            revenue: { $sum: '$revenue' },
          }
        }
      ]).exec();

      const metrics = performance[0] || { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };

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
      const adSet = await AdSetModel.findOne({ adSetId: entityId }).exec();
      if (!adSet) {
        return res.status(404).json({ error: 'Ad set not found' });
      }

      previousValue = { status: adSet.status, budget: adSet.budget };

      if (action === 'PAUSE') {
        adSet.status = 'PAUSED';
        newValue = { status: 'PAUSED', budget: adSet.budget };
      } else if (action === 'SCALE') {
        const newBudget = Math.round(adSet.budget * 1.2);
        adSet.budget = newBudget;
        newValue = { status: adSet.status, budget: newBudget };
      } else if (action === 'REDUCE_BUDGET') {
        const newBudget = Math.round(adSet.budget * 0.8);
        adSet.budget = newBudget;
        newValue = { status: adSet.status, budget: newBudget };
      } else if (action === 'ACTIVATE') {
        adSet.status = 'ACTIVE';
        newValue = { status: 'ACTIVE', budget: adSet.budget };
      }

      await adSet.save();
      result = adSet;
    } else if (entityType === 'AD') {
      const ad = await AdModel.findOne({ adId: entityId }).exec();
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      previousValue = { status: ad.status };

      if (action === 'PAUSE') {
        ad.status = 'PAUSED';
        newValue = { status: 'PAUSED' };
      } else if (action === 'ACTIVATE') {
        ad.status = 'ACTIVE';
        newValue = { status: 'ACTIVE' };
      }

      await ad.save();
      result = ad;
    }

    const optimizationLog = await OptimizationLogModel.create({
      entityType,
      entityId,
      action,
      reason: reason || `Manual ${action.toLowerCase()} action`,
      previousValue: JSON.stringify(previousValue),
      newValue: JSON.stringify(newValue),
      performedBy: performedBy || 'system',
      performedAt: new Date(),
    });

    logger.info('Optimization action executed', { 
      entityType, 
      entityId, 
      action,
      logId: optimizationLog._id 
    });

    res.json({ 
      data: result,
      log: optimizationLog,
      message: `${action} action executed successfully`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, action, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (action) filter.action = action;

    const logs = await OptimizationLogModel.find(filter)
      .sort({ performedAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean()
      .exec();

    const total = await OptimizationLogModel.countDocuments(filter).exec();

    res.json({
      data: logs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/learning-phase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.query;

    const filter: Record<string, unknown> = { 
      status: 'ACTIVE',
      learningPhaseStatus: { $in: ['LEARNING', 'LEARNING_LIMITED'] }
    };
    if (accountId) filter.accountId = accountId;

    const learningAdSets = await AdSetModel.find(filter)
      .select('adSetId name campaignId learningPhaseStatus optimizationEventsCount createdAt')
      .lean()
      .exec();

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
