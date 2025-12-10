import { Router, Request, Response, NextFunction } from 'express';
import { PerformanceSnapshotModel, CampaignModel, AdSetModel, AdModel } from '../../lib/db/models';

const router = Router();

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, dateFrom, dateTo } = req.query;

    const dateFilter: Record<string, unknown> = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
    if (dateTo) dateFilter.$lte = new Date(dateTo as string);

    const filter: Record<string, unknown> = {};
    if (accountId) filter.accountId = accountId;

    const [campaignCount, adSetCount, adCount] = await Promise.all([
      CampaignModel.countDocuments({ ...filter, status: { $ne: 'ARCHIVED' } }).exec(),
      AdSetModel.countDocuments({ ...filter, status: { $ne: 'ARCHIVED' } }).exec(),
      AdModel.countDocuments({ ...filter, status: { $ne: 'ARCHIVED' } }).exec(),
    ]);

    const learningAdSets = await AdSetModel.countDocuments({ 
      ...filter, 
      status: 'ACTIVE',
      learningPhaseStatus: 'LEARNING' 
    }).exec();

    const issueAds = await AdModel.countDocuments({
      ...filter,
      'issues.0': { $exists: true }
    }).exec();

    const performanceFilter: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) {
      performanceFilter.date = dateFilter;
    }

    const recentPerformance = await PerformanceSnapshotModel.aggregate([
      { $match: performanceFilter },
      { 
        $group: {
          _id: null,
          totalSpend: { $sum: '$spend' },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalConversions: { $sum: '$conversions' },
          totalRevenue: { $sum: '$revenue' },
        }
      }
    ]).exec();

    const metrics = recentPerformance[0] || {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
    };

    const ctr = metrics.totalImpressions > 0 
      ? (metrics.totalClicks / metrics.totalImpressions * 100).toFixed(2) 
      : 0;
    const cpc = metrics.totalClicks > 0 
      ? (metrics.totalSpend / metrics.totalClicks).toFixed(2) 
      : 0;
    const cpa = metrics.totalConversions > 0 
      ? (metrics.totalSpend / metrics.totalConversions).toFixed(2) 
      : 0;
    const roas = metrics.totalSpend > 0 
      ? (metrics.totalRevenue / metrics.totalSpend).toFixed(2) 
      : 0;

    res.json({
      data: {
        entities: {
          campaigns: campaignCount,
          adSets: adSetCount,
          ads: adCount,
          learningAdSets,
          adsWithIssues: issueAds,
        },
        metrics: {
          spend: metrics.totalSpend,
          impressions: metrics.totalImpressions,
          clicks: metrics.totalClicks,
          conversions: metrics.totalConversions,
          revenue: metrics.totalRevenue,
          ctr: Number(ctr),
          cpc: Number(cpc),
          cpa: Number(cpa),
          roas: Number(roas),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/campaigns/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo, granularity = 'day' } = req.query;

    const filter: Record<string, unknown> = { 
      entityType: 'CAMPAIGN',
      entityId: req.params.id 
    };

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) (filter.date as Record<string, Date>).$gte = new Date(dateFrom as string);
      if (dateTo) (filter.date as Record<string, Date>).$lte = new Date(dateTo as string);
    }

    const snapshots = await PerformanceSnapshotModel.find(filter)
      .sort({ date: -1 })
      .lean()
      .exec();

    const totals = snapshots.reduce((acc, s) => ({
      spend: acc.spend + (s.spend || 0),
      impressions: acc.impressions + (s.impressions || 0),
      clicks: acc.clicks + (s.clicks || 0),
      conversions: acc.conversions + (s.conversions || 0),
      revenue: acc.revenue + (s.revenue || 0),
    }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    res.json({
      data: {
        snapshots,
        totals,
        metrics: {
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0,
          cpc: totals.clicks > 0 ? (totals.spend / totals.clicks) : 0,
          cpa: totals.conversions > 0 ? (totals.spend / totals.conversions) : 0,
          roas: totals.spend > 0 ? (totals.revenue / totals.spend) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ad-sets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const filter: Record<string, unknown> = { 
      entityType: 'AD_SET',
      entityId: req.params.id 
    };

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) (filter.date as Record<string, Date>).$gte = new Date(dateFrom as string);
      if (dateTo) (filter.date as Record<string, Date>).$lte = new Date(dateTo as string);
    }

    const snapshots = await PerformanceSnapshotModel.find(filter)
      .sort({ date: -1 })
      .lean()
      .exec();

    const totals = snapshots.reduce((acc, s) => ({
      spend: acc.spend + (s.spend || 0),
      impressions: acc.impressions + (s.impressions || 0),
      clicks: acc.clicks + (s.clicks || 0),
      conversions: acc.conversions + (s.conversions || 0),
      revenue: acc.revenue + (s.revenue || 0),
    }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    res.json({
      data: {
        snapshots,
        totals,
        metrics: {
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0,
          cpc: totals.clicks > 0 ? (totals.spend / totals.clicks) : 0,
          cpa: totals.conversions > 0 ? (totals.spend / totals.conversions) : 0,
          roas: totals.spend > 0 ? (totals.revenue / totals.spend) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const filter: Record<string, unknown> = { 
      entityType: 'AD',
      entityId: req.params.id 
    };

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) (filter.date as Record<string, Date>).$gte = new Date(dateFrom as string);
      if (dateTo) (filter.date as Record<string, Date>).$lte = new Date(dateTo as string);
    }

    const snapshots = await PerformanceSnapshotModel.find(filter)
      .sort({ date: -1 })
      .lean()
      .exec();

    const totals = snapshots.reduce((acc, s) => ({
      spend: acc.spend + (s.spend || 0),
      impressions: acc.impressions + (s.impressions || 0),
      clicks: acc.clicks + (s.clicks || 0),
      conversions: acc.conversions + (s.conversions || 0),
      revenue: acc.revenue + (s.revenue || 0),
    }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    res.json({
      data: {
        snapshots,
        totals,
        metrics: {
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0,
          cpc: totals.clicks > 0 ? (totals.spend / totals.clicks) : 0,
          cpa: totals.conversions > 0 ? (totals.spend / totals.conversions) : 0,
          roas: totals.spend > 0 ? (totals.revenue / totals.spend) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const filter: Record<string, unknown> = {
      date: { $gte: startDate },
      entityType: 'CAMPAIGN',
    };

    const trends = await PerformanceSnapshotModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          spend: { $sum: '$spend' },
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          conversions: { $sum: '$conversions' },
          revenue: { $sum: '$revenue' },
        }
      },
      { $sort: { _id: 1 } }
    ]).exec();

    res.json({ data: trends });
  } catch (error) {
    next(error);
  }
});

export default router;
