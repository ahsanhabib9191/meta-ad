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
