# Sync API Routes

REST API endpoints for triggering Meta Ads synchronization manually.

## Quick Start

These routes are production-ready examples for Next.js 13+ App Router. Copy them to your `app/api/sync/` directory to use.

```bash
# Copy to your project
cp -r examples/api/sync/* your-app/app/api/sync/
```

## Endpoints

### Full Sync
- **File**: `meta/route.ts`
- **Endpoint**: `POST /api/sync/meta`
- **Purpose**: Sync all campaigns, ad sets, and ads
- **Optional**: Performance data sync

### Performance Sync  
- **File**: `performance/route.ts`
- **Endpoint**: `POST /api/sync/performance`
- **Purpose**: Sync insights/metrics data only
- **Supports**: Multiple date ranges

### Campaign Sync
- **File**: `campaign/route.ts`
- **Endpoint**: `POST /api/sync/campaign`
- **Purpose**: Sync a single campaign
- **Use**: Immediate updates after webhooks

### Ad Set Sync
- **File**: `adset/route.ts`
- **Endpoint**: `POST /api/sync/adset`
- **Purpose**: Sync a single ad set
- **Includes**: Learning phase data

### Ad Sync
- **File**: `ad/route.ts`
- **Endpoint**: `POST /api/sync/ad`
- **Purpose**: Sync a single ad
- **Includes**: Creative and issues

## Usage Example

```typescript
// Trigger full sync
const response = await fetch('/api/sync/meta', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenantId: 'tenant_123',
    syncPerformance: true
  })
});

const result = await response.json();
console.log(`Synced ${result.data.campaignsSynced} campaigns`);
```

## Features

- ✅ Input validation with Zod schemas
- ✅ Rate limiting (10 syncs/hour per tenant)
- ✅ Error handling with descriptive codes
- ✅ Sync status tracking
- ✅ Performance metrics
- ✅ TypeScript types included
- ✅ Comprehensive logging

## Documentation

Complete API documentation with examples, error codes, and best practices:

**[Full API Documentation →](../../docs/SYNC_API_ROUTES.md)**

## Requirements

- Next.js 13+ (App Router)
- TypeScript
- Zod for validation
- Database models from `lib/db/models/`
- Sync service from `lib/services/meta-sync/`

## Adaptation

### For Next.js Pages Router

```typescript
// pages/api/sync/meta.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Your sync logic here
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

### For Express.js

```typescript
// routes/sync.ts
import express from 'express';
import { syncMetaConnection } from '../lib/services/meta-sync/sync-service';

const router = express.Router();

router.post('/meta', async (req, res) => {
  try {
    const { tenantId, syncPerformance } = req.body;
    // Your sync logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Testing

```bash
# Test with curl
curl -X POST http://localhost:3000/api/sync/meta \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","syncPerformance":true}'

# Check sync status
curl "http://localhost:3000/api/sync/meta?tenantId=test"
```

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Full Sync | 10 per tenant | 1 hour |
| Performance | Shared with Meta API | 1 hour |
| Single Entity | Shared with Meta API | 1 hour |

Meta API limit: 180-200 calls/hour per user

## Error Codes

- `CONNECTION_NOT_FOUND` - No Meta connection for tenant
- `CONNECTION_INACTIVE` - Connection expired or inactive
- `SYNC_IN_PROGRESS` - Sync already running
- `RATE_LIMIT_EXCEEDED` - Too many syncs
- `VALIDATION_ERROR` - Invalid request body
- `SYNC_FAILED` - Sync operation failed

## Security

- JWT authentication required
- Tenant isolation enforced
- Rate limiting per tenant
- Input validation with Zod
- Error messages sanitized
- Sensitive data never logged

## Production Checklist

- [ ] Add JWT authentication middleware
- [ ] Configure rate limiting thresholds
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Add request logging
- [ ] Configure CORS if needed
- [ ] Set up metrics tracking
- [ ] Test error scenarios
- [ ] Document for your team

## Support

For detailed documentation, troubleshooting, and examples:

- [Complete API Docs](../../docs/SYNC_API_ROUTES.md)
- [Meta Sync Service](../../docs/META_SYNC_SERVICE.md)
- [Implementation Guide](../../META_SYNC_COMPLETE.md)

---

**Status**: ✅ Production Ready  
**Framework**: Next.js 13+ App Router  
**TypeScript**: Fully Typed
