# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload)
bun run dev

# Production
bun run src/index.ts

# Add/remove dependencies (pre-approved)
bun add <package>
bun remove <package>
```

No build step required — Bun compiles TypeScript natively.

## Architecture Overview

This is a **hospital nursing record system API** (intranet-only) built with Bun + Elysia. It manages patient admissions, nursing shift assessments, and ward operations.

### Request Lifecycle

```
Request → CORS → Logger → Rate Limiter (50/min) → Security Headers → Route Handler
                                                                         ↓
                                                              authMiddleware (JWT verify)
                                                                         ↓
                                                              Controller (raw SQL)
```

### Layer Responsibilities

| Layer | Path | Purpose |
|-------|------|---------|
| Entry | `src/index.ts` | App bootstrap, middleware stack, port 3000 |
| Routes | `src/routes/` | HTTP definitions + Elysia `t` schema validation |
| Controllers | `src/controllers/` | Business logic, raw SQL queries |
| Middlewares | `src/middlewares/` | Auth, CORS, logging, security headers |
| Database | `src/db.ts` | Four connection pools (see below) |
| Utils | `src/utils/sanitize.ts` | XSS sanitization via sanitize-html |

### Databases (No ORM — raw parameterized SQL)

| Variable | Driver | System |
|----------|--------|--------|
| `his` | mysql2/promise | Hospital Information System (HIS) |
| `nurse` | mysql2/promise | Nurse Record database |
| `hris` | mysql2/promise | HR/Staff system |
| `core_kon` | postgres | CORE-KON system (PostgreSQL) |

All pools are set to 50 connections. Import the appropriate pool from `src/db.ts`.

### Authentication

- **JWT** via `@elysiajs/jwt`, 8-hour expiration, secret from `JWT_SECRET` env var (crashes if missing)
- Two login endpoints: `/api/v1/login` (bcryptjs) and `/api/v1/login/core-kon` (Argon2id)
- Token passed as `Authorization: Bearer <token>`
- `authMiddleware` adds `user` to request context via `.derive()` — use this on all protected routes

### Adding New Endpoints

1. Add controller function in `src/controllers/`
2. Register route in matching `src/routes/` file using Elysia's `t` for body validation
3. Wrap with `authMiddleware` if the endpoint requires authentication
4. Apply `sanitizeHTML()` from `src/utils/sanitize.ts` to any user-supplied string inputs

### Environment Variables

Required in `.env`:
```
JWT_SECRET
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
NURSE_RECORD_HOST, NURSE_RECORD_PORT, NURSE_RECORD_USER, NURSE_RECORD_PASSWORD, NURSE_RECORD_NAME
HRIS_HOST, HRIS_PORT, HRIS_USER, HRIS_PASSWORD, HRIS_NAME
CORE_KON_HOST, CORE_KON_PORT, CORE_KON_USER, CORE_KON_PASSWORD, CORE_KON_NAME
```

### Logging

Logs are written to `logs/access-YYYY-MM-DD.log` (daily rotation, 45-day retention). Cleanup runs automatically via `src/middlewares/cleanup-logs.ts`.
