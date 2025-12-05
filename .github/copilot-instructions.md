# Copilot Instructions

This repository contains the MongoDB + Redis database layer and initialization tooling for the Meta ads optimization stack.

## Project Overview

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+
- **Databases**: MongoDB 6, Redis 7
- **Build tool**: TypeScript compiler (tsc)

## Code Style & Conventions

- Use TypeScript strict mode; avoid `any` when possible
- Use Zod for input validation in new endpoints
- Keep logging structured via the provided logger utilities in `lib/utils/logger.ts`
- Follow Conventional Commits for commit messages
- Keep PRs small and focused

## Project Structure

```
lib/
├── db/           # Database layer
│   ├── client.ts      # DB connection caching
│   ├── index.ts       # initializeDatabase() and index sync
│   ├── redis.ts       # Redis client
│   └── models/        # Mongoose models (Tenant, MetaConnection, Campaign, etc.)
├── middleware/   # Express/Next.js middleware
│   ├── auth.ts        # JWT verification using NEXTAUTH_SECRET
│   ├── error-handler.ts
│   └── rate-limit.ts  # Redis-backed rate limiting
└── utils/        # Utility functions
    ├── crypto.ts      # AES-256-GCM encryption for tokens
    ├── logger.ts      # Winston structured logging
    ├── meta-scopes.ts # Meta API scope definitions
    └── validators.ts  # Zod validation schemas
```

## Development Workflow

1. Copy `.env.example` to `.env` and configure required variables
2. Start local services: `npm run docker:up`
3. Run tests:
   - `npm run test:db` – DB connectivity and initialization
   - `npm run test:security` – Token encryption validation
   - `npm run test:auth` – Authentication middleware tests
   - `npm run test:rate` – Rate limiting tests
4. Build: `npm run build`

## Required Environment Variables

- `MONGODB_URI` – MongoDB connection string
- `REDIS_URL` – Redis connection string
- `ENCRYPTION_KEY` – AES-256-GCM key (32-byte hex) for `lib/utils/crypto.ts`
- `NEXTAUTH_SECRET` – JWT verification secret for `lib/middleware/auth.ts`
- `LOG_LEVEL` – Logging level (default: info)
- `RATE_LIMIT_MAX` – Rate limit requests per window
- `RATE_LIMIT_WINDOW_MS` – Rate limit window duration in ms

## Security Guidelines

- Never commit secrets or credentials
- Use the encryption utilities in `lib/utils/crypto.ts` for sensitive data
- Meta tokens must be encrypted at rest using AES-256-GCM
- API keys should follow the tenant lifecycle in the Tenant model

## Testing

- Run security tests before any PR: `npm run test:security`
- CI runs lint, typecheck, build, and tests on all PRs
- Tests require MongoDB and Redis services (use Docker Compose locally)

## CI/CD

- CI workflow is defined in `.github/workflows/ci.yml`
- PRs must pass all required checks before merge
- Prefer squash merges to keep history clean
