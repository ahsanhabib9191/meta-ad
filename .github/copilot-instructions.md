# Copilot Instructions for Meta Ads Optimization DB

This repository is the **database layer and middleware infrastructure** for a Meta ads optimization SaaS. It provides MongoDB models, Redis caching/rate limiting, authentication, and encryption utilities to be consumed by the main Next.js application.

## Architecture Overview

**System Role**: Database abstraction + middleware layer (not the web app itself)  
**Consumer**: Next.js app imports models and utilities from `lib/` to handle API requests  
**Key Insight**: This is shared infrastructure—changes here affect multiple features in the main app

```
┌─────────────────────────────────────────────────┐
│ Next.js App (separate repo/codebase)           │
│  └─ API routes import models + middleware      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ THIS REPO: DB Layer + Middleware                │
│  ├─ Models: Tenant, MetaConnection, Campaign   │
│  ├─ Auth: JWT + API key verification           │
│  ├─ Rate Limiting: Redis sliding window        │
│  └─ Encryption: AES-256-GCM for Meta tokens    │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ MongoDB 6 + Redis 7 (Docker Compose)           │
└─────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5+ (strict mode, CommonJS)
- **Database**: MongoDB 6 with Mongoose ODM (connection caching via `lib/db/client.ts`)
- **Cache/Rate Limiting**: Redis 7 with ioredis (global client in `lib/db/redis.ts`)
- **Authentication**: JWT (`jsonwebtoken`) + API key verification (SHA-256 hashed)
- **Encryption**: AES-256-GCM for sensitive data (Meta tokens stored encrypted at rest)
- **Validation**: Zod schemas in `lib/utils/validators.ts`
- **Logging**: Winston with daily log rotation (`logs/` directory)

## Critical Security Patterns

### 1. Token Encryption at Rest
**Pattern**: Meta OAuth tokens are **always encrypted** in the database.

```typescript
// lib/db/models/MetaConnection.ts demonstrates the pattern:
// - Pre-save hook encrypts accessToken/refreshToken
// - Instance methods decrypt on read: getAccessToken(), getRefreshToken()
// - Class helper MetaConnection.updateTokens() encrypts before updating

// ALWAYS use the class helpers or instance methods—never bypass encryption
const connection = await MetaConnection.create({
  tenantId, adAccountId, accessToken: plainToken, status: 'ACTIVE'
}); // ✅ Automatically encrypted

// To read decrypted value:
const decrypted = connection.getAccessToken(); // ✅ Uses instance method

// DO NOT directly read connection.accessToken (it's ciphertext)
```

**Why**: If the DB is compromised, attackers cannot use the tokens without the `ENCRYPTION_KEY`.

### 2. API Key Storage
**Pattern**: API keys are SHA-256 hashed before storage (like passwords).

```typescript
// Issue new key (returns plaintext once, stores hash):
const apiKey = await Tenant.issueApiKey(tenantId); // Returns "abc123..."
// DB stores SHA-256(apiKey), never the plaintext

// Verify incoming request:
const isValid = await Tenant.verifyApiKey(tenantId, apiKeyFromRequest);
```

**Never store plaintext API keys**—use `hashApiKey()` from `lib/utils/crypto.ts`.

## Database Initialization Pattern

**Critical**: Indexes must be synced on app startup to avoid runtime query failures.

```typescript
// lib/db/index.ts:initializeDatabase() handles this:
// 1. Drop existing indexes to avoid conflicts with auto-generated names
// 2. Sync declared indexes from each model's .index() calls
// 3. Run this during app initialization or before tests

// In tests or main app startup:
await initializeDatabase(); // ✅ Syncs all model indexes
```

**Why**: Mongoose won't auto-sync indexes in production. Without this, compound indexes like `{ tenantId: 1, adAccountId: 1 }` won't exist, causing slow queries or uniqueness violations.

## Rate Limiting Architecture

**Pattern**: Redis-based sliding window rate limiter (not token bucket).

```typescript
// lib/middleware/rate-limit.ts provides three limiters:
// 1. rateLimitByIp() - 100 req/15min per IP
// 2. rateLimitByTenant() - Daily limits based on plan tier (FREE: 1000, PRO: 10000)
// 3. rateLimitByApiKey() - 5000 req/hour per API key

// Usage in API routes:
const result = await rateLimitByTenant(req, tenantId);
if (!result.allowed) {
  res.statusCode = 429;
  res.setHeader('Retry-After', result.retryAfter!.toString());
  res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
  return;
}
```

**Implementation**: Uses Redis sorted sets (`ZADD`/`ZREMRANGEBYSCORE`) to track timestamps within sliding windows. Plan-based limits checked against `Tenant.plan` field.

## Testing Workflow

**Local Services**: Always start Docker containers before running tests.

```bash
# 1. Start services (MongoDB + Redis in detached mode):
npm run docker:up

# 2. Run test suite:
npm run test:security   # Encryption + API key lifecycle
npm run test:auth       # JWT + API key auth middleware
npm run test:rate       # Rate limiting with Redis
npm run test:db         # DB initialization + index sync

# 3. Check container health if tests fail:
npm run docker:logs

# 4. Tear down:
npm run docker:down
```

**Test Pattern**: All test scripts in `scripts/` follow this structure:
1. Load `.env` with `dotenv.config()`
2. Connect to DB/Redis
3. Create test data with random IDs (`Math.random().toString(36).slice(2)`)
4. Assert expected behavior
5. Disconnect and exit with appropriate code

**CI Behavior**: GitHub Actions spins up MongoDB + Redis service containers, runs all tests, and fails the build if any test exits non-zero.

## Model Conventions

### Schema Definition Pattern
```typescript
// All models follow this structure:
// 1. Define TypeScript interface extending Document
// 2. Create schema with explicit types
// 3. Define indexes inline (not in separate ensureIndex calls)
// 4. Export model with conditional check for hot reload
// 5. Optionally add static class helpers

export interface ITenant extends Document {
  tenantId: string;
  name: string;
  plan: PlanTier;
  // ...
}

const TenantSchema = new Schema<ITenant>({ /* fields */ }, { timestamps: true });

// Indexes:
TenantSchema.index({ tenantId: 1 }, { unique: true });

export const TenantModel: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

// Static helpers (optional but recommended):
export class Tenant {
  static async findByTenantId(id: string) { /* ... */ }
}
```

### Required Indexes
- **Tenant**: `{ tenantId: 1 }` (unique), `{ primaryDomain: 1 }` (sparse)
- **MetaConnection**: `{ tenantId: 1, adAccountId: 1 }` (unique), `{ status: 1 }`, `{ tokenExpiresAt: 1 }` (sparse)
- **Campaign**: `{ campaignId: 1 }` (unique), `{ accountId: 1, status: 1 }`, `{ objective: 1 }`

## Environment Variables

**Required** (no defaults, app fails if missing):
- `MONGODB_URI` - Full connection string (e.g., `mongodb://localhost:27017/meta-ads-optimization`)
- `REDIS_URL` - Redis connection string (e.g., `redis://localhost:6379`)
- `ENCRYPTION_KEY` - **Must be 64 hex characters** (32 bytes for AES-256-GCM). Generate: `openssl rand -hex 32`
- `NEXTAUTH_SECRET` - JWT signing secret (any strong random string)

**Optional** (with sensible defaults):
- `LOG_LEVEL` - Winston log level (default: `info` in prod, `debug` in dev)
- `NODE_ENV` - `production` hides error details in responses

**Never commit** `.env` files—use `.env.example` as a template.

## Common Tasks

### Adding a New Model
1. Create `lib/db/models/your-model.ts` following the pattern above
2. Define indexes inline with `.index()` calls
3. Add to `lib/db/models/index.ts` exports
4. Import and sync in `lib/db/index.ts:initializeDatabase()`
5. If storing sensitive data, add pre-save encryption hook (see `MetaConnection.ts`)

### Modifying Indexes
**Warning**: Changing indexes requires a migration in production.

1. Update `.index()` calls in model file
2. Run `initializeDatabase()` locally to sync (drops and recreates indexes)
3. In production, coordinate with DevOps for zero-downtime index changes

### Encryption for New Sensitive Fields
```typescript
// Example: Add encrypted field to existing model
YourSchema.pre('save', function(next) {
  if (this.isModified('sensitiveField')) {
    this.sensitiveField = encrypt(this.sensitiveField);
  }
  next();
});

// Add decryption helper:
YourSchema.methods.getSensitiveField = function(): string {
  return decrypt(this.sensitiveField);
};
```

## Error Handling Convention

**Pattern**: Use `AppError` class from `lib/middleware/error-handler.ts` for structured responses.

```typescript
import { AppError } from '../middleware/error-handler';

// In API handler:
if (!tenantId) throw AppError.badRequest('tenantId is required', { field: 'tenantId' });
if (!authorized) throw AppError.forbidden('Insufficient permissions');

// Error handler returns:
{
  "status": "error",
  "code": "BAD_REQUEST",
  "message": "tenantId is required",
  "details": { "field": "tenantId" },
  "requestId": "abc123",
  "timestamp": "2025-12-05T12:00:00.000Z"
}
```

**Never** expose raw stack traces or internal DB errors to clients (logger captures these).

## Logging Best Practices

```typescript
import logger from '../utils/logger';

// Structured logging (Winston JSON in production):
logger.info('Campaign created', { campaignId, tenantId, objective });
logger.error('Token refresh failed', { tenantId, error: err.message });

// Logs written to:
// - Console (colored in dev, JSON in prod)
// - logs/combined-YYYY-MM-DD.log (all levels)
// - logs/error-YYYY-MM-DD.log (errors only)
```

**Retention**: 14 days, 20MB max per file (auto-rotated daily).

## Do Not

- **Store plaintext secrets** (tokens, API keys, passwords) in DB or code
- **Skip input validation** (always use Zod schemas from `validators.ts`)
- **Modify learning phase campaigns** (see `META_ADS_OPTIMIZATION_STRATEGY.md` for business logic)
- **Bypass encryption helpers** (use class methods like `getAccessToken()`, not raw field access)
- **Commit `node_modules/`, `dist/`, or `.env` files**
- **Run tests without Docker services** (they will fail with connection errors)

## CI/CD Pipeline

**Triggered on**: PRs to `main`, pushes to feature branches

**Steps**:
1. Lint (`tsc --noEmit` for type checking)
2. Build (`tsc -p tsconfig.json` → `dist/`)
3. Start MongoDB + Redis service containers
4. Run test suite (`test:security`, `test:auth`, `test:rate`, `test:db`)
5. Fail build if any test exits non-zero

**Branch Protection**: Require CI checks to pass before merging to `main`.
