# Sync API Routes Documentation

Complete REST API endpoints for triggering Meta Ads synchronization manually.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Full Sync](#full-sync)
  - [Performance Sync](#performance-sync)
  - [Campaign Sync](#campaign-sync)
  - [Ad Set Sync](#ad-set-sync)
  - [Ad Sync](#ad-sync)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

## Overview

The Sync API provides REST endpoints for manually triggering synchronization between your database and Meta's Ads API. These endpoints are useful for:

- Immediate sync after webhook events
- On-demand refresh of campaign data
- Debug and testing purposes
- Manual recovery from sync failures
- Performance data collection

### Base URL

```
/api/sync/
```

### Framework Support

These routes are written for Next.js 13+ App Router but can be adapted for:
- Next.js Pages Router (API routes)
- Express.js
- Fastify
- Any Node.js HTTP framework

## Authentication

All sync endpoints require authentication. Add the JWT token in the Authorization header:

```typescript
headers: {
  'Authorization': 'Bearer <your-jwt-token>',
  'Content-Type': 'application/json',
}
```

The token should include the `tenantId` claim to identify the organization.

## Rate Limiting

### Full Sync (`/api/sync/meta`)
- **Limit**: 10 syncs per tenant per hour
- **Window**: 3600 seconds
- **Response**: HTTP 429 with `Retry-After` header

### Other Endpoints
- Share rate limit with Meta API
- 180 calls per hour per user (conservative limit)
- 200 calls per hour per user (Meta's actual limit)

## Endpoints

### Full Sync

Synchronizes all campaigns, ad sets, and ads for a tenant's Meta connection.

**Endpoint**: `POST /api/sync/meta`

**Request Body**:
```typescript
{
  tenantId: string;           // Required
  adAccountId?: string;       // Optional (if multiple accounts)
  syncPerformance?: boolean;  // Default: false
  force?: boolean;            // Default: false (bypass checks)
}
```

**Example Request**:
```bash
curl -X POST https://your-api.com/api/sync/meta \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "syncPerformance": true
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "data": {
    "campaignsSynced": 15,
    "adSetsSynced": 48,
    "adsSynced": 142,
    "durationMs": 12340,
    "performanceStats": {
      "campaigns": 15,
      "adSets": 48,
      "ads": 142
    },
    "syncedAt": "2024-12-10T01:00:00.000Z"
  }
}
```

**Get Sync Status**: `GET /api/sync/meta?tenantId=xxx`

**Status Response** (200):
```json
{
  "success": true,
  "data": {
    "syncStatus": "COMPLETED",
    "lastSyncAt": "2024-12-10T01:00:00.000Z",
    "lastSyncError": null,
    "connectionStatus": "ACTIVE"
  }
}
```

### Performance Sync

Synchronizes only performance data (insights) for all entities.

**Endpoint**: `POST /api/sync/performance`

**Request Body**:
```typescript
{
  tenantId: string;           // Required
  adAccountId?: string;       // Optional
  datePreset?: string;        // Default: "yesterday"
  entityTypes?: Array<'CAMPAIGN' | 'ADSET' | 'AD'>; // Optional
}
```

**Date Presets**:
- `today` - Today's data
- `yesterday` - Yesterday's data (default)
- `last_3d` - Last 3 days
- `last_7d` - Last 7 days
- `last_14d` - Last 14 days
- `last_30d` - Last 30 days
- `this_week` - Current week (Monday - Sunday)
- `last_week` - Previous week
- `this_month` - Current month
- `last_month` - Previous month

**Example Request**:
```bash
curl -X POST https://your-api.com/api/sync/performance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "datePreset": "last_7d"
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Performance data synced successfully",
  "data": {
    "campaigns": 15,
    "adSets": 48,
    "ads": 142,
    "datePreset": "last_7d",
    "durationMs": 8500,
    "syncedAt": "2024-12-10T01:00:00.000Z"
  }
}
```

**Get Performance Data**: `GET /api/sync/performance?tenantId=xxx&datePreset=last_7d`

### Campaign Sync

Synchronizes a single campaign from Meta API.

**Endpoint**: `POST /api/sync/campaign`

**Request Body**:
```typescript
{
  tenantId: string;           // Required
  campaignId: string;         // Required (Meta campaign ID)
  adAccountId?: string;       // Optional
  syncPerformance?: boolean;  // Default: false
}
```

**Example Request**:
```bash
curl -X POST https://your-api.com/api/sync/campaign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "campaignId": "123456789",
    "syncPerformance": true
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Campaign synced successfully",
  "data": {
    "campaign": {
      "id": "123456789",
      "name": "Holiday Sale Campaign",
      "status": "ACTIVE",
      "objective": "CONVERSIONS"
    },
    "performanceSnapshot": {
      "impressions": 12500,
      "clicks": 450,
      "spend": 125.50
    },
    "durationMs": 850,
    "syncedAt": "2024-12-10T01:00:00.000Z"
  }
}
```

### Ad Set Sync

Synchronizes a single ad set from Meta API.

**Endpoint**: `POST /api/sync/adset`

**Request Body**:
```typescript
{
  tenantId: string;           // Required
  adSetId: string;            // Required (Meta ad set ID)
  adAccountId?: string;       // Optional
  syncPerformance?: boolean;  // Default: false
}
```

**Example Request**:
```bash
curl -X POST https://your-api.com/api/sync/adset \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "adSetId": "987654321"
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Ad set synced successfully",
  "data": {
    "adSet": {
      "id": "987654321",
      "name": "US Lookalike Audience",
      "status": "ACTIVE",
      "campaignId": "123456789",
      "learningStageInfo": {
        "status": "LEARNING_PHASE",
        "eventsNeeded": 25
      }
    },
    "performanceSnapshot": null,
    "durationMs": 650,
    "syncedAt": "2024-12-10T01:00:00.000Z"
  }
}
```

### Ad Sync

Synchronizes a single ad from Meta API.

**Endpoint**: `POST /api/sync/ad`

**Request Body**:
```typescript
{
  tenantId: string;           // Required
  adId: string;               // Required (Meta ad ID)
  adAccountId?: string;       // Optional
  syncPerformance?: boolean;  // Default: false
}
```

**Example Request**:
```bash
curl -X POST https://your-api.com/api/sync/ad \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type": application/json" \
  -d '{
    "tenantId": "tenant_123",
    "adId": "555666777"
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Ad synced successfully",
  "data": {
    "ad": {
      "id": "555666777",
      "name": "Black Friday Promo - Variant A",
      "status": "ACTIVE",
      "effectiveStatus": "ACTIVE",
      "adSetId": "987654321",
      "campaignId": "123456789",
      "issues": []
    },
    "performanceSnapshot": null,
    "durationMs": 520,
    "syncedAt": "2024-12-10T01:00:00.000Z"
  }
}
```

## Response Format

### Success Response Structure

```typescript
{
  success: true,
  message: string,
  data: {
    // Varies by endpoint
  }
}
```

### Error Response Structure

```typescript
{
  error: string,
  code: string,
  details?: any
}
```

## Error Handling

### Common Error Codes

#### `CONNECTION_NOT_FOUND` (404)
```json
{
  "error": "Meta connection not found",
  "code": "CONNECTION_NOT_FOUND",
  "details": {
    "tenantId": "tenant_123",
    "adAccountId": "act_123456"
  }
}
```

**Solution**: Ensure the tenant has an active Meta connection via OAuth flow.

#### `CONNECTION_INACTIVE` (400)
```json
{
  "error": "Meta connection is not active",
  "code": "CONNECTION_INACTIVE",
  "details": {
    "status": "EXPIRED"
  }
}
```

**Solution**: User needs to re-authenticate via OAuth.

#### `SYNC_IN_PROGRESS` (409)
```json
{
  "error": "Sync already in progress",
  "code": "SYNC_IN_PROGRESS",
  "details": {
    "lastSyncAt": "2024-12-10T00:55:00.000Z"
  }
}
```

**Solution**: Wait for current sync to complete or use `force: true`.

#### `RATE_LIMIT_EXCEEDED` (429)
```json
{
  "error": "Sync rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 10,
    "window": 3600,
    "retryAfter": 2400
  }
}
```

**Solution**: Wait for the time specified in `retryAfter` (seconds) or `Retry-After` header.

#### `VALIDATION_ERROR` (400)
```json
{
  "error": "Invalid request body",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "code": "invalid_type",
      "path": ["tenantId"],
      "message": "Tenant ID is required"
    }
  ]
}
```

**Solution**: Fix the request body according to the validation errors.

#### `SYNC_FAILED` (500)
```json
{
  "error": "Sync failed",
  "code": "SYNC_FAILED",
  "details": "Meta API token expired (code 190)"
}
```

**Solution**: Check logs for detailed error. May require re-authentication or Meta API troubleshooting.

## Usage Examples

### TypeScript/JavaScript

```typescript
import { z } from 'zod';

// Type definitions
const SyncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    campaignsSynced: z.number(),
    adSetsSynced: z.number(),
    adsSynced: z.number(),
    durationMs: z.number(),
    syncedAt: z.string(),
  }),
});

// Function to trigger sync
async function triggerMetaSync(tenantId: string, options?: {
  syncPerformance?: boolean;
  force?: boolean;
}) {
  const response = await fetch('/api/sync/meta', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Sync failed');
  }

  const data = await response.json();
  return SyncResponseSchema.parse(data);
}

// Usage
try {
  const result = await triggerMetaSync('tenant_123', {
    syncPerformance: true,
  });
  console.log(`Synced ${result.data.campaignsSynced} campaigns`);
} catch (error) {
  console.error('Sync failed:', error);
}
```

### React Hook

```typescript
import { useState } from 'react';

function useSyncMetaData(tenantId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const sync = async (options?: {
    syncPerformance?: boolean;
    force?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sync, loading, error, result };
}

// Usage in component
function SyncButton() {
  const { sync, loading, error } = useSyncMetaData('tenant_123');

  return (
    <>
      <button
        onClick={() => sync({ syncPerformance: true })}
        disabled={loading}
      >
        {loading ? 'Syncing...' : 'Sync Meta Data'}
      </button>
      {error && <div className="error">{error}</div>}
    </>
  );
}
```

### Node.js Script

```typescript
import axios from 'axios';

async function syncAllTenants() {
  const tenants = ['tenant_1', 'tenant_2', 'tenant_3'];

  for (const tenantId of tenants) {
    try {
      console.log(`Syncing ${tenantId}...`);
      
      const response = await axios.post(
        'https://api.example.com/api/sync/meta',
        {
          tenantId,
          syncPerformance: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.API_TOKEN}`,
          },
        }
      );

      console.log(`✅ ${tenantId}: ${response.data.data.campaignsSynced} campaigns synced`);
    } catch (error) {
      console.error(`❌ ${tenantId}: ${error.message}`);
    }

    // Wait 10 seconds between syncs
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

syncAllTenants();
```

### Webhook Integration

```typescript
// Handle Meta webhook and trigger sync
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Verify webhook signature
  if (!verifyWebhookSignature(request)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Extract change data
  const { entry } = payload;
  
  for (const change of entry?.[0]?.changes || []) {
    const { value } = change;
    
    if (value.verb === 'update' && value.object_type === 'campaign') {
      // Trigger campaign sync
      await fetch('/api/sync/campaign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getInternalToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: getTenantFromWebhook(value),
          campaignId: value.id,
          syncPerformance: true,
        }),
      });
    }
  }

  return new Response('OK', { status: 200 });
}
```

## Best Practices

### 1. Rate Limiting Awareness

- Monitor your sync frequency
- Use `force: false` (default) to respect rate limits
- Only use `force: true` for critical updates

### 2. Error Handling

- Always catch and handle errors
- Implement retry logic with exponential backoff
- Log errors for debugging

### 3. Performance Optimization

- Sync performance data separately during off-peak hours
- Use single-entity sync endpoints for immediate updates
- Batch webhook events before syncing

### 4. Monitoring

- Track sync duration
- Monitor error rates
- Alert on repeated failures
- Dashboard for sync status

### 5. Security

- Always use authentication
- Validate tenantId matches authenticated user
- Use HTTPS in production
- Never expose internal errors to clients

## Testing

### Test Full Sync

```bash
curl -X POST http://localhost:3000/api/sync/meta \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test_tenant",
    "syncPerformance": false
  }'
```

### Test Error Handling

```bash
# Invalid tenant
curl -X POST http://localhost:3000/api/sync/meta \
  -H "Content-Type: application/json" \
  -d '{"tenantId": ""}'

# Missing required field
curl -X POST http://localhost:3000/api/sync/campaign \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "test"}'
```

## Troubleshooting

### Sync Timing Out

- Reduce batch sizes
- Sync performance data separately
- Check Meta API status
- Increase timeout configuration

### Rate Limit Issues

- Reduce sync frequency
- Optimize API calls
- Use caching where possible
- Monitor rate limit usage

### Connection Failures

- Verify Meta connection is active
- Check OAuth token expiration
- Test Meta API directly
- Review error logs

## Related Documentation

- [Meta Sync Service Guide](../docs/META_SYNC_SERVICE.md)
- [Meta Sync Implementation](../META_SYNC_COMPLETE.md)
- [Webhook Handlers](../lib/webhooks/meta.ts)
- [Background Jobs](../scripts/sync-meta.ts)

---

**Last Updated**: December 10, 2024  
**API Version**: 1.0.0
