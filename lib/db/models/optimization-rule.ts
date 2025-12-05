import { prisma } from '../client';
import type { OptimizationRule, Prisma } from '@prisma/client';

/**
 * OptimizationRule model operations
 */
export class OptimizationRuleModel {
  /**
   * Find a rule by ID
   */
  static async findById(id: string): Promise<OptimizationRule | null> {
    return prisma.optimizationRule.findUnique({
      where: { id },
    });
  }

  /**
   * Find all rules for an account
   */
  static async findByAccountId(accountId: string): Promise<OptimizationRule[]> {
    return prisma.optimizationRule.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active rules
   */
  static async findActive(accountId?: string): Promise<OptimizationRule[]> {
    const where: Prisma.OptimizationRuleWhereInput = {
      isActive: true,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    return prisma.optimizationRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Find rules by type
   */
  static async findByType(
    ruleType: string,
    accountId?: string
  ): Promise<OptimizationRule[]> {
    const where: Prisma.OptimizationRuleWhereInput = {
      ruleType,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    return prisma.optimizationRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Create a new optimization rule
   */
  static async create(data: Prisma.OptimizationRuleCreateInput): Promise<OptimizationRule> {
    return prisma.optimizationRule.create({
      data,
    });
  }

  /**
   * Update an optimization rule
   */
  static async update(
    id: string,
    data: Prisma.OptimizationRuleUpdateInput
  ): Promise<OptimizationRule> {
    return prisma.optimizationRule.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an optimization rule
   */
  static async delete(id: string): Promise<OptimizationRule> {
    return prisma.optimizationRule.delete({
      where: { id },
    });
  }

  /**
   * Toggle rule active status
   */
  static async toggleActive(id: string, isActive: boolean): Promise<OptimizationRule> {
    return prisma.optimizationRule.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Update rule priority
   */
  static async updatePriority(id: string, priority: number): Promise<OptimizationRule> {
    return prisma.optimizationRule.update({
      where: { id },
      data: { priority },
    });
  }

  /**
   * Update rule conditions
   */
  static async updateConditions(
    id: string,
    conditions: Prisma.JsonValue
  ): Promise<OptimizationRule> {
    return prisma.optimizationRule.update({
      where: { id },
      data: { conditions },
    });
  }

  /**
   * Update rule actions
   */
  static async updateActions(id: string, actions: Prisma.JsonValue): Promise<OptimizationRule> {
    return prisma.optimizationRule.update({
      where: { id },
      data: { actions },
    });
  }
}

export default OptimizationRuleModel;
