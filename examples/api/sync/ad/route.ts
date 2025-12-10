/**
 * Ad Sync API Route - Sync Single Ad
 * 
 * POST /api/sync/ad
 * 
 * Triggers sync of a single ad from Meta API.
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/sync/ad', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     tenantId: 'tenant_123',
 *     adId: '123456789'
 *   })
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { MetaConnectionModel } from '../../../../../lib/db/models/MetaConnection';
import { syncAdFromWebhook, syncPerformanceDataForAd } from '../../../../../lib/services/meta-sync/sync-service';
import logger from '../../../../../lib/utils/logger';
import { z } from 'zod';

const adSyncSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  adId: z.string().min(1, 'Ad ID is required'),
  adAccountId: z.string().optional(),
  syncPerformance: z.boolean().default(false),
});

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * POST /api/sync/ad
 * Sync a single ad
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const validatedData = adSyncSchema.parse(body);
    const { tenantId, adId, adAccountId, syncPerformance } = validatedData;

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

    logger.info('Ad sync triggered', {
      tenantId,
      adId,
      syncPerformance,
    });

    const ad = await syncAdFromWebhook(connection, adId);

    let performanceSnapshot = null;
    if (syncPerformance) {
      performanceSnapshot = await syncPerformanceDataForAd(connection, adId, 'yesterday');
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Ad synced successfully',
      data: {
        ad: {
          id: ad.metaAdId,
          name: ad.name,
          status: ad.status,
          effectiveStatus: ad.effectiveStatus,
          adSetId: ad.metaAdSetId,
          campaignId: ad.metaCampaignId,
          issues: ad.issues,
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

    logger.error('Ad sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Ad sync failed',
        code: 'SYNC_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
