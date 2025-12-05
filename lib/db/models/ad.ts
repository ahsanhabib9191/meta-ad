import { prisma } from '../client';
import type { Ad, Prisma } from '@prisma/client';

/**
 * Ad model operations
 */
export class AdModel {
  /**
   * Find an ad by ID
   */
  static async findById(id: string): Promise<Ad | null> {
    return prisma.ad.findUnique({
      where: { id },
    });
  }

  /**
   * Find all ads for an ad set
   */
  static async findByAdSetId(adSetId: string): Promise<Ad[]> {
    return prisma.ad.findMany({
      where: { adSetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active ads
   */
  static async findActive(): Promise<Ad[]> {
    return prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new ad
   */
  static async create(data: Prisma.AdCreateInput): Promise<Ad> {
    return prisma.ad.create({
      data,
    });
  }

  /**
   * Update an ad
   */
  static async update(id: string, data: Prisma.AdUpdateInput): Promise<Ad> {
    return prisma.ad.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an ad
   */
  static async delete(id: string): Promise<Ad> {
    return prisma.ad.delete({
      where: { id },
    });
  }

  /**
   * Update ad status
   */
  static async updateStatus(id: string, status: string): Promise<Ad> {
    return prisma.ad.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Update ad creative
   */
  static async updateCreative(id: string, creative: Prisma.JsonValue): Promise<Ad> {
    return prisma.ad.update({
      where: { id },
      data: { creative },
    });
  }
}

export default AdModel;
