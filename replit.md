# Shothik.ai - Meta Ads Automation Platform

## Overview
Shothik.ai is a Meta ads automation platform with AI-powered optimization. The project consists of:
- **Frontend**: React + Vite + TypeScript + Tailwind CSS dashboard
- **Backend Infrastructure**: MongoDB + Redis database layer with Meta API integration

## Project State
- **Status**: Frontend running, backend infrastructure ready
- **Frontend Port**: 5000
- **Framework**: React + Vite + TypeScript + Tailwind CSS v4

## Architecture

### Frontend (`client/`)
- `client/src/pages/` - Page components (Dashboard, Welcome, Register, MonthlyReview, PixelVerification, WeeklyReport)
- `client/src/components/` - Shared components (Layout, Sidebar)
- `client/src/App.tsx` - React Router routes
- `client/src/index.css` - Tailwind CSS with custom theme

### Backend (`lib/`)
- `lib/db/` - Database models and connection management (Mongoose/MongoDB)
- `lib/db/models/` - All Mongoose models (Tenant, Campaign, AdSet, Ad, etc.)
- `lib/db/redis.ts` - Redis client configuration
- `lib/middleware/` - Express middleware (auth, rate limiting, error handling)
- `lib/services/` - Meta API integration services (OAuth, sync)
- `lib/utils/` - Utilities (encryption, logging, validation)
- `lib/optimization/` - Ad optimization decision engine

### Theme Colors
- Primary: `#13ec80` (green)
- Background Dark: `#111814`
- Background Light: `#f6f8f7`
- Success: `#10B981`
- Error: `#EF4444`
- Warning: `#FFC107`

## Pages
1. **Dashboard** (`/`) - Main dashboard with ad accounts, business managers, pixels
2. **Welcome** (`/welcome`) - Onboarding page with Facebook account connection
3. **Register** (`/register`) - User registration form
4. **Monthly Review** (`/monthly-review`) - Performance analytics and AI copy testing
5. **Pixel Verification** (`/pixel-verification`) - Pixel & CAPI setup verification
6. **Weekly Report** (`/reports`) - Weekly performance report with charts

## Environment Variables
Set these in `.env` or Replit Secrets:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `ENCRYPTION_KEY` - 32-byte key for AES-256-GCM encryption
- `NEXTAUTH_SECRET` - JWT authentication secret
- `META_APP_ID`, `META_APP_SECRET` - Facebook/Meta app credentials

## Running the App
- Frontend workflow runs `cd client && npm run dev` on port 5000
- Backend build: `npm run build` in root directory

## Notes
- Backend requires external MongoDB and Redis services
- Frontend uses Tailwind CSS v4 with @theme directives
- Dark mode is enabled by default
