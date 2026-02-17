# Worst Rated iOS Apps Index — Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │ Browser  │  │ Mobile   │  │ API      │                          │
│  │ (Next.js)│  │ Client   │  │ Consumer │                          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                          │
│       └──────────────┼─────────────┘                                │
│                      ▼                                              │
│              ┌───────────────┐                                      │
│              │   Nginx /     │                                      │
│              │   Cloudflare  │                                      │
│              └───────┬───────┘                                      │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      ▼           BACKEND                            │
│  ┌─────────────────────────────────────────────────┐                │
│  │              FastAPI Application                 │                │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐     │                │
│  │  │ REST API │ │ Rate     │ │ Auth         │     │                │
│  │  │ Routes   │ │ Limiter  │ │ (API Keys)   │     │                │
│  │  └──────────┘ └──────────┘ └──────────────┘     │                │
│  └───────────┬─────────────────────┬───────────────┘                │
│              │                     │                                │
│      ┌───────▼───────┐    ┌───────▼───────┐                        │
│      │   PostgreSQL   │    │    Redis      │                        │
│      │                │    │               │                        │
│      │ - apps         │    │ - Query cache │                        │
│      │ - ratings      │    │ - Rate limits │                        │
│      │ - categories   │    │ - Task queue  │                        │
│      │ - countries    │    │               │                        │
│      │ - crawl_logs   │    └───────────────┘                        │
│      └───────────────┘            │                                 │
│                                   │                                 │
│  ┌────────────────────────────────┼──────────────────┐              │
│  │           Celery Workers       │                  │              │
│  │  ┌──────────────┐  ┌──────────▼─────┐            │              │
│  │  │ Crawl        │  │ Score          │            │              │
│  │  │ Scheduler    │  │ Calculator     │            │              │
│  │  │              │  │                │            │              │
│  │  │ - Category   │  │ - Bayesian avg │            │              │
│  │  │ - Country    │  │ - Weighted rank│            │              │
│  │  │ - Batch      │  │ - Recompute    │            │              │
│  │  └──────┬───────┘  └────────────────┘            │              │
│  │         │                                        │              │
│  │         ▼                                        │              │
│  │  ┌──────────────┐                                │              │
│  │  │ iTunes       │                                │              │
│  │  │ Search API   │                                │              │
│  │  │              │                                │              │
│  │  │ (+ future:   │                                │              │
│  │  │  42matters,  │                                │              │
│  │  │  SensorTower)│                                │              │
│  │  └──────────────┘                                │              │
│  └──────────────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. CRAWL FLOW:
   Celery Beat (schedule)
     → Celery Worker picks up crawl task
       → iTunes Search API request (with rate limiting)
         → Parse JSON response
           → Store raw JSON in crawl_logs
             → Upsert app record in apps table
               → Insert rating snapshot in ratings_history
                 → Recompute weighted_score

2. QUERY FLOW:
   Client request → Nginx → FastAPI
     → Check Redis cache
       → HIT: return cached response
       → MISS: Query PostgreSQL
         → Apply filters (country, category, min_reviews)
         → Apply sort (weighted_score ASC)
         → Cache result in Redis (TTL: 5 min)
         → Return paginated response

3. SCORE COMPUTATION:
   WeightedRating = (v / (v + m)) * R + (m / (v + m)) * C

   Where:
     R = average user rating for this app
     v = number of ratings for this app
     m = minimum ratings to be listed (configurable, default: 100)
     C = mean rating across ALL qualifying apps

   Lower weighted score = worse app = higher rank in our index
```

## Database Schema (ERD)

```
┌──────────────────────┐       ┌──────────────────────┐
│      countries        │       │     categories       │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │
│ code (US, NL, etc)   │       │ itunes_id            │
│ name                 │       │ name                 │
│ active               │       │ parent_id (FK→self)  │
└──────────┬───────────┘       └──────────┬───────────┘
           │                              │
           │    ┌─────────────────────┐   │
           └────┤       apps          ├───┘
                ├─────────────────────┤
                │ id (PK)             │
                │ itunes_id (unique)  │
                │ bundle_id           │
                │ name                │
                │ developer           │
                │ category_id (FK)    │
                │ country_id (FK)     │
                │ average_rating      │
                │ rating_count        │
                │ weighted_score      │
                │ current_version     │
                │ price               │
                │ currency            │
                │ icon_url            │
                │ store_url           │
                │ description         │
                │ content_rating      │
                │ release_date        │
                │ updated_date        │
                │ raw_json (JSONB)    │
                │ created_at          │
                │ updated_at          │
                └────────┬────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
┌──────────▼───────────┐  ┌────────────▼──────────┐
│   ratings_history     │  │     crawl_logs        │
├──────────────────────┤  ├───────────────────────┤
│ id (PK)              │  │ id (PK)               │
│ app_id (FK)          │  │ source                │
│ average_rating       │  │ country_code          │
│ rating_count         │  │ category_id           │
│ weighted_score       │  │ search_term           │
│ snapshot_date        │  │ status                │
│ created_at           │  │ apps_found            │
└──────────────────────┘  │ apps_updated          │
                          │ error_message         │
                          │ duration_seconds      │
                          │ raw_response (JSONB)  │
                          │ created_at            │
                          └───────────────────────┘
```

## Technology Stack

| Layer       | Technology              | Why                              |
|-------------|-------------------------|----------------------------------|
| Frontend    | Next.js 14 (App Router) | SSR, React, great DX             |
| Backend     | Python 3.12 + FastAPI   | Async, fast, type-safe           |
| Database    | PostgreSQL 16           | JSONB, full-text search, mature  |
| Cache       | Redis 7                 | Fast, pub/sub for tasks          |
| Task Queue  | Celery + Redis broker   | Battle-tested, Python native     |
| ORM         | SQLAlchemy 2.0          | Async support, mature            |
| Migrations  | Alembic                 | SQLAlchemy-native                |
| HTTP Client | httpx                   | Async, connection pooling        |
| Container   | Docker + Compose        | Reproducible environments        |
| Proxy       | Nginx                   | SSL termination, rate limiting   |

## Folder Structure

```
IOSStore/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── apps.py         # App endpoints
│   │   │       ├── categories.py   # Category endpoints
│   │   │       └── health.py       # Health check
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py           # Settings (env vars)
│   │   │   ├── database.py         # DB session management
│   │   │   ├── redis.py            # Redis client
│   │   │   └── security.py         # Rate limiting, API keys
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── models.py           # SQLAlchemy models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py          # Pydantic schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── itunes.py           # iTunes API client
│   │   │   ├── crawler.py          # Crawl orchestration
│   │   │   └── scoring.py          # Weighted score calc
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py       # Celery configuration
│   │   │   └── crawl_tasks.py      # Background crawl tasks
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── constants.py        # App Store categories etc.
│   ├── alembic/
│   │   ├── env.py
│   │   ├── versions/
│   │   └── script.mako
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
│       └── ...
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── apps/[id]/page.tsx
│   │   │   └── api/               # Optional BFF routes
│   │   ├── components/
│   │   │   ├── AppTable.tsx
│   │   │   ├── Filters.tsx
│   │   │   ├── RatingChart.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── hooks/
│   │   │   └── useApps.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
├── docker/
│   └── nginx.conf
├── scripts/
│   ├── seed_db.py
│   ├── simulate_crawl.py
│   └── compute_scores.sql
├── docs/
│   └── ARCHITECTURE.md
├── docker-compose.yml
├── .env.example
└── README.md
```
