# Worst Rated iOS Apps Index

A multi-tenant SaaS platform that crawls Apple's iTunes Search API, stores iOS app metadata in PostgreSQL, computes Bayesian weighted ratings, and lets registered users track the worst-rated apps through keyword-driven crawling with optional proxy rotation.

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Next.js  │───▶│  Nginx   │───▶│ FastAPI  │───▶│PostgreSQL│
│ Frontend │    │  Proxy   │    │ Backend  │    │ Database │
└──────────┘    └──────────┘    └────┬─────┘    └──────────┘
                                     │
                                ┌────▼─────┐    ┌──────────┐
                                │  Celery  │───▶│  Redis   │
                                │  Workers │    │  Cache   │
                                └────┬─────┘    └──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  iTunes Search API  │
                          │  (via proxy pool)   │
                          └─────────────────────┘
```

---

## Quick Start

### 1. Clone & Configure

```bash
cp .env.example .env
```

Open `.env` and set these **required** values:

| Variable | What to set | Why |
|----------|------------|-----|
| `POSTGRES_PASSWORD` | A strong password | Database security |
| `APP_SECRET_KEY` | Random 32+ char string | Session security |
| `JWT_SECRET_KEY` | Random 32+ char string | Token signing |

Generate secure secrets:

```bash
# Generate two random secrets
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts 7 services:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache + message broker |
| FastAPI backend | **8282** | REST API |
| Celery worker | — | Background task execution |
| Celery beat | — | Task scheduling (every 60s) |
| Next.js frontend | 3000 | Web UI |
| Nginx | 80 | Reverse proxy |

### 3. Open the App

| URL | What |
|-----|------|
| http://localhost:3000 | Frontend (public leaderboard) |
| http://localhost:8282/docs | Swagger API docs |
| http://localhost:8282/redoc | ReDoc API docs |

### 4. Create Your Account

Visit http://localhost:3000/register and create an account. You'll be logged in automatically and redirected to the dashboard.

### 5. Add Your First Keyword

1. Go to **Dashboard > Keywords**
2. Click **Add Keyword**
3. Enter a search term (e.g. "calculator"), pick a country, and set the crawl frequency
4. Click **Crawl Now** to trigger an immediate crawl

The system will search Apple's iTunes API for that term and store the results. You can view found apps under **Dashboard > Results**.

---

## User Plans & Quotas

Every new account starts on the **free** plan:

| Feature | Free | Starter | Pro |
|---------|------|---------|-----|
| Keywords | 5 | 25 | 100 |
| Crawls/day | 2 | 10 | 50 |
| Results stored | 500 | 5,000 | 50,000 |
| Price | $0 | $9.99/mo | $49.99/mo |

Plan limits are enforced automatically. Upgrade plans via the admin panel (see below).

---

## Authentication

The app uses JWT tokens with a BFF (Backend for Frontend) pattern:

- Tokens are stored as **httpOnly cookies** (never exposed to JavaScript)
- Access tokens expire after 15 minutes, refresh tokens after 30 days
- Next.js API routes proxy all auth requests to FastAPI
- Protected routes (`/dashboard/*`) redirect to `/login` when unauthenticated

### API Authentication

For direct API access (e.g. scripts, Postman), use Bearer tokens:

```bash
# Register
curl -X POST http://localhost:8282/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword", "full_name": "Your Name"}'

# Login (returns access_token + refresh_token)
curl -X POST http://localhost:8282/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'

# Use the access_token for authenticated endpoints
curl http://localhost:8282/api/v1/keywords \
  -H "Authorization: Bearer <access_token>"

# Refresh when access token expires
curl -X POST http://localhost:8282/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

---

## API Reference

### Public Endpoints (no auth required)

```bash
# Worst rated apps (global leaderboard)
curl "http://localhost:8282/api/v1/apps?sort=lowest_weighted&min_reviews=100"

# Filter by country and category
curl "http://localhost:8282/api/v1/apps?country=US&category=Games&page_size=10"

# App detail
curl "http://localhost:8282/api/v1/apps/1"

# Rating history (for charts)
curl "http://localhost:8282/api/v1/apps/1/history"

# Index statistics
curl "http://localhost:8282/api/v1/apps/stats"

# Categories and countries
curl "http://localhost:8282/api/v1/categories"
curl "http://localhost:8282/api/v1/categories/countries"

# Available plans
curl "http://localhost:8282/api/v1/billing/plans"

# Health check
curl "http://localhost:8282/api/v1/health"
```

### Authenticated Endpoints (Bearer token required)

```bash
TOKEN="<your_access_token>"
AUTH="-H 'Authorization: Bearer $TOKEN'"

# ── Keywords ──
curl -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/keywords
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"term": "calculator", "country_code": "US"}' \
  http://localhost:8282/api/v1/keywords
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/keywords/<id>/crawl

# ── Results ──
curl -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/results
curl -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/results/stats

# ── Crawl Jobs ──
curl -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/crawls

# ── Usage / Billing ──
curl -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/billing/usage

# ── Profile ──
curl -H "Authorization: Bearer $TOKEN" http://localhost:8282/api/v1/auth/me
```

### Admin Endpoints (admin role required)

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8282/api/v1/admin/users
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8282/api/v1/admin/stats
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"plan_name": "pro"}' \
  http://localhost:8282/api/v1/admin/users/<user_id>
```

To make a user admin, update the database directly:

```bash
docker compose exec db psql -U iosstore -c "UPDATE users SET role='admin' WHERE email='you@example.com';"
```

---

## Proxy Configuration

Proxies are **optional**. Without them, the app crawls Apple's iTunes API directly from your server IP. This works fine for light usage but Apple may rate-limit heavy crawling.

### Setting up IPRoyal (Recommended)

1. Sign up at https://iproyal.com/residential-proxies/
2. Purchase residential proxy bandwidth (starts at $1.75/GB, no minimum spend)
3. Find your credentials in the IPRoyal dashboard
4. Add to your `.env`:

```env
PROXY_ENABLED=true
PROXY_PRIMARY_PROVIDER=iproyal
IPROYAL_USER=your_username
IPROYAL_PASS=your_password
```

5. Restart the backend: `docker compose restart backend celery-worker`

### Setting up Bright Data (For Scale)

1. Sign up at https://brightdata.com/
2. Create a residential proxy zone
3. Note your customer ID, zone name, and password
4. Add to your `.env`:

```env
PROXY_ENABLED=true
PROXY_PRIMARY_PROVIDER=brightdata
BRIGHTDATA_CUSTOMER_ID=brd-customer-xxxxx
BRIGHTDATA_ZONE=your_zone_name
BRIGHTDATA_PASS=your_zone_password
```

### How Proxy Rotation Works

- Each crawl request gets a rotating proxy IP (new IP per request)
- Sticky sessions are available for requests that need the same IP
- If a proxy fails, the system automatically falls back to the next provider
- A **circuit breaker** trips after 10 consecutive failures and pauses for 5 minutes
- Proxy health is checked every 5 minutes via Celery Beat

### Provider Comparison

| Provider | Price/GB | Min Spend | Sticky Sessions | Best For |
|----------|----------|-----------|-----------------|----------|
| **IPRoyal** | $1.75 | $0 | 7 days | MVP / small scale |
| **Bright Data** | $2.20 | $500/mo | 10 min | Enterprise scale |

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL and Redis locally, then:
export DATABASE_URL="postgresql+asyncpg://iosstore:iosstore@localhost:5432/iosstore"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET_KEY="dev-secret-change-in-production"

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8282

# In another terminal — start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info

# In another terminal — start Celery beat
celery -A app.tasks.celery_app beat --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:3000 and proxies API calls to http://localhost:8282.

---

## Running Tests

### Backend (209 tests)

```bash
cd backend
source venv/bin/activate
python -m pytest -v
```

Tests use SQLite in-memory (no PostgreSQL needed). Coverage includes:
- Auth: register, login, refresh, logout, password change (11 tests)
- Keywords: CRUD, quotas, tenant isolation (10 tests)
- Crawl jobs: lifecycle, filtering, quota enforcement (7 tests)
- Results: listing, deduplication, stats (5 tests)
- Admin: user management, stats (4 tests)
- Billing: plans, usage tracking (3 tests)
- Proxy: config, URL formats, rate limiter, circuit breaker (9 tests)
- Original MVP tests: API, models, schemas, scoring, crawler, iTunes client (152 tests + 8 test files)

### Frontend (110 tests)

```bash
cd frontend
npx jest --verbose
```

Coverage includes:
- Auth: login/register forms, AuthProvider lifecycle (12 tests)
- Dashboard: stats grid, quota meter, recent crawls (7 tests)
- Keywords: CRUD table, form validation (12 tests)
- Crawl history: status badges, filtering (5 tests)
- Results: merged apps, search, pagination (4 tests)
- Settings: profile, plan info, password change (6 tests)
- Original MVP tests: AppTable, Filters, RatingChart, ThemeToggle, API client, types (64 tests)

---

## Crawl Architecture

### Automated Scheduling

Celery Beat runs a **dispatcher** every 60 seconds that:

1. Finds keywords where `next_run_at <= now()`
2. Checks the user's daily crawl quota
3. Acquires a Redis dedup lock (`crawl_lock:{keyword_id}`)
4. Creates a `CrawlJob` record
5. Enqueues the crawl task to the Celery worker

### Crawl Frequencies

| Setting | Schedule |
|---------|----------|
| Daily | Every 24 hours |
| Weekly | Every 7 days |
| Manual | Only when you click "Crawl Now" |

### Live Crawl Simulation (no DB needed)

```bash
cd backend
source venv/bin/activate
python scripts/simulate_crawl.py --country US --limit 50
```

This hits Apple's live iTunes API and saves results to a JSON file.

---

## Weighted Rating Formula

```
WeightedRating = (v / (v + m)) * R + (m / (v + m)) * C
```

| Symbol | Meaning | Example |
|--------|---------|---------|
| R | App's average rating | 1.5 |
| v | Number of ratings | 500 |
| m | Minimum threshold (configurable) | 100 |
| C | Global mean rating | 3.2 |

Lower score = worse app = higher rank. Configure `m` via `WEIGHTED_SCORE_MIN_RATINGS` in `.env`.

---

## Environment Variables Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `POSTGRES_PASSWORD` | `iosstore` | **Yes** | Database password |
| `APP_SECRET_KEY` | `change-this` | **Yes** | Application secret |
| `JWT_SECRET_KEY` | `change-this-jwt-secret` | **Yes** | JWT signing key |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | No | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `30` | No | Refresh token lifetime |
| `PROXY_ENABLED` | `false` | No | Enable proxy rotation |
| `PROXY_PRIMARY_PROVIDER` | `iproyal` | No | `iproyal` or `brightdata` |
| `IPROYAL_USER` | — | If proxy=iproyal | IPRoyal username |
| `IPROYAL_PASS` | — | If proxy=iproyal | IPRoyal password |
| `BRIGHTDATA_CUSTOMER_ID` | — | If proxy=brightdata | Bright Data customer ID |
| `BRIGHTDATA_ZONE` | — | If proxy=brightdata | Bright Data zone name |
| `BRIGHTDATA_PASS` | — | If proxy=brightdata | Bright Data zone password |
| `WEIGHTED_SCORE_MIN_RATINGS` | `100` | No | Bayesian rating threshold |
| `CRAWL_RATE_LIMIT_PER_MINUTE` | `20` | No | iTunes API rate limit |
| `RATE_LIMIT_PER_MINUTE` | `60` | No | API rate limit per client |
| `CORS_ORIGINS` | `["localhost:3000","localhost:8282"]` | No | Allowed CORS origins |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 14.x |
| Styling | Tailwind CSS | 3.4 |
| Charts | Recharts | 2.x |
| State | React Query | 5.x |
| Backend | FastAPI | 0.115 |
| ORM | SQLAlchemy | 2.0 |
| Auth | PyJWT + passlib (bcrypt) | — |
| Migrations | Alembic | 1.14 |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Task Queue | Celery | 5.4 |
| HTTP Client | httpx (with SOCKS proxy) | 0.28 |
| Containers | Docker + Compose | — |
| Proxy | Nginx | Alpine |

---

## License

This project is for educational and research purposes. App Store data is sourced
from Apple's public iTunes Search API. Not affiliated with Apple Inc.
