import { prisma } from '../client';
import type { OptimizationLog, Prisma } from '@prisma/client';

/**
 * OptimizationLog model operations
 */
export class OptimizationLogModel {
  /**
   * Find a log entry by ID
   */
  static async findById(id: string): Promise<OptimizationLog | null> {
    return prisma.optimizationLog.findUnique({
      where: { id },
    });
  }

  /**
   * Find logs by entity
   */
  static async findByEntity(
    entityType: string,
    entityId: string,
    limit?: number
  ): Promise<OptimizationLog[]> {
    return prisma.optimizationLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find logs by rule
   */
  static async findByRuleId(ruleId: string, limit?: number): Promise<OptimizationLog[]> {
    return prisma.optimizationLog.findMany({
      where: { ruleId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find logs by campaign
   */
  static async findByCampaignId(campaignId: string, limit?: number): Promise<OptimizationLog[]> {
    return this.findByEntity('CAMPAIGN', campaignId, limit);
  }

  /**
   * Find logs by ad set
   */
  static async findByAdSetId(adSetId: string, limit?: number): Promise<OptimizationLog[]> {
    return this.findByEntity('AD_SET', adSetId, limit);
  }

  /**
   * Find logs by ad
   */
  static async findByAdId(adId: string, limit?: number): Promise<OptimizationLog[]> {
    return this.findByEntity('AD', adId, limit);
  }

  /**
   * Find logs within date range
   */
  static async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<OptimizationLog[]> {
    return prisma.optimizationLog.findMany({
      where: {
        executedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find successful optimizations
   */
  static async findSuccessful(limit?: number): Promise<OptimizationLog[]> {
    return prisma.optimizationLog.findMany({
      where: { success: true },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find failed optimizations
   */
  static async findFailed(limit?: number): Promise<OptimizationLog[]> {
    return prisma.optimizationLog.findMany({
      where: { success: false },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Create a new optimization log entry
   */
  static async create(data: Prisma.OptimizationLogCreateInput): Promise<OptimizationLog> {
    return prisma.optimizationLog.create({
      data,
    });
  }

  /**
   * Create multiple log entries
   */
  static async createMany(data: Prisma.OptimizationLogCreateManyInput[]): Promise<number> {
    const result = await prisma.optimizationLog.createMany({
      data,
    });
    return result.count;
  }

  /**
   * Delete old log entries
   */
  static async deleteOlderThan(date: Date): Promise<number> {
    const result = await prisma.optimizationLog.deleteMany({
      where: {
        executedAt: {
          lt: date,
        },
      },
    });
    return result.count;
  }

  /**
   * Get optimization statistics
   */
  static async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
  }> {
    const where: Prisma.OptimizationLogWhereInput = {};

    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) where.executedAt.gte = startDate;
      if (endDate) where.executedAt.lte = endDate;
    }

    const [total, successful] = await Promise.all([
      prisma.optimizationLog.count({ where }),
      prisma.optimizationLog.count({ where: { ...where, success: true } }),
    ]);

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: total - successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }
}

export default OptimizationLogModel;
