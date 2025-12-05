import { prisma } from '../client';
import type { AdSet, Prisma } from '@prisma/client';

/**
 * AdSet model operations
 */
export class AdSetModel {
  /**
   * Find an ad set by ID
   */
  static async findById(id: string): Promise<AdSet | null> {
    return prisma.adSet.findUnique({
      where: { id },
    });
  }

  /**
   * Find all ad sets for a campaign
   */
  static async findByCampaignId(campaignId: string): Promise<AdSet[]> {
    return prisma.adSet.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active ad sets
   */
  static async findActive(): Promise<AdSet[]> {
    return prisma.adSet.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new ad set
   */
  static async create(data: Prisma.AdSetCreateInput): Promise<AdSet> {
    return prisma.adSet.create({
      data,
    });
  }

  /**
   * Update an ad set
   */
  static async update(id: string, data: Prisma.AdSetUpdateInput): Promise<AdSet> {
    return prisma.adSet.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an ad set
   */
  static async delete(id: string): Promise<AdSet> {
    return prisma.adSet.delete({
      where: { id },
    });
  }

  /**
   * Update ad set budget
   */
  static async updateBudget(id: string, budget: number): Promise<AdSet> {
    return prisma.adSet.update({
      where: { id },
      data: { budget },
    });
  }

  /**
   * Update ad set status
   */
  static async updateStatus(id: string, status: string): Promise<AdSet> {
    return prisma.adSet.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Update targeting criteria
   */
  static async updateTargeting(id: string, targeting: Prisma.JsonValue): Promise<AdSet> {
    return prisma.adSet.update({
      where: { id },
      data: { targeting },
    });
  }
}

export default AdSetModel;
