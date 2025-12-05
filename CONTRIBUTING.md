# Contributing Guide

Thank you for considering a contribution! This project follows a simple trunk-based workflow.

## Branch Strategy

- Default branch: `main`
- Use short-lived feature branches: `feature/<short-name>`
- Open a PR into `main` and prefer squash merges

## Commit & PR Hygiene

- Use clear, descriptive commit messages (Conventional Commits are welcome)
- Keep PRs small and focused; include context and test evidence
- Link issues when applicable

## CI Requirements

- CI runs lint, typecheck, build, and tests
- PRs must pass required checks before merge
- Secrets must never be committed; use GitHub Actions secrets for CI

## Local Setup

- Copy `.env.example` to `.env` and fill values
- Use Docker Compose to start MongoDB and Redis
- Run test scripts:
  - `npm run test:security`
  - `npm run test:auth`
  - `npm run test:rate`

## Code Style & Types

- TypeScript strict preferred; avoid `any` when possible
- Use Zod for input validation in new endpoints
- Keep logging structured via the provided logger utilities

## Review & Merge

- At least one approval required
- Rebase or squash to keep history clean
- Branches are auto-deleted after merge

## Release & Deployment

- Merges to `main` go to staging; tagged releases deploy to production (if configured)
- Use feature flags for risky changes when possible
