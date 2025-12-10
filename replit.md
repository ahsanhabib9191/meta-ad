# Meta Ads Optimization - Database & Infrastructure

## Overview
This is a **backend infrastructure library** that provides MongoDB and Redis database layer for Meta ads optimization. It is NOT a web application - it's a library/tooling package meant to be used by other applications.

## Project State
- **Status**: Build passes, ready for development
- **Type**: TypeScript library/infrastructure
- **Databases Required**: MongoDB 6.0+, Redis 7+

## Architecture

### Key Components
- `lib/db/` - Database models and connection management (Mongoose/MongoDB)
- `lib/db/models/` - All Mongoose models (Tenant, Campaign, AdSet, Ad, etc.)
- `lib/db/redis.ts` - Redis client configuration
- `lib/middleware/` - Express middleware (auth, rate limiting, error handling)
- `lib/services/` - Meta API integration services (OAuth, sync)
- `lib/utils/` - Utilities (encryption, logging, validation)
- `lib/optimization/` - Ad optimization decision engine
- `scripts/` - Test and utility scripts
- `examples/api/` - Next.js API route examples

### Database Models
- Tenant, MetaConnection, WebsiteAudit, GeneratedCopy
- Campaign, AdSet, Ad, OptimizationLog
- AudienceInsight, CreativeAsset, PerformanceSnapshot

## Environment Variables Required
Set these in `.env` or Replit Secrets:
- `MONGODB_URI` - MongoDB connection string (requires external MongoDB service)
- `REDIS_URL` - Redis connection string (requires external Redis service)
- `ENCRYPTION_KEY` - 32-byte key for AES-256-GCM encryption
- `NEXTAUTH_SECRET` - JWT authentication secret
- `META_APP_ID`, `META_APP_SECRET` - Facebook/Meta app credentials

## Available Scripts
- `npm run build` - TypeScript compilation
- `npm run test:db` - Database connectivity test (requires MongoDB)
- `npm run test:all` - Run all tests (requires MongoDB + Redis)
- `npm run list:tasks` - Validate implementation status

## Notes
- This project requires external MongoDB and Redis services (not included in Replit's built-in database)
- The docker-compose.yml is for local development only (Docker not available on Replit)
- Build compiles successfully; tests require database connections
