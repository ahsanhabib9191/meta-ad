# Copilot Instructions for Meta Ads Optimization DB

This repository contains the MongoDB + Redis database layer, middleware, and initialization tooling for the Meta ads optimization stack.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB 6 with Mongoose ODM
- **Cache/Rate Limiting**: Redis 7 with ioredis
- **Authentication**: JWT (jsonwebtoken) + API key verification
- **Encryption**: AES-256-GCM for sensitive data (Meta tokens)
- **Validation**: Zod schemas
- **Logging**: Winston with daily rotation

## Project Structure

```
lib/
├── db/
│   ├── client.ts      # MongoDB connection caching
│   ├── index.ts       # Database initialization and index sync
│   ├── redis.ts       # Redis client
│   └── models/        # Mongoose models (Tenant, MetaConnection, Campaign, etc.)
├── middleware/
│   ├── auth.ts        # JWT and API key verification
│   ├── rate-limit.ts  # Redis-based sliding window rate limiting
│   └── error-handler.ts
└── utils/
    ├── crypto.ts      # AES-256-GCM encryption, bcrypt hashing, API key generation
    ├── logger.ts      # Winston logger configuration
    ├── validators.ts  # Zod validation schemas
    └── meta-scopes.ts # Meta API scope helpers
scripts/               # Test and migration scripts
```

## Coding Standards

### TypeScript
- Use strict TypeScript; avoid `any` when possible
- Prefer interfaces over type aliases for object shapes
- Use async/await over raw Promises

### Security
- Never commit secrets or credentials
- Always encrypt Meta tokens using `lib/utils/crypto.ts`
- Use `hashApiKey()` for API key storage (never store plaintext)
- Validate all inputs with Zod schemas

### Database
- Define indexes in model files
- Use `initializeDatabase()` to sync indexes on startup
- Prefer `.lean()` for read-only queries
- Always handle connection errors gracefully

### Error Handling
- Use structured error responses with status codes
- Log errors with context using the Winston logger
- Never expose internal error details to clients

## Environment Variables

Required variables (see `.env.example`):
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `ENCRYPTION_KEY` - 32-byte hex string for AES-256-GCM
- `NEXTAUTH_SECRET` - JWT signing secret

## Testing

Run tests locally:
```bash
npm run docker:up          # Start MongoDB and Redis
npm run test:security      # Token encryption and API key tests
npm run test:auth          # Authentication middleware tests
npm run test:rate          # Rate limiting tests
npm run docker:down        # Stop services
```

## Common Tasks

### Adding a New Model
1. Create model file in `lib/db/models/`
2. Define schema with appropriate indexes
3. Export model and add to `lib/db/models/index.ts`
4. Add encryption hooks if storing sensitive data

### Adding Middleware
1. Create middleware in `lib/middleware/`
2. Follow the pattern in `auth.ts` for request handling
3. Use Zod for request validation
4. Add appropriate test in `scripts/`

### Encryption
- Use `encrypt()` and `decrypt()` from `lib/utils/crypto.ts`
- For passwords, use `hashPassword()` and `comparePassword()`
- For API keys, use `generateApiKey()` and `hashApiKey()`

## CI/CD

CI runs on PRs to `main` and pushes to feature branches:
- Lint and typecheck
- Build TypeScript
- Run security, auth, and rate limit tests against MongoDB/Redis services

## Do Not

- Store plaintext secrets in code or config files
- Skip input validation
- Use synchronous database operations
- Commit `node_modules/` or `dist/` directories
- Modify test infrastructure without updating CI
