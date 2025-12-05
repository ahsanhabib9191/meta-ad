import { prisma } from '../client';
import type { PerformanceMetric, Prisma } from '@prisma/client';

/**
 * PerformanceMetric model operations
 */
export class PerformanceMetricModel {
  /**
   * Find a metric by ID
   */
  static async findById(id: string): Promise<PerformanceMetric | null> {
    return prisma.performanceMetric.findUnique({
      where: { id },
    });
  }

  /**
   * Find metrics by entity (campaign, ad set, or ad)
   */
  static async findByEntity(
    entityType: string,
    entityId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetric[]> {
    const where: Prisma.PerformanceMetricWhereInput = {
      entityType,
      entityId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return prisma.performanceMetric.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Find metrics for a campaign
   */
  static async findByCampaignId(
    campaignId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetric[]> {
    return this.findByEntity('CAMPAIGN', campaignId, startDate, endDate);
  }

  /**
   * Find metrics for an ad set
   */
  static async findByAdSetId(
    adSetId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetric[]> {
    return this.findByEntity('AD_SET', adSetId, startDate, endDate);
  }

  /**
   * Find metrics for an ad
   */
  static async findByAdId(
    adId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetric[]> {
    return this.findByEntity('AD', adId, startDate, endDate);
  }

  /**
   * Create a new performance metric
   */
  static async create(data: Prisma.PerformanceMetricCreateInput): Promise<PerformanceMetric> {
    return prisma.performanceMetric.create({
      data,
    });
  }

  /**
   * Create multiple performance metrics
   */
  static async createMany(data: Prisma.PerformanceMetricCreateManyInput[]): Promise<number> {
    const result = await prisma.performanceMetric.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * Update a performance metric
   */
  static async update(
    id: string,
    data: Prisma.PerformanceMetricUpdateInput
  ): Promise<PerformanceMetric> {
    return prisma.performanceMetric.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete old metrics
   */
  static async deleteOlderThan(date: Date): Promise<number> {
    const result = await prisma.performanceMetric.deleteMany({
      where: {
        date: {
          lt: date,
        },
      },
    });
    return result.count;
  }

  /**
   * Get aggregated metrics for an entity
   */
  static async getAggregated(
    entityType: string,
    entityId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    totalConversions: number;
    avgCtr: number;
    avgCpc: number;
    avgCpa: number;
  }> {
    const metrics = await this.findByEntity(entityType, entityId, startDate, endDate);

    const totals = metrics.reduce(
      (acc, metric) => ({
        impressions: acc.impressions + metric.impressions,
        clicks: acc.clicks + metric.clicks,
        spend: acc.spend + Number(metric.spend),
        conversions: acc.conversions + metric.conversions,
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
    );

    return {
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalSpend: totals.spend,
      totalConversions: totals.conversions,
      avgCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      avgCpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    };
  }
}

export default PerformanceMetricModel;
