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

## API Examples

See **`examples/api/`** for complete Next.js API route examples demonstrating:

- **Campaign Ad Sets**: Create and list ad sets under campaigns
- **Ad Set Ads**: Create and list ads under ad sets  
- **Ad Management**: Get, update (PATCH), and soft delete individual ads
- **Bulk Operations**: Update status for multiple ads at once

These are **reference implementations** showing how to use the database models in a real Next.js application with proper authentication, rate limiting, validation, and error handling.

📖 **[Read the API Examples README →](examples/api/README.md)**

## Meta OAuth Integration

Learn how to connect Facebook accounts, access Business Manager, and list Facebook Pages:

📖 **[Meta OAuth Integration Guide →](docs/META_OAUTH_INTEGRATION.md)**

The guide covers:
- Facebook Login OAuth flow implementation
- Business Manager account access
- Listing and managing Facebook Pages
- Token management and refresh
- Complete code examples for Next.js

## Meta Ads Data Reference

Comprehensive guide to all data you can retrieve from Meta's Marketing API:

📖 **[Meta Ads Data Reference →](docs/META_DATA_REFERENCE.md)**

The reference covers:
- **Facebook Pixel data** - conversion tracking, custom events, server-side API
- **Business Manager metrics** - account age, historical ad spend, owned assets
- **Ad Account data** - spend caps, balances, account statistics
- **Targeting options** - interests, custom audiences, lookalikes, retargeting
- **Demographics & geography** - age, gender, location targeting with reach estimates
- **Placements** - Facebook, Instagram, Audience Network, Messenger positions
- **Optimization goals** - awareness, consideration, conversion objectives
- **Complete field reference** - all available API fields for campaigns, ad sets, ads

## Meta Recent Updates & New Features

Latest Meta/Facebook advertising platform updates and API changes:

📖 **[Meta Recent Updates Guide →](docs/META_RECENT_UPDATES.md)**

The guide covers:
- **Advantage+ campaigns** - AI-powered optimization, shopping/app campaigns, 10-20% better ROAS
- **Advantage+ creative** - dynamic creative testing, automatic enhancements, catalog optimization
- **API v21.0 → v22.0 migration** - breaking changes, new fields, rate limit updates
- **iOS 14.5+ privacy changes** - ATT, AEM, event priorities, attribution windows
- **Reels placements** - new video formats, 9:16 aspect ratio, specifications
- **Meta Verified for Business** - verification status, benefits, API integration
- **Messaging APIs** - WhatsApp Business API, Messenger updates
- **Implementation guide** - migration checklist, code examples, testing

## AI-Powered Ad Copy Generation

Guide to implementing AI-powered ad copy generation with OpenAI, Claude, and other LLMs:

📖 **[AI Copy Generation Guide →](docs/AI_COPY_GENERATION.md)**

The guide covers:
- **OpenAI & Claude integration** - GPT-4, GPT-4o, Claude 3.5 Sonnet implementation
- **Copy generation strategies** - product-focused, audience-targeted, retargeting copy
- **Creative management** - linking copy to ads, tracking usage across campaigns
- **A/B testing** - setting up copy tests, analyzing results, finding winners
- **Quality scoring** - automated scoring based on Meta best practices
- **Creative refresh** - detecting fatigue, generating new variants, performance optimization
- **Best practices** - prompt engineering, model selection, performance tips

## Notes

- Indexes are synchronized during `initializeDatabase()` in `lib/db/index.ts`.
- DB connection caching lives in `lib/db/client.ts`.
- Redis client is implemented in `lib/db/redis.ts`.
- Required models are in `lib/db/models`: `Tenant`, `MetaConnection`, `WebsiteAudit`, `GeneratedCopy`, `Campaign`, `AdSet`, `Ad`, `OptimizationLog`.

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

## Contributing

Before opening a PR, please read `CONTRIBUTING.md` for branch strategy, commit/PR hygiene, CI requirements, and local setup. PRs use the template in `.github/pull_request_template.md`.

CI runs on PRs to `main` and pushes to feature branches. After your first CI run, branch protections can mark these checks as required: lint, typecheck, build, test. See `docs/branch-protection.md` for the exact GitHub settings.
