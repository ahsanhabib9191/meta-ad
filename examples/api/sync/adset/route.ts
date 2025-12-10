/**
 * AdSet Sync API Route - Sync Single Ad Set
 * 
 * POST /api/sync/adset
 * 
 * Triggers sync of a single ad set from Meta API.
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/sync/adset', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     tenantId: 'tenant_123',
 *     adSetId: '123456789'
 *   })
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { MetaConnectionModel } from '../../../../../lib/db/models/MetaConnection';
import { syncAdSetFromWebhook, syncPerformanceDataForAdSet } from '../../../../../lib/services/meta-sync/sync-service';
import logger from '../../../../../lib/utils/logger';
import { z } from 'zod';

const adSetSyncSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  adSetId: z.string().min(1, 'Ad Set ID is required'),
  adAccountId: z.string().optional(),
  syncPerformance: z.boolean().default(false),
});

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * POST /api/sync/adset
 * Sync a single ad set
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const validatedData = adSetSyncSchema.parse(body);
    const { tenantId, adSetId, adAccountId, syncPerformance } = validatedData;

    await connectDB();

    const query: any = { tenantId };
    if (adAccountId) {
      query.adAccountId = adAccountId;
    }

    const connection = await MetaConnectionModel.findOne(query).exec();

    if (!connection) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Meta connection not found',
          code: 'CONNECTION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (connection.status !== 'ACTIVE' && connection.status !== 'CONNECTED') {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Meta connection is not active',
          code: 'CONNECTION_INACTIVE',
        },
        { status: 400 }
      );
    }

    logger.info('Ad set sync triggered', {
      tenantId,
      adSetId,
      syncPerformance,
    });

    const adSet = await syncAdSetFromWebhook(connection, adSetId);

    let performanceSnapshot = null;
    if (syncPerformance) {
      performanceSnapshot = await syncPerformanceDataForAdSet(connection, adSetId, 'yesterday');
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Ad set synced successfully',
      data: {
        adSet: {
          id: adSet.metaAdSetId,
          name: adSet.name,
          status: adSet.status,
          campaignId: adSet.metaCampaignId,
          learningStageInfo: adSet.learningStageInfo,
        },
        performanceSnapshot: performanceSnapshot ? {
          impressions: performanceSnapshot.impressions,
          clicks: performanceSnapshot.clicks,
          spend: performanceSnapshot.spend,
        } : null,
        durationMs: duration,
        syncedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Ad set sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Ad set sync failed',
        code: 'SYNC_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
