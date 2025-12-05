# Meta Ads Optimization – DB & Infra

This repo contains the MongoDB + Redis database layer and initialization tooling for the Meta ads optimization stack.

## Quick Start

1. Prereqs

- macOS with Homebrew
- Docker Desktop installed and running
- Node.js 20+

1. Install deps

```zsh
npm install
```

1. Environment

- Copy `.env.example` to `.env` and adjust if needed.
- Defaults target local services:

```env
MONGODB_URI=mongodb://localhost:27017/meta
REDIS_URL=redis://localhost:6379
```

1. Start local services

```zsh
npm run docker:up
```

1. Run smoke test (initializes DB and syncs indexes)

```zsh
npm run test:db
```

1. Tear down services

```zsh
npm run docker:down
```

## Scripts

- `npm run build` – TypeScript build
- `npm run test:db` – Runs initialization and verifies DB connectivity
- `npm run test:security` – Validates Meta token encryption at rest and Tenant API key lifecycle
- `npm run docker:up` – Starts MongoDB 6 and Redis 7 via Docker Compose
- `npm run docker:down` – Stops services
- `npm run docker:logs` – Shows recent container logs

## Troubleshooting

- Docker not found:
  - Install Docker Desktop via Homebrew: `brew install --cask docker`
  - Launch Docker.app and wait until it shows “Docker Desktop is running”.

- Mongo connection refused:
  - Wait 10–20 seconds for containers to become healthy.
  - Check logs: `npm run docker:logs`

- TypeScript/ts-node errors:
  - Ensure Node 20+ and clean install: `rm -rf node_modules package-lock.json && npm install`

## Notes

- Indexes are synchronized during `initializeDatabase()` in `lib/db/index.ts`.
- DB connection caching lives in `lib/db/client.ts`.
- Redis client is implemented in `lib/db/redis.ts`.
- Required models are in `lib/db/models`: `Tenant`, `MetaConnection`, `WebsiteAudit`, `GeneratedCopy` plus `Campaign`, `OptimizationLog`.

## Migration: encrypt existing Meta tokens

Use the provided migration to backfill encryption for existing `MetaConnection` tokens.

1. Set `ENCRYPTION_KEY` in your `.env` (32-byte base64 or hex; AES-256-GCM key).
2. Dry run (no writes):

```zsh
DRY_RUN=true node dist/scripts/encrypt-existing-tokens.js
```

1. Live run (writes encrypted tokens):

```zsh
DRY_RUN=false node dist/scripts/encrypt-existing-tokens.js
```

The migration attempts to decrypt each token; when decryption fails, the value is treated as plaintext and encrypted.

## Security test

Run the minimal security checks for token encryption and API key logic:

```zsh
npm run test:security
```

## Required environment variables

Add these to `.env` (see `.env.example`):

- `MONGODB_URI` – e.g., `mongodb://localhost:27017/meta`
- `REDIS_URL` – e.g., `redis://localhost:6379`
- `ENCRYPTION_KEY` – AES-256-GCM key used by `lib/utils/crypto.ts`
- `NEXTAUTH_SECRET` – JWT verification secret used by `lib/middleware/auth.ts`
- Logging:
  - `LOG_LEVEL` – default `info`
- Rate limiting:
  - `RATE_LIMIT_MAX` – requests allowed per window (default 60)
  - `RATE_LIMIT_WINDOW_MS` – window duration in ms (default 60000)
