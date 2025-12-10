import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { getDb } from '../db';
import { campaigns, adSets, ads, performanceSnapshots } from '../../shared/schema';
import { eq, and, gte, lte, sql, ne } from 'drizzle-orm';

const router = Router();

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, dateFrom, dateTo } = req.query;
    
    const db = getDb();
    
    const campaignFilter = accountId ? eq(campaigns.accountId, accountId as string) : undefined;
    const adSetFilter = accountId ? eq(adSets.accountId, accountId as string) : undefined;
    const adFilter = accountId ? eq(ads.accountId, accountId as string) : undefined;

    const [campaignCount] = await db.select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(and(campaignFilter, ne(campaigns.status, 'ARCHIVED')));
    
    const [adSetCount] = await db.select({ count: sql<number>`count(*)` })
      .from(adSets)
      .where(and(adSetFilter, ne(adSets.status, 'ARCHIVED')));
    
    const [adCount] = await db.select({ count: sql<number>`count(*)` })
      .from(ads)
      .where(and(adFilter, ne(ads.status, 'ARCHIVED')));
    
    const [learningCount] = await db.select({ count: sql<number>`count(*)` })
      .from(adSets)
      .where(and(adSetFilter, eq(adSets.status, 'ACTIVE'), eq(adSets.learningPhaseStatus, 'LEARNING')));

    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo as string) : new Date();

    const perfConditions = [
      gte(performanceSnapshots.date, startDate),
      lte(performanceSnapshots.date, endDate),
    ];
    if (accountId) perfConditions.push(eq(performanceSnapshots.accountId, accountId as string));

    const [metrics] = await db.select({
      totalSpend: sql<number>`COALESCE(SUM(${performanceSnapshots.spend}), 0)`,
      totalImpressions: sql<number>`COALESCE(SUM(${performanceSnapshots.impressions}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${performanceSnapshots.clicks}), 0)`,
      totalConversions: sql<number>`COALESCE(SUM(${performanceSnapshots.conversions}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${performanceSnapshots.revenue}), 0)`,
    }).from(performanceSnapshots).where(and(...perfConditions));

    const m = metrics || { totalSpend: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalRevenue: 0 };
    
    const ctr = m.totalImpressions > 0 ? (m.totalClicks / m.totalImpressions * 100) : 0;
    const cpc = m.totalClicks > 0 ? (m.totalSpend / m.totalClicks) : 0;
    const cpa = m.totalConversions > 0 ? (m.totalSpend / m.totalConversions) : 0;
    const roas = m.totalSpend > 0 ? (m.totalRevenue / m.totalSpend) : 0;

    res.json({
      data: {
        entities: {
          campaigns: Number(campaignCount.count),
          adSets: Number(adSetCount.count),
          ads: Number(adCount.count),
          learningAdSets: Number(learningCount.count),
          adsWithIssues: 0,
        },
        metrics: {
          spend: Number(m.totalSpend),
          impressions: Number(m.totalImpressions),
          clicks: Number(m.totalClicks),
          conversions: Number(m.totalConversions),
          revenue: Number(m.totalRevenue),
          ctr: Number(ctr.toFixed(2)),
          cpc: Number(cpc.toFixed(2)),
          cpa: Number(cpa.toFixed(2)),
          roas: Number(roas.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/campaigns/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo as string) : new Date();

    const snapshots = await storage.getPerformanceSnapshots('CAMPAIGN', req.params.id, startDate, endDate);

    const totals = snapshots.reduce((acc, s) => ({
      spend: acc.spend + Number(s.spend || 0),
      impressions: acc.impressions + (s.impressions || 0),
      clicks: acc.clicks + (s.clicks || 0),
      conversions: acc.conversions + (s.conversions || 0),
      revenue: acc.revenue + Number(s.revenue || 0),
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
    
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo as string) : new Date();

    const snapshots = await storage.getPerformanceSnapshots('AD_SET', req.params.id, startDate, endDate);

    const totals = snapshots.reduce((acc, s) => ({
      spend: acc.spend + Number(s.spend || 0),
      impressions: acc.impressions + (s.impressions || 0),
      clicks: acc.clicks + (s.clicks || 0),
      conversions: acc.conversions + (s.conversions || 0),
      revenue: acc.revenue + Number(s.revenue || 0),
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
    
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo as string) : new Date();

    const snapshots = await storage.getPerformanceSnapshots('AD', req.params.id, startDate, endDate);

    const totals = snapshots.reduce((acc, s) => ({
      spend: acc.spend + Number(s.spend || 0),
      impressions: acc.impressions + (s.impressions || 0),
      clicks: acc.clicks + (s.clicks || 0),
      conversions: acc.conversions + (s.conversions || 0),
      revenue: acc.revenue + Number(s.revenue || 0),
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
    
    const db = getDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const conditions = [
      gte(performanceSnapshots.date, startDate),
      eq(performanceSnapshots.entityType, 'CAMPAIGN'),
    ];
    if (accountId) conditions.push(eq(performanceSnapshots.accountId, accountId as string));

    const trends = await db.select({
      date: sql<string>`TO_CHAR(${performanceSnapshots.date}, 'YYYY-MM-DD')`,
      spend: sql<number>`SUM(${performanceSnapshots.spend})`,
      impressions: sql<number>`SUM(${performanceSnapshots.impressions})`,
      clicks: sql<number>`SUM(${performanceSnapshots.clicks})`,
      conversions: sql<number>`SUM(${performanceSnapshots.conversions})`,
      revenue: sql<number>`SUM(${performanceSnapshots.revenue})`,
    })
    .from(performanceSnapshots)
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${performanceSnapshots.date}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${performanceSnapshots.date}, 'YYYY-MM-DD')`);

    res.json({ data: trends });
  } catch (error) {
    next(error);
  }
});

export default router;
