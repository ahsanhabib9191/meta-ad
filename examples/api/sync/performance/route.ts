/**
 * Performance Sync API Route - Manual Performance Data Sync
 * 
 * POST /api/sync/performance
 * 
 * Triggers sync of performance data (insights) for a tenant's Meta connection.
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/sync/performance', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     tenantId: 'tenant_123',
 *     datePreset: 'last_7d', // yesterday, last_7d, last_30d, etc.
 *     adAccountId: 'act_123456' // optional
 *   })
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { MetaConnectionModel } from '../../../../../lib/db/models/MetaConnection';
import { syncAllPerformanceData } from '../../../../../lib/services/meta-sync/sync-service';
import logger from '../../../../../lib/utils/logger';
import { z } from 'zod';

// Request body validation schema
const performanceSyncSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  adAccountId: z.string().optional(),
  datePreset: z.enum([
    'today',
    'yesterday',
    'last_3d',
    'last_7d',
    'last_14d',
    'last_30d',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
  ]).default('yesterday'),
  entityTypes: z.array(z.enum(['CAMPAIGN', 'ADSET', 'AD'])).optional(),
});

type PerformanceSyncRequest = z.infer<typeof performanceSyncSchema>;

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

interface SuccessResponse {
  success: boolean;
  message: string;
  data: {
    campaigns: number;
    adSets: number;
    ads: number;
    datePreset: string;
    durationMs: number;
    syncedAt: string;
  };
}

/**
 * POST /api/sync/performance
 * Trigger performance data sync
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = performanceSyncSchema.parse(body);
    const { tenantId, adAccountId, datePreset, entityTypes } = validatedData;

    // Connect to database
    await connectDB();

    // Find Meta connection
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
          details: { tenantId, adAccountId },
        },
        { status: 404 }
      );
    }

    // Check connection status
    if (connection.status !== 'ACTIVE' && connection.status !== 'CONNECTED') {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Meta connection is not active',
          code: 'CONNECTION_INACTIVE',
          details: { status: connection.status },
        },
        { status: 400 }
      );
    }

    logger.info('Performance sync triggered', {
      tenantId,
      adAccountId: connection.adAccountId,
      datePreset,
      entityTypes,
    });

    // Perform performance sync
    const result = await syncAllPerformanceData(connection, datePreset);

    const duration = Date.now() - startTime;

    logger.info('Performance sync completed', {
      tenantId,
      adAccountId: connection.adAccountId,
      result,
      durationMs: duration,
    });

    return NextResponse.json<SuccessResponse>({
      success: true,
      message: 'Performance data synced successfully',
      data: {
        campaigns: result.campaigns,
        adSets: result.adSets,
        ads: result.ads,
        datePreset,
        durationMs: duration,
        syncedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle validation errors
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

    // Log error
    logger.error('Performance sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Performance sync failed',
        code: 'SYNC_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/performance?tenantId=xxx&datePreset=last_7d
 * Get performance data for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const adAccountId = searchParams.get('adAccountId');
    const datePreset = searchParams.get('datePreset') || 'last_7d';

    if (!tenantId) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Tenant ID is required',
          code: 'MISSING_TENANT_ID',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const { PerformanceSnapshotModel } = await import('../../../../../lib/db/models/performance-snapshot');
    
    // Calculate date range based on preset
    const now = new Date();
    let startDate = new Date();
    
    switch (datePreset) {
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'last_7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last_30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const snapshots = await PerformanceSnapshotModel.find({
      tenantId,
      date: { $gte: startDate, $lte: now },
    })
      .sort({ date: -1 })
      .limit(100)
      .exec();

    const summary = {
      totalSnapshots: snapshots.length,
      byType: {
        CAMPAIGN: snapshots.filter(s => s.entityType === 'CAMPAIGN').length,
        ADSET: snapshots.filter(s => s.entityType === 'ADSET').length,
        AD: snapshots.filter(s => s.entityType === 'AD').length,
      },
      totalSpend: snapshots.reduce((sum, s) => sum + (s.spend || 0), 0),
      totalImpressions: snapshots.reduce((sum, s) => sum + (s.impressions || 0), 0),
      totalClicks: snapshots.reduce((sum, s) => sum + (s.clicks || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        snapshots: snapshots.slice(0, 10), // Return first 10 for preview
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString(),
          preset: datePreset,
        },
      },
    });

  } catch (error) {
    logger.error('Failed to get performance data', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Failed to get performance data',
        code: 'FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
