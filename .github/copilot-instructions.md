# Copilot Instructions for Meta Ads Optimization Repository

## Repository Overview

This repository contains the MongoDB + Redis database layer and initialization tooling for the Meta ads optimization stack. It provides the foundational data models, authentication middleware, security utilities, and database connectivity for an autonomous Meta/Facebook Ads campaign management system.

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript (strict mode)
- **Database:** MongoDB with Mongoose ODM
- **Cache/Session:** Redis with ioredis
- **Authentication:** JWT with bcrypt for password hashing
- **Validation:** Zod schemas
- **Logging:** Winston with daily rotate file transport
- **Infrastructure:** Docker Compose for local development
- **CI/CD:** GitHub Actions

## Project Structure

```
lib/
├── db/              # Database connection and models
│   ├── client.ts    # MongoDB connection with caching
│   ├── redis.ts     # Redis client configuration
│   └── models/      # Mongoose models and schemas
├── middleware/      # Express middleware
│   ├── auth.ts      # JWT authentication
│   ├── error-handler.ts
│   └── rate-limit.ts
└── utils/           # Utility functions
    ├── crypto.ts    # Encryption/decryption utilities
    ├── logger.ts    # Winston logging setup
    ├── meta-scopes.ts
    └── validators.ts
scripts/             # Test and utility scripts
```

## Key Models

- **Tenant:** Multi-tenant organization/user accounts
- **MetaConnection:** OAuth tokens and Meta Business account connections
- **AdAccount, Campaign:** Meta advertising entities
- **AudienceInsight, PerformanceSnapshot:** Analytics and optimization data
- **WebsiteAudit, GeneratedCopy:** AI-generated content and audits
- **OptimizationLog:** Audit trail for automated decisions

## Coding Standards

### TypeScript

- Use TypeScript strict mode; avoid `any` types
- Prefer explicit types over inference for public APIs
- Use interfaces for object shapes, types for unions/intersections
- Export types alongside implementations

### Mongoose Models

- Define schemas with explicit types using `mongoose.Schema<T>`
- Include timestamps: `{ timestamps: true }`
- Create indexes for frequently queried fields
- Use virtual properties for computed fields
- Implement `toJSON` transforms to clean up output

### Security

- **Never commit secrets** – use environment variables
- Encrypt sensitive data at rest using `lib/utils/crypto.ts`
- Hash passwords with bcrypt (cost factor 12)
- Validate all user inputs with Zod schemas
- Use JWT for stateless authentication with reasonable expiry times
- Run `npm run security:scan` before committing sensitive changes
- See `SECURITY.md` for comprehensive security guidelines

### Error Handling

- Use the centralized error handler middleware
- Throw descriptive errors with appropriate status codes
- Log errors with Winston logger including context
- Return consistent error response format

### Redis

- Use Redis for session storage, rate limiting, and caching
- Prefix keys by feature (e.g., `ratelimit:`, `session:`)
- Set appropriate TTLs on all cached data
- Handle Redis connection failures gracefully

### Logging

- Use structured logging via Winston logger in `lib/utils/logger.ts`
- Log levels: `error`, `warn`, `info`, `debug`
- Include contextual information (userId, tenantId, requestId)
- Never log sensitive data (tokens, passwords, PII)

## Development Workflow

### Local Setup

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Start services: `npm run docker:up`
4. Initialize DB: `npm run test:db`
5. Run test scripts as needed

### Environment Variables

Required variables:
- `MONGODB_URI` – MongoDB connection string
- `REDIS_URL` – Redis connection string
- `JWT_SECRET` – JWT signing secret
- `ENCRYPTION_KEY` – 256-bit key for data encryption

### Testing

- Run test scripts: `npm run test:db`, `npm run test:security`, `npm run test:auth`, `npm run test:rate`
- Test scripts are in `scripts/` directory
- Always test database connections and encryption before deployment

### Branch Strategy

- Default branch: `mongodb-db-setup` (transitioning to `main`)
- Use short-lived feature branches: `feature/<short-name>`
- Open PRs and use squash merge
- Keep PRs small and focused

## Common Tasks

### Adding a New Model

1. Create model file in `lib/db/models/`
2. Define TypeScript interface for document type
3. Create Mongoose schema with explicit types
4. Add indexes for queries
5. Export from `lib/db/models/index.ts`
6. Update sync script if needed

### Adding Middleware

1. Create middleware file in `lib/middleware/`
2. Export Express middleware function
3. Use proper TypeScript types for req, res, next
4. Handle errors appropriately
5. Add tests in `scripts/` if needed

### Working with Meta API

- Reference `META_ADS_OPTIMIZATION_STRATEGY.md` for business logic
- Meta API scopes are defined in `lib/utils/meta-scopes.ts`
- Store OAuth tokens encrypted in MetaConnection model
- Implement retry logic for API calls
- Respect rate limits

## Performance Considerations

- Use MongoDB connection pooling (configured in `client.ts`)
- Implement Redis caching for frequently accessed data
- Use lean() queries when you don't need full Mongoose documents
- Create compound indexes for complex queries
- Paginate large result sets

## CI/CD

- CI runs on GitHub Actions
- Required checks: lint, typecheck, build, tests
- PRs must pass all checks before merge
- Use GitHub Actions secrets for sensitive values

## Documentation

- Update README.md for user-facing changes
- Update CONTRIBUTING.md for workflow changes
- Document complex business logic inline
- Keep this file updated with architectural changes

## Meta Ads Optimization Context

This system implements autonomous campaign optimization based on:
- Three-phase optimization cycle (Audit → Optimize → Monitor)
- Statistical significance requirements before changes
- Learning phase protection (minimum 50 conversions)
- Emergency pause protocols for poor performance
- Automated budget reallocation based on ROAS/CPA
- Creative refresh strategies

See `META_ADS_OPTIMIZATION_STRATEGY.md` for complete strategy documentation.

## Questions or Issues?

- Check existing code patterns in `lib/` directory
- Review test scripts in `scripts/` for usage examples
- Consult CONTRIBUTING.md for workflow questions
- Refer to Mongoose, Redis, and Winston official docs for library-specific questions
