# Worst Rated iOS Apps Index

## Project Summary

A full-stack web platform that crawls Apple's iTunes Search API, stores iOS app metadata in PostgreSQL, computes Bayesian weighted ratings, and displays a ranked index of the worst-rated apps. Built as an MVP — all code, tests, and Docker infrastructure are complete and working.

## Tech Stack

- **Backend**: Python 3.14, FastAPI 0.115, SQLAlchemy 2.0 (async), Alembic, Celery 5.4, Redis
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3.4, Recharts
- **Database**: PostgreSQL 16 (asyncpg driver), JSONB columns for raw API responses
- **Infra**: Docker Compose (7 services), Nginx reverse proxy
- **Testing**: pytest + pytest-asyncio (backend, 152 tests), Jest + React Testing Library (frontend, 64 tests)

## Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI route handlers
│   │   │   ├── apps.py      # Main endpoints: list, detail, history, stats, crawl
│   │   │   ├── categories.py # Categories + countries listing
│   │   │   └── health.py    # Health check
│   │   ├── core/
│   │   │   ├── config.py    # Pydantic Settings (env vars)
│   │   │   ├── database.py  # Lazy-init async engine + session factory + Base
│   │   │   ├── redis.py     # Async Redis client singleton
│   │   │   └── security.py  # slowapi rate limiter
│   │   ├── models/
│   │   │   └── models.py    # 5 SQLAlchemy models (Country, Category, App, RatingHistory, CrawlLog)
│   │   ├── schemas/
│   │   │   └── schemas.py   # Pydantic v2 response schemas
│   │   ├── services/
│   │   │   ├── itunes.py    # iTunes Search API async client (search, lookup, batch, parse)
│   │   │   ├── scoring.py   # Bayesian weighted score computation
│   │   │   └── crawler.py   # Crawl orchestration (upsert, history snapshots, logging)
│   │   ├── tasks/
│   │   │   ├── celery_app.py    # Celery config + beat schedule
│   │   │   └── crawl_tasks.py   # Celery task wrappers (sync→async bridge)
│   │   ├── utils/
│   │   │   └── constants.py # 27 iTunes categories, 20 countries, 33 search terms
│   │   └── main.py          # FastAPI app entry point (lifespan, CORS, rate limiting)
│   ├── alembic/              # Database migrations
│   │   └── versions/001_initial_schema.py
│   ├── tests/                # 152 pytest tests (all passing)
│   │   ├── conftest.py       # SQLite in-memory engine, JSONB→JSON remap, fixtures
│   │   ├── test_api_apps.py  # 30 API endpoint tests
│   │   ├── test_api_categories.py
│   │   ├── test_api_health.py
│   │   ├── test_config.py
│   │   ├── test_constants.py
│   │   ├── test_crawler.py
│   │   ├── test_itunes.py    # respx-mocked HTTP tests
│   │   ├── test_models.py
│   │   ├── test_schemas.py
│   │   └── test_scoring.py
│   ├── requirements.txt
│   ├── pytest.ini            # asyncio_mode = auto
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Home page (filters + ranked table)
│   │   │   ├── apps/[id]/page.tsx # App detail page (stats, chart, metadata)
│   │   │   ├── layout.tsx       # Root layout with header/footer
│   │   │   └── globals.css      # Tailwind imports + dark mode vars
│   │   ├── components/
│   │   │   ├── AppTable.tsx     # Ranked table with pagination, rank badges, star ratings
│   │   │   ├── Filters.tsx      # Sort, country, category dropdowns + search + min-reviews slider
│   │   │   ├── RatingChart.tsx  # Recharts line chart for rating history
│   │   │   └── ThemeToggle.tsx  # Dark/light mode toggle with localStorage
│   │   ├── hooks/
│   │   │   └── useApps.ts      # State management hook for filters + data fetching
│   │   ├── lib/
│   │   │   └── api.ts          # Typed API client (fetchApi generic + 6 endpoint functions)
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces (AppListItem, AppDetail, etc.)
│   │   └── __tests__/          # 64 Jest tests (all passing)
│   ├── jest.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml          # 7 services: db, redis, backend, celery-worker, celery-beat, frontend, nginx
├── docker/nginx.conf           # Reverse proxy: /api/ → backend:8282, / → frontend:3000
├── scripts/
│   ├── simulate_crawl.py       # Standalone iTunes API test (no DB needed, saves JSON)
│   ├── seed_db.py              # DB seeder: 100 mock apps + 30 days history per app
│   └── compute_scores.sql      # Production SQL queries for scoring
├── .env.example                # All env vars documented
└── README.md
```

## Database Schema (5 tables)

- **countries** — `id, code (unique), name, active`
- **categories** — `id, itunes_id (unique), name, parent_id (self-FK)`
- **apps** — `id, itunes_id, bundle_id, name, developer, category_id (FK), country_id (FK), average_rating, rating_count, weighted_score, price, currency, icon_url, store_url, description, content_rating, release_date, updated_date, raw_json (JSONB), created_at, updated_at` — Unique constraint on `(itunes_id, country_id)`
- **ratings_history** — `id, app_id (FK), average_rating, rating_count, weighted_score, snapshot_date` — Composite index on `(app_id, snapshot_date)`
- **crawl_logs** — `id, source, country_code, category_id, search_term, status, apps_found, apps_updated, error_message, duration_seconds, raw_response (JSONB), created_at`

## API Endpoints (all under /api/v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | /apps | Paginated list with sort, country, category, min_reviews, max_rating, search filters |
| GET | /apps/stats | Index statistics (total apps, global mean, last crawl) |
| GET | /apps/{id} | Single app detail with category + country relations |
| GET | /apps/{id}/history | Rating history snapshots (for charts, max 365 days) |
| POST | /apps/crawl | Trigger Celery crawl task (optional country + category_id params) |
| GET | /categories | All categories |
| GET | /categories/countries | All active countries |
| GET | /health | Health check |

## Core Algorithm: Bayesian Weighted Rating

```
W = (v / (v + m)) × R + (m / (v + m)) × C
```
- R = app's average rating, v = rating count, m = minimum threshold (default 100), C = global mean
- Implemented in `backend/app/services/scoring.py`
- Lower score = worse app = higher rank
- Bulk recompute via single SQL UPDATE in `recompute_all_scores()`

## Key Architectural Decisions

1. **Lazy database engine init** — `database.py` uses `get_engine()` / `get_session_factory()` to avoid import-time DB connections (required for test isolation with SQLite)
2. **PostgreSQL upsert** — `crawler.py` uses `INSERT ... ON CONFLICT DO UPDATE` on the `(itunes_id, country_id)` unique constraint for idempotent crawls
3. **JSONB→JSON remap in tests** — `conftest.py` swaps JSONB columns to JSON before `create_all` for SQLite compatibility
4. **Celery sync→async bridge** — `crawl_tasks.py` runs async crawler code in Celery's sync workers via `asyncio.new_event_loop().run_until_complete()`
5. **Redis cache** — API responses cached 5 minutes, key format: `apps:{sort}:{country}:{category}:{min_reviews}:{max_rating}:{search}:{page}:{page_size}`
6. **Rate limiting** — slowapi on API endpoints (60/min default), iTunes API client uses semaphore (20/min) + 3-second delay

## Running Tests

```bash
# Backend (from project root)
source backend/venv/bin/activate
cd backend && python -m pytest -v

# Frontend (from frontend/)
cd frontend && npx jest --verbose
```

## Running the App

```bash
# Full stack via Docker
cp .env.example .env
docker compose up -d

# Standalone crawl test (no DB needed)
source backend/venv/bin/activate
python scripts/simulate_crawl.py --country US --limit 50
```

## What's NOT Implemented Yet

- Monitoring stack (Prometheus/Grafana)
- Production deployment
- Multi-country scheduled crawls
- 42matters API integration
- Materialized views for rankings
- Authentication on crawl endpoint
