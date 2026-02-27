# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

A multi-tenant SaaS platform that crawls Apple's iTunes Search API, stores iOS app metadata in PostgreSQL, computes Bayesian weighted ratings, and displays a ranked index of the worst-rated apps. Users register, add keywords to track, and the system crawls/stores results with quota-based plans.

## Tech Stack

- **Backend**: Python 3.14, FastAPI 0.115, SQLAlchemy 2.0 (async), Alembic, Celery 5.4, Redis
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Recharts, TanStack Query 5
- **Database**: PostgreSQL 16 (asyncpg driver), JSONB columns for raw API responses
- **Infra**: Docker Compose (7 services), Nginx reverse proxy
- **Testing**: pytest + pytest-asyncio (backend), Jest + React Testing Library (frontend)

## Common Commands

### Backend

```bash
# Activate virtualenv
source backend/venv/bin/activate

# Run all tests
cd backend && python -m pytest -v

# Run single test file
cd backend && python -m pytest tests/test_api_apps.py -v

# Run single test
cd backend && python -m pytest tests/test_api_apps.py::test_get_apps_empty -v

# Run tests matching pattern
cd backend && python -m pytest -k "crawl" -v

# Start dev server (requires local DB/Redis)
cd backend && uvicorn app.main:app --reload --port 8282

# Run migrations
cd backend && alembic upgrade head

# Create new migration
cd backend && alembic revision --autogenerate -m "description"
```

### Frontend

```bash
# Run all tests
cd frontend && npx jest --verbose

# Run single test file
cd frontend && npx jest src/__tests__/AppTable.test.tsx

# Run tests in watch mode
cd frontend && npm run test:watch

# Start dev server
cd frontend && npm run dev

# Build
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

### Docker

```bash
# Start full stack
docker compose up -d

# View logs
docker compose logs -f backend

# Restart specific service
docker compose restart backend celery-worker

# Run standalone crawl test (no DB needed)
source backend/venv/bin/activate && python scripts/simulate_crawl.py --country US --limit 50
```

## Architecture

### Database Schema (7 tables)

- **users** — Auth with JWT, plans (free/starter/pro), roles (user/admin)
- **keywords** — User-owned search terms with country + crawl frequency
- **crawl_jobs** — Job lifecycle (pending→running→completed/failed), links keyword to results
- **crawl_results** — Apps found per crawl job, deduplicated by (keyword_id, itunes_id)
- **apps** — Canonical app data with Bayesian weighted_score, unique on (itunes_id, country_id)
- **ratings_history** — Daily snapshots for charts
- **crawl_logs** — Audit trail for debugging

### Key Services

| File | Purpose |
|------|---------|
| `backend/app/services/crawler.py` | Crawl orchestration, upsert logic, history snapshots |
| `backend/app/services/itunes.py` | iTunes Search API async client with rate limiting |
| `backend/app/services/scoring.py` | Bayesian weighted rating: `W = (v/(v+m))*R + (m/(v+m))*C` |
| `backend/app/services/proxy.py` | Proxy rotation (IPRoyal/BrightData), circuit breaker |
| `backend/app/tasks/crawl_tasks.py` | Celery tasks, sync→async bridge |
| `frontend/src/lib/api.ts` | Typed API client with auth token handling |

### Architectural Decisions

1. **Lazy DB engine init** — `database.py` uses `get_engine()` / `get_session_factory()` to avoid import-time connections (required for SQLite test isolation)
2. **PostgreSQL upsert** — `INSERT ... ON CONFLICT DO UPDATE` on `(itunes_id, country_id)` for idempotent crawls
3. **JSONB→JSON remap in tests** — `conftest.py` swaps JSONB to JSON before `create_all` for SQLite compatibility
4. **Celery sync→async bridge** — `crawl_tasks.py` runs async code via `asyncio.new_event_loop().run_until_complete()`
5. **BFF auth pattern** — JWT tokens stored as httpOnly cookies, Next.js API routes proxy auth to FastAPI

### API Structure

All endpoints under `/api/v1`:
- **Public**: `/apps`, `/apps/{id}`, `/apps/{id}/history`, `/apps/stats`, `/categories`, `/categories/countries`, `/health`, `/billing/plans`
- **Authenticated**: `/keywords`, `/results`, `/crawls`, `/billing/usage`, `/auth/me`
- **Admin**: `/admin/users`, `/admin/stats`

## Testing Notes

- Backend tests use SQLite in-memory (no PostgreSQL required)
- `conftest.py` remaps JSONB columns to JSON for SQLite compatibility
- iTunes API tests use `respx` for HTTP mocking
- Frontend tests mock API calls and auth state
