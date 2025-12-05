import { prisma } from '../client';
import type { Campaign, Prisma } from '@prisma/client';

/**
 * Campaign model operations
 */
export class CampaignModel {
  /**
   * Find a campaign by ID
   */
  static async findById(id: string): Promise<Campaign | null> {
    return prisma.campaign.findUnique({
      where: { id },
    });
  }

  /**
   * Find all campaigns for a specific account
   */
  static async findByAccountId(accountId: string): Promise<Campaign[]> {
    return prisma.campaign.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active campaigns
   */
  static async findActive(): Promise<Campaign[]> {
    return prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new campaign
   */
  static async create(data: Prisma.CampaignCreateInput): Promise<Campaign> {
    return prisma.campaign.create({
      data,
    });
  }

  /**
   * Update a campaign
   */
  static async update(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a campaign
   */
  static async delete(id: string): Promise<Campaign> {
    return prisma.campaign.delete({
      where: { id },
    });
  }

  /**
   * Update campaign budget
   */
  static async updateBudget(id: string, budget: number): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { budget },
    });
  }

  /**
   * Update campaign status
   */
  static async updateStatus(id: string, status: string): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }
}

export default CampaignModel;
