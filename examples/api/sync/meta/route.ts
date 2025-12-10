/**
 * Meta Sync API Route - Manual Full Sync Trigger
 * 
 * POST /api/sync/meta
 * 
 * Triggers a full sync of campaigns, ad sets, and ads for a tenant's Meta connection.
 * Supports optional performance data sync.
 * 
 * @example
 * ```typescript
 * // Next.js 13+ App Router
 * import { POST } from './route';
 * 
 * // Or use fetch
 * const response = await fetch('/api/sync/meta', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     tenantId: 'tenant_123',
 *     syncPerformance: true,
 *     adAccountId: 'act_123456' // optional
 *   })
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { MetaConnectionModel } from '../../../../../lib/db/models/MetaConnection';
import { syncMetaConnection } from '../../../../../lib/services/meta-sync/sync-service';
import logger from '../../../../../lib/utils/logger';
import { z } from 'zod';

// Request body validation schema
const syncRequestSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  adAccountId: z.string().optional(),
  syncPerformance: z.boolean().default(false),
  force: z.boolean().default(false), // Force sync even if recently synced
});

type SyncRequest = z.infer<typeof syncRequestSchema>;

// Rate limiting: max 10 syncs per tenant per hour
const SYNC_RATE_LIMIT = 10;
const SYNC_RATE_WINDOW = 3600; // 1 hour in seconds

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

interface SuccessResponse {
  success: boolean;
  message: string;
  data: {
    campaignsSynced: number;
    adSetsSynced: number;
    adsSynced: number;
    durationMs: number;
    performanceStats?: {
      campaigns: number;
      adSets: number;
      ads: number;
    };
    syncedAt: string;
  };
}

/**
 * POST /api/sync/meta
 * Trigger manual Meta sync
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = syncRequestSchema.parse(body);
    const { tenantId, adAccountId, syncPerformance, force } = validatedData;

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

    // Check if sync is already in progress
    if (!force && connection.syncStatus === 'SYNCING') {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Sync already in progress',
          code: 'SYNC_IN_PROGRESS',
          details: { lastSyncAt: connection.lastSyncAt },
        },
        { status: 409 }
      );
    }

    // Check rate limiting (if not forced)
    if (!force) {
      const redis = (await import('../../../../../lib/db/redis')).redis;
      const rateLimitKey = `sync:ratelimit:${tenantId}`;
      const syncCount = await redis.incr(rateLimitKey);
      
      if (syncCount === 1) {
        await redis.expire(rateLimitKey, SYNC_RATE_WINDOW);
      }
      
      if (syncCount > SYNC_RATE_LIMIT) {
        const ttl = await redis.ttl(rateLimitKey);
        return NextResponse.json<ErrorResponse>(
          {
            error: 'Sync rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              limit: SYNC_RATE_LIMIT,
              window: SYNC_RATE_WINDOW,
              retryAfter: ttl,
            },
          },
          { 
            status: 429,
            headers: {
              'Retry-After': ttl.toString(),
            },
          }
        );
      }
    }

    // Update sync status
    connection.syncStatus = 'SYNCING';
    await connection.save();

    logger.info('Manual sync triggered', {
      tenantId,
      adAccountId: connection.adAccountId,
      syncPerformance,
      force,
    });

    // Perform sync
    const result = await syncMetaConnection(connection, syncPerformance);

    // Update connection with sync results
    connection.syncStatus = 'COMPLETED';
    connection.lastSyncAt = new Date();
    connection.lastSyncError = null;
    await connection.save();

    const duration = Date.now() - startTime;

    logger.info('Manual sync completed', {
      tenantId,
      adAccountId: connection.adAccountId,
      result,
      durationMs: duration,
    });

    return NextResponse.json<SuccessResponse>({
      success: true,
      message: 'Sync completed successfully',
      data: {
        campaignsSynced: result.campaignsSynced,
        adSetsSynced: result.adSetsSynced,
        adsSynced: result.adsSynced,
        durationMs: duration,
        performanceStats: result.performanceStats,
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
    logger.error('Manual sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
    });

    // Update connection with error
    try {
      const body = await request.json();
      const { tenantId, adAccountId } = body;
      const query: any = { tenantId };
      if (adAccountId) query.adAccountId = adAccountId;
      
      const connection = await MetaConnectionModel.findOne(query).exec();
      if (connection) {
        connection.syncStatus = 'FAILED';
        connection.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
        await connection.save();
      }
    } catch (updateError) {
      logger.error('Failed to update connection error status', { updateError });
    }

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Sync failed',
        code: 'SYNC_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/meta?tenantId=xxx
 * Get sync status for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const adAccountId = searchParams.get('adAccountId');

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

    const query: any = { tenantId };
    if (adAccountId) {
      query.adAccountId = adAccountId;
    }

    const connection = await MetaConnectionModel.findOne(query)
      .select('syncStatus lastSyncAt lastSyncError status')
      .exec();

    if (!connection) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Meta connection not found',
          code: 'CONNECTION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        syncStatus: connection.syncStatus,
        lastSyncAt: connection.lastSyncAt,
        lastSyncError: connection.lastSyncError,
        connectionStatus: connection.status,
      },
    });

  } catch (error) {
    logger.error('Failed to get sync status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Failed to get sync status',
        code: 'STATUS_CHECK_FAILED',
      },
      { status: 500 }
    );
  }
}
