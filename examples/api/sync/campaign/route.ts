/**
 * Campaign Sync API Route - Sync Single Campaign
 * 
 * POST /api/sync/campaign
 * 
 * Triggers sync of a single campaign from Meta API.
 * Useful for immediate updates after webhook or manual changes.
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/sync/campaign', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     tenantId: 'tenant_123',
 *     campaignId: '123456789',
 *     syncPerformance: true
 *   })
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { MetaConnectionModel } from '../../../../../lib/db/models/MetaConnection';
import { syncCampaignFromWebhook, syncPerformanceDataForCampaign } from '../../../../../lib/services/meta-sync/sync-service';
import logger from '../../../../../lib/utils/logger';
import { z } from 'zod';

const campaignSyncSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  campaignId: z.string().min(1, 'Campaign ID is required'),
  adAccountId: z.string().optional(),
  syncPerformance: z.boolean().default(false),
});

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * POST /api/sync/campaign
 * Sync a single campaign
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const validatedData = campaignSyncSchema.parse(body);
    const { tenantId, campaignId, adAccountId, syncPerformance } = validatedData;

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

    logger.info('Campaign sync triggered', {
      tenantId,
      campaignId,
      syncPerformance,
    });

    const campaign = await syncCampaignFromWebhook(connection, campaignId);

    // Sync performance data if requested
    let performanceSnapshot = null;
    if (syncPerformance) {
      performanceSnapshot = await syncPerformanceDataForCampaign(connection, campaignId, 'yesterday');
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Campaign synced successfully',
      data: {
        campaign: {
          id: campaign.metaCampaignId,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
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

    logger.error('Campaign sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Campaign sync failed',
        code: 'SYNC_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
