---
title: 'UI Modernization & Review Data Storage'
slug: 'ui-modernization-review-data'
created: '2026-02-16'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 15
  - React 19
  - Tailwind CSS 4
  - shadcn/ui (Radix primitives)
  - '@tanstack/react-query 5'
  - next-themes
  - lucide-react
  - Python 3.14
  - FastAPI 0.115
  - SQLAlchemy 2.0 (async, Mapped[] style)
  - Alembic (3 existing migrations)
  - PostgreSQL 16 (asyncpg)
  - Celery 5.4 + Redis
  - Pydantic v2 (ConfigDict, from_attributes)
files_to_modify:
  # Backend - modify
  - backend/app/models/models.py
  - backend/app/schemas/schemas.py
  - backend/app/api/v1/apps.py
  - backend/app/services/crawler.py
  - backend/app/tasks/crawl_tasks.py
  - backend/app/tasks/celery_app.py
  - backend/tests/conftest.py
  - backend/app/api/v1/__init__.py
  # Backend - create
  - backend/app/models/review.py
  - backend/app/services/reviews.py
  - backend/app/api/v1/reviews.py
  - backend/alembic/versions/004_add_reviews_table.py
  - backend/tests/test_reviews.py
  - backend/tests/test_review_crawler.py
  # Frontend - modify
  - frontend/package.json
  - frontend/tailwind.config.ts
  - frontend/next.config.js
  - frontend/src/app/globals.css
  - frontend/src/app/layout.tsx
  - frontend/src/app/page.tsx
  - frontend/src/app/apps/[id]/page.tsx
  - frontend/src/components/AppTable.tsx
  - frontend/src/components/Filters.tsx
  - frontend/src/components/RatingChart.tsx
  - frontend/src/components/ThemeToggle.tsx
  - frontend/src/components/Providers.tsx
  - frontend/src/hooks/useApps.ts
  - frontend/src/lib/api.ts
  - frontend/src/types/index.ts
  - frontend/src/__tests__/fixtures.ts
  # Frontend - create
  - frontend/src/components/ReviewList.tsx
  - frontend/src/components/RatingDistribution.tsx
  - frontend/src/components/ui/ (shadcn auto-generated)
  - frontend/src/__tests__/ReviewList.test.tsx
  - frontend/src/__tests__/RatingDistribution.test.tsx
code_patterns:
  - 'SQLAlchemy 2.0 Mapped[] with mapped_column() for all models'
  - 'Pydantic v2 schemas with model_config = ConfigDict(from_attributes=True)'
  - 'FastAPI APIRouter + Depends(get_db) dependency injection'
  - 'PostgreSQL upsert via pg_insert().on_conflict_do_update()'
  - 'Celery _run_async() bridge for async coroutines in sync workers'
  - 'Lazy engine init via get_engine()/get_session_factory() singletons'
  - 'Redis cache with 5-min TTL on list endpoints, key format: resource:{params}'
  - 'Frontend: functional components, "use client" directive, hooks pattern'
  - 'Frontend API: generic fetchApi<T>(path, params) with URL builder'
test_patterns:
  - 'pytest-asyncio (auto mode) with SQLite in-memory engine'
  - 'JSONB→JSON remap in conftest before create_all for SQLite compat'
  - 'Fixtures: engine, db_session, seeded_db, client, seeded_client'
  - 'FastAPI dependency_overrides for DB and Redis mocking'
  - 'respx for mocking external HTTP calls (iTunes API)'
  - 'Jest + React Testing Library for frontend (14 test files)'
  - 'Frontend fixtures.ts for shared test data'
---

# Tech-Spec: UI Modernization & Review Data Storage

**Created:** 2026-02-16

## Overview

### Problem Statement

The frontend runs on outdated dependencies (Next.js 14, React 18, Tailwind CSS 3.4), lacks a component library, does not leverage React Server Components or React Query, and has multiple UX issues (no Next/Image, inline SVGs, no skeleton loaders, no search debounce, manual DOM-based theme toggle). Additionally, individual App Store user reviews are not captured or stored, preventing any future review-level analysis.

### Solution

Upgrade the frontend stack to Next.js 15 + React 19 + Tailwind CSS 4 with shadcn/ui as the component library. Refactor pages to use React Server Components where possible and React Query for client-side data fetching. Fix all UI quality issues including proper image optimization, icon library, loading states, and theme management. On the backend, add a `Review` model with an Alembic migration, build an Apple RSS customer reviews crawler, expose a reviews API endpoint, and display reviews on the app detail page.

### Scope

**In Scope:**
- Framework upgrades: Next.js 15, React 19, Tailwind CSS 4
- shadcn/ui component library integration (Radix primitives)
- React Server Components + React Query refactor
- UI quality fixes: Next/Image, lucide-react icons, skeleton loaders, search debounce, next-themes
- New `Review` database model + Alembic migration
- Apple RSS customer reviews feed crawler service
- GET /api/v1/apps/{id}/reviews endpoint
- Reviews section on app detail page

**Out of Scope:**
- Monitoring stack (Prometheus/Grafana)
- Production deployment
- Authentication on crawl endpoint
- 42matters API integration
- Sentiment analysis on reviews
- Materialized views for rankings

## Context for Development

### Codebase Patterns

**Backend:**
- SQLAlchemy 2.0 with `Mapped[]` type annotations and `mapped_column()` — all models follow this pattern strictly
- Pydantic v2 schemas with `model_config = ConfigDict(from_attributes=True)` for ORM serialization
- FastAPI `APIRouter` with `Depends(get_db)` for session injection; routes registered in `app/api/v1/__init__.py`
- PostgreSQL upsert via `sqlalchemy.dialects.postgresql.insert` + `.on_conflict_do_update()` for idempotent operations
- Celery tasks use `_run_async()` helper that creates a new event loop to bridge async service code into sync Celery workers
- Celery worker creates its own async session factory via `_get_async_session()` (separate from main app engine)
- Lazy database engine init via `get_engine()` / `get_session_factory()` singletons in `database.py` — prevents import-time DB connections
- Redis caching on list endpoints with 5-minute TTL; key format: `apps:{sort}:{country}:{category}:{min_reviews}:{max_rating}:{search}:{page}:{page_size}`
- Rate limiting via slowapi on API endpoints (configurable, default 60/min)
- 3 existing Alembic migrations: `001_initial_schema`, `002_add_auth_tables`, `003_add_saas_tables`

**Frontend:**
- All components use `"use client"` directive — no React Server Components currently
- `@tanstack/react-query` `QueryClientProvider` is wired in `Providers.tsx` (with 5-min staleTime), but homepage uses custom `useApps` hook with manual `useState`/`useCallback` instead of `useQuery`
- Generic API client `fetchApi<T>(path, params)` in `lib/api.ts` using native `fetch` with `next: { revalidate: 300 }`
- `AuthContext` + `HeaderAuth` + auth pages already exist (login, register, dashboard flows)
- Theme toggle manually manipulates `document.documentElement.classList` and `localStorage`
- `next.config.js` has `output: "standalone"` and `remotePatterns` for `is*.mzstatic.com` (App Store icons)
- Tailwind 3.4 with `darkMode: "class"`, custom `brand` color scale in config

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/app/models/models.py` | 5 SQLAlchemy models (Country, Category, App, RatingHistory, CrawlLog) — Review model added here |
| `backend/app/schemas/schemas.py` | Pydantic v2 response schemas — needs ReviewOut, ReviewSummary, PaginatedReviews |
| `backend/app/api/v1/apps.py` | App endpoints with Redis caching, pagination, filters — pattern to follow for reviews endpoint |
| `backend/app/services/crawler.py` | Crawl orchestration with upsert pattern — review crawler follows same async service pattern |
| `backend/app/services/itunes.py` | iTunes API client singleton with rate limiting — review RSS client follows same httpx pattern |
| `backend/app/tasks/crawl_tasks.py` | Celery task wrappers with `_run_async()` bridge — review crawl task follows same pattern |
| `backend/app/tasks/celery_app.py` | Celery config + beat schedule — review crawl added to schedule |
| `backend/app/core/database.py` | Lazy engine init, `Base` class, `get_db` dependency |
| `backend/app/core/config.py` | Pydantic Settings — no new config needed (RSS feed URL is deterministic) |
| `backend/tests/conftest.py` | Test fixtures with SQLite engine, JSONB→JSON remap, seeded data — needs Review seed data |
| `frontend/package.json` | Current deps: next 14.2, react 18.3, tailwindcss 3.4, @tanstack/react-query 5, recharts 2.13 |
| `frontend/tailwind.config.ts` | TW3 config with darkMode: "class" and custom brand colors — removed in TW4 migration |
| `frontend/next.config.js` | Standalone output, mzstatic.com remote patterns — needs Next 15 updates |
| `frontend/src/app/layout.tsx` | Root layout with header/footer, Providers wrapper — needs ThemeProvider from next-themes |
| `frontend/src/app/page.tsx` | Homepage with useApps hook — refactor to RSC + React Query |
| `frontend/src/app/apps/[id]/page.tsx` | App detail page — needs reviews section added |
| `frontend/src/components/AppTable.tsx` | Ranked table with inline SVG stars — replace with shadcn Table + lucide icons |
| `frontend/src/components/Filters.tsx` | Filter controls — replace with shadcn Select, Input, Slider |
| `frontend/src/components/ThemeToggle.tsx` | Manual DOM toggle — replace with next-themes |
| `frontend/src/components/Providers.tsx` | QueryClientProvider + AuthProvider — add ThemeProvider |
| `frontend/src/hooks/useApps.ts` | Manual state management — refactor to useQuery |
| `frontend/src/lib/api.ts` | Typed API client — add getAppReviews() |
| `frontend/src/types/index.ts` | TypeScript interfaces — add Review, ReviewSummary types |

### Technical Decisions

- **shadcn/ui** chosen over MUI/Chakra for zero-runtime overhead, Radix primitives, and Tailwind-native styling
- **lucide-react** for icons (default with shadcn/ui, replaces all inline SVGs)
- **next-themes** for theme management (replaces manual DOM manipulation, SSR-safe, flash-free)
- **Apple RSS feed** for reviews: URL format `https://itunes.apple.com/{country}/rss/customerreviews/id={itunes_id}/sortBy=mostRecent/json` — public, no auth, returns ~50 reviews per app, per country
- **Review model** uses `author_url` as unique key for upsert (Apple provides unique author URI, more reliable than author_name + date)
- **`rating_distribution` JSONB** column on App model: `{"1": N, "2": N, ...}` — updated during review crawls, avoids runtime aggregation
- **Sequential upgrade path**: TW4 → Next 15 + React 19 → shadcn/ui init → component refactor → RSC + React Query — each step independently testable
- **Review crawl** integrated into existing Celery beat schedule, reusing same rate limiting and `_run_async()` bridge pattern
- **Reviews API** endpoint returns paginated reviews + summary object (rating distribution + total count) in single response

## Implementation Plan

### Phase 1: Backend — Review Data Storage

- [ ] **Task 1: Create Review model and add rating_distribution to App**
  - File: `backend/app/models/models.py`
  - Action: Add `Review` class following existing `Mapped[]` pattern:
    - `id: Mapped[int]` (PK)
    - `app_id: Mapped[int]` (FK → apps.id, nullable=False)
    - `author_name: Mapped[str]` (String(500))
    - `author_url: Mapped[str]` (String(1000), unique constraint component)
    - `rating: Mapped[int]` (Integer, 1-5)
    - `title: Mapped[str | None]` (String(1000))
    - `body: Mapped[str | None]` (Text)
    - `review_date: Mapped[datetime | None]` (DateTime with timezone)
    - `language: Mapped[str | None]` (String(10))
    - `raw_json: Mapped[dict | None]` (JSONB)
    - `created_at: Mapped[datetime]` (server_default=func.now())
    - UniqueConstraint on `(app_id, author_url)` named `uq_review_app_author`
    - Index on `(app_id, review_date)` named `ix_reviews_app_date`
    - Index on `(app_id, rating)` named `ix_reviews_app_rating`
    - Relationship: `app: Mapped["App"]` back_populates="reviews"
  - Action: Add `rating_distribution: Mapped[dict | None]` (JSONB, nullable=True) to `App` model
  - Action: Add `reviews: Mapped[list["Review"]]` relationship on `App` model
  - Notes: Follow exact same pattern as RatingHistory model for consistency

- [ ] **Task 2: Create Alembic migration for reviews table**
  - File: `backend/alembic/versions/004_add_reviews_table.py`
  - Action: Generate migration with `alembic revision --autogenerate -m "add_reviews_table"`
  - Action: Verify migration creates `reviews` table with all columns, constraints, and indexes
  - Action: Verify migration adds `rating_distribution` JSONB column to `apps` table
  - Notes: Test both upgrade and downgrade paths

- [ ] **Task 3: Create review Pydantic schemas**
  - File: `backend/app/schemas/schemas.py`
  - Action: Add schemas following existing `ConfigDict(from_attributes=True)` pattern:
    - `ReviewOut`: id, app_id, author_name, rating, title, body, review_date, language
    - `ReviewSummary`: total_reviews (int), rating_distribution (dict[str, int]), average_review_rating (float | None)
    - `PaginatedReviews`: items (list[ReviewOut]), summary (ReviewSummary), total, page, page_size, total_pages

- [ ] **Task 4: Build Apple RSS review crawler service**
  - File: `backend/app/services/reviews.py` (new)
  - Action: Create `ReviewCrawler` class with:
    - `async def fetch_reviews(itunes_id: int, country: str) -> list[dict]` — fetches RSS JSON from `https://itunes.apple.com/{country}/rss/customerreviews/id={itunes_id}/sortBy=mostRecent/json`, parses `feed.entry[]`, returns list of dicts with: author_name, author_url, rating, title, body, review_date, language, raw_json
    - `async def upsert_reviews(db: AsyncSession, app_id: int, reviews: list[dict]) -> int` — uses `pg_insert().on_conflict_do_update()` on `uq_review_app_author` constraint, updates body/title/rating on conflict, returns count of upserted rows
    - `async def update_rating_distribution(db: AsyncSession, app_id: int) -> None` — queries `SELECT rating, COUNT(*) FROM reviews WHERE app_id=? GROUP BY rating`, writes result as JSONB to `apps.rating_distribution`
    - `async def crawl_reviews_for_app(db: AsyncSession, app: App) -> dict` — orchestrates: fetch → upsert → update distribution, returns summary dict
  - Notes: Use same `httpx.AsyncClient` pattern as `ITunesClient`. Use same rate semaphore from `itunes.py` (shared Apple API rate limit). Handle empty feeds gracefully (app may have no reviews). RSS JSON response has `feed.entry` as list when multiple entries, or single dict when 1 entry — handle both cases.

- [ ] **Task 5: Create reviews API endpoint**
  - File: `backend/app/api/v1/reviews.py` (new)
  - Action: Create router with `GET /apps/{app_id}/reviews` endpoint:
    - Query params: `page` (default 1), `page_size` (default 20, max 100), `sort` (enum: newest/oldest/lowest/highest, default newest), `language` (optional string filter)
    - Builds SQLAlchemy query on `Review` model with app_id filter
    - Applies language filter if provided
    - Applies sort: newest=desc(review_date), oldest=asc(review_date), lowest=asc(rating), highest=desc(rating)
    - Returns `PaginatedReviews` with embedded `ReviewSummary` (rating_distribution from App.rating_distribution, total from COUNT)
    - Redis caching with key: `reviews:{app_id}:{sort}:{language}:{page}:{page_size}`, TTL 5 min
  - File: `backend/app/api/v1/__init__.py`
  - Action: Import and register reviews router: `router.include_router(reviews.router, prefix="/apps", tags=["reviews"])`

- [ ] **Task 6: Add review crawl Celery task + beat schedule**
  - File: `backend/app/tasks/crawl_tasks.py`
  - Action: Add `crawl_reviews_task` following existing pattern:
    - `@celery_app.task(name="app.tasks.crawl_tasks.crawl_reviews_task", bind=True, max_retries=3, default_retry_delay=300)`
    - Fetches all apps from DB (or a configurable batch), iterates and calls `crawl_reviews_for_app()` for each
    - Uses `_run_async()` bridge and `_get_async_session()` factory (same as existing tasks)
    - Logs summary: total apps processed, total reviews upserted, errors
  - File: `backend/app/tasks/celery_app.py`
  - Action: Add to `beat_schedule`:
    ```python
    "crawl-reviews": {
        "task": "app.tasks.crawl_tasks.crawl_reviews_task",
        "schedule": crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    ```

- [ ] **Task 7: Update test fixtures and add backend tests**
  - File: `backend/tests/conftest.py`
  - Action: Import `Review` model in conftest (for JSONB→JSON remap to pick it up). Add review seed data in `seeded_db` fixture: 3 reviews for app 1 (ratings 1, 2, 1) and 1 review for app 2 (rating 3). Set `rating_distribution` on seeded apps.
  - File: `backend/tests/test_reviews.py` (new)
  - Action: Write tests:
    - `test_list_reviews_empty` — GET reviews for app with no reviews returns empty items + zero summary
    - `test_list_reviews_paginated` — GET reviews returns correct items, total, page count
    - `test_list_reviews_sort_newest` — reviews ordered by review_date desc
    - `test_list_reviews_sort_lowest` — reviews ordered by rating asc
    - `test_list_reviews_filter_language` — only returns reviews matching language param
    - `test_list_reviews_summary` — response includes correct rating_distribution and total_reviews
    - `test_list_reviews_404` — non-existent app_id returns 404
  - File: `backend/tests/test_review_crawler.py` (new)
  - Action: Write tests using `respx` to mock RSS HTTP calls:
    - `test_fetch_reviews_success` — mock RSS JSON response, verify parsed fields
    - `test_fetch_reviews_empty_feed` — mock empty/missing feed, returns empty list
    - `test_fetch_reviews_single_entry` — mock feed with single entry (dict not list), verify correct handling
    - `test_upsert_reviews_new` — insert new reviews, verify count
    - `test_upsert_reviews_conflict` — insert duplicate author_url, verify update (not duplicate)
    - `test_update_rating_distribution` — verify JSONB written correctly to App

### Phase 2: Frontend — Framework Upgrades (Sequential)

- [ ] **Task 8: Migrate Tailwind CSS 3.4 → 4**
  - File: `frontend/package.json`
  - Action: Upgrade `tailwindcss` to `^4.0.0`. Remove `autoprefixer` and `postcss` if no longer needed (TW4 handles this internally). Add `@tailwindcss/postcss` if needed for PostCSS integration.
  - File: `frontend/src/app/globals.css`
  - Action: Replace `@tailwind base/components/utilities` directives with TW4 `@import "tailwindcss"`. Move custom theme from `tailwind.config.ts` into `@theme` block:
    ```css
    @import "tailwindcss";
    @theme {
      --color-brand-50: #fef2f2;
      --color-brand-100: #fee2e2;
      --color-brand-500: #ef4444;
      --color-brand-600: #dc2626;
      --color-brand-700: #b91c1c;
      --color-brand-900: #7f1d1d;
    }
    ```
  - File: `frontend/tailwind.config.ts`
  - Action: Delete this file (configuration now lives in CSS)
  - File: `frontend/postcss.config.js` (if exists)
  - Action: Update to use `@tailwindcss/postcss` plugin
  - Notes: `darkMode: "class"` is the default in TW4 when using `dark:` variants — no explicit config needed. Verify all existing `dark:` utilities still work. Run existing tests after this change.

- [ ] **Task 9: Upgrade Next.js 14 → 15 + React 18 → 19**
  - File: `frontend/package.json`
  - Action: Upgrade `next` to `^15.0.0`, `react` + `react-dom` to `^19.0.0`. Upgrade `@types/react` and `@types/react-dom` to React 19 compatible versions.
  - File: `frontend/next.config.js`
  - Action: Rename to `next.config.ts` (Next 15 supports TS config natively). Verify `remotePatterns` format still valid. Add `typescript: { tsconfigPath: './tsconfig.json' }` if needed.
  - Action: Review all components for Next 15 breaking changes:
    - `<img>` tags → `next/image` `<Image>` (addressed in Task 12)
    - `next/link` no longer needs nested `<a>` tag — currently not used as nested, so no changes needed
    - Async request APIs (`cookies()`, `headers()`, `params`, `searchParams` are now async) — check `apps/[id]/page.tsx` which uses `useParams()` (client component, so not affected)
  - Notes: Run full test suite after upgrade. Jest config may need updates for React 19 compatibility.

- [ ] **Task 10: Initialize shadcn/ui**
  - Action: Run `npx shadcn@latest init` from `frontend/` directory
  - Action: Select Tailwind CSS 4 + Next.js setup, configure component output to `src/components/ui/`
  - Action: Install base components needed: `npx shadcn@latest add table card button input select badge skeleton separator collapsible slider`
  - Action: Verify `cn()` utility is created in `src/lib/utils.ts` (uses `clsx` + `tailwind-merge`)
  - File: `frontend/package.json`
  - Action: Verify `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, and required `@radix-ui/*` packages are added
  - Notes: shadcn/ui generates component source files directly — they are owned code, not node_modules. This step adds ~10-15 files to `src/components/ui/`.

- [ ] **Task 11: Replace ThemeToggle with next-themes**
  - File: `frontend/package.json`
  - Action: Add `next-themes` dependency
  - File: `frontend/src/components/Providers.tsx`
  - Action: Wrap children with `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>` from `next-themes` (inside or outside QueryClientProvider, order doesn't matter)
  - File: `frontend/src/app/layout.tsx`
  - Action: Remove hardcoded `className="dark"` from `<html>` tag. Add `suppressHydrationWarning` to `<html>` tag (required by next-themes to prevent hydration mismatch).
  - File: `frontend/src/components/ThemeToggle.tsx`
  - Action: Rewrite to use `useTheme()` hook from `next-themes`:
    - Remove manual `document.documentElement.classList` manipulation
    - Remove `localStorage` calls
    - Use `setTheme("dark" | "light")` from hook
    - Keep same lucide-react Sun/Moon icons (replace inline SVGs)
  - Notes: Must test that dark mode persists across page loads and doesn't flash.

### Phase 3: Frontend — Component Refactor

- [ ] **Task 12: Refactor AppTable with shadcn + Next/Image + lucide**
  - File: `frontend/src/components/AppTable.tsx`
  - Action: Replace `<table>` with shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>`
  - Action: Replace `<img>` with `next/image` `<Image>` component for app icons (width=40, height=40, already have `remotePatterns` config for mzstatic.com)
  - Action: Replace inline SVG star icons with `Star` from `lucide-react` (filled/unfilled variants)
  - Action: Replace `RankBadge` with shadcn `<Badge>` with variant styling
  - Action: Replace pagination buttons with shadcn `<Button>` components
  - Notes: Preserve all existing functionality: rank coloring, developer name, category, weighted score coloring, price formatting, responsive column hiding.

- [ ] **Task 13: Refactor Filters with shadcn + search debounce**
  - File: `frontend/src/components/Filters.tsx`
  - Action: Replace `<select>` elements with shadcn `<Select>` (with `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>`)
  - Action: Replace `<input type="text">` with shadcn `<Input>`
  - Action: Replace `<input type="range">` with shadcn `<Slider>`
  - Action: Add debounce on search input (300ms) — use a simple `useEffect` + `setTimeout` pattern or a `useDeferredValue` from React 19
  - Action: Wrap filter section in shadcn `<Card>` component
  - Notes: Consider progressive disclosure — primary filters visible, secondary (country, category, min_reviews) in an expandable section. But this is optional if it overcomplicates the task.

- [ ] **Task 14: Refactor useApps hook to React Query**
  - File: `frontend/src/hooks/useApps.ts`
  - Action: Replace manual `useState`/`useCallback` with `useQuery` from `@tanstack/react-query`:
    - `useQuery({ queryKey: ['apps', filters], queryFn: () => getApps(filters) })`
    - Filters managed with `useState` still, but data fetching delegated to React Query
    - Remove manual `loading`, `error`, `data` state — use `isLoading`, `error`, `data` from useQuery
    - `fetchFilters` → separate `useQuery` for categories and countries with longer staleTime (30min)
  - Notes: `QueryClientProvider` already exists in `Providers.tsx` with 5-min staleTime — matches existing Redis cache TTL. Automatic refetching, caching, and deduplication come for free.

- [ ] **Task 15: Add skeleton loading states**
  - File: `frontend/src/components/AppTable.tsx`
  - Action: Add `AppTableSkeleton` component using shadcn `<Skeleton>`:
    - Renders 10 skeleton rows matching table layout (rank circle, icon square, text lines, rating, numbers)
    - Used when React Query `isLoading` is true
  - File: `frontend/src/components/Filters.tsx`
  - Action: Add `FiltersSkeleton` with skeleton rectangles for each filter control
  - File: `frontend/src/app/apps/[id]/page.tsx`
  - Action: Add skeleton for app detail page (icon, title, stat cards, description block)
  - Notes: Replace existing spinner (`animate-spin border-b-2`) with skeleton loaders throughout.

- [ ] **Task 16: Refactor homepage to use React Server Components**
  - File: `frontend/src/app/page.tsx`
  - Action: Remove `"use client"` directive. Make `HomePage` an async Server Component:
    - Server-side: fetch initial app data and filter options via `fetchApi` (already supports `next: { revalidate: 300 }`)
    - Pass initial data as props to client components
    - Create a new `HomeClient.tsx` client component that receives initial data and handles interactive filtering via React Query (using `initialData` option)
  - File: `frontend/src/app/page.tsx` (Server Component)
  - Action: Structure:
    ```tsx
    // No "use client"
    export default async function HomePage() {
      const [apps, categories, countries] = await Promise.all([
        getApps({ sort: "lowest_weighted", page: 1, page_size: 50 }),
        getCategories(),
        getCountries(),
      ]);
      return <HomeClient initialApps={apps} categories={categories} countries={countries} />;
    }
    ```
  - File: `frontend/src/components/HomeClient.tsx` (new, client component)
  - Action: Contains filter state, React Query with `initialData`, renders Filters + AppTable
  - Notes: This gives instant first paint (SSR) while maintaining full interactivity for filtering. The `initialData` option in React Query prevents a double-fetch on hydration.

- [ ] **Task 17: Update RatingChart styling**
  - File: `frontend/src/components/RatingChart.tsx`
  - Action: Wrap in shadcn `<Card>` component. Keep Recharts (no replacement needed — it's the standard). Update tooltip colors to use CSS variables from theme (so it works correctly in both light and dark mode instead of hardcoded `#1f2937`).
  - Notes: Minimal changes here — Recharts is still the right choice.

### Phase 4: Frontend — Reviews UI

- [ ] **Task 18: Add review types and API client**
  - File: `frontend/src/types/index.ts`
  - Action: Add interfaces:
    ```typescript
    export interface Review {
      id: number;
      app_id: number;
      author_name: string;
      rating: number;
      title: string | null;
      body: string | null;
      review_date: string | null;
      language: string | null;
    }
    export interface ReviewSummary {
      total_reviews: number;
      rating_distribution: Record<string, number>;
      average_review_rating: number | null;
    }
    export interface PaginatedReviews {
      items: Review[];
      summary: ReviewSummary;
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }
    export type ReviewSort = "newest" | "oldest" | "lowest" | "highest";
    ```
  - File: `frontend/src/lib/api.ts`
  - Action: Add `getAppReviews(appId: number, params?: { page?: number, sort?: ReviewSort, language?: string }): Promise<PaginatedReviews>` function following existing pattern.

- [ ] **Task 19: Create RatingDistribution component**
  - File: `frontend/src/components/RatingDistribution.tsx` (new)
  - Action: Create component that renders horizontal bar chart showing star distribution (5 → 1):
    - Each row: star count label (e.g. "5 ★"), horizontal bar (width proportional to count / max count), count number
    - Use shadcn `<Badge>` or simple styled divs for the bars
    - Color: gradient from green (5-star) to red (1-star), matching the "worst apps" brand
    - Props: `distribution: Record<string, number>`, `totalReviews: number`
  - Notes: Similar to App Store's own rating breakdown UI. Keep it simple — pure CSS bars, no chart library needed.

- [ ] **Task 20: Create ReviewList component**
  - File: `frontend/src/components/ReviewList.tsx` (new)
  - Action: Create component with:
    - Props: `appId: number`
    - Uses `useQuery` to fetch reviews from `getAppReviews()`
    - Renders `RatingDistribution` summary at top
    - Sort selector (shadcn `<Select>`: Newest, Oldest, Lowest Rating, Highest Rating)
    - Language filter (optional, shadcn `<Select>` populated from available languages in reviews)
    - Review cards: author name, star rating (lucide Star icons), title (bold), body text, date
    - "Load more" button for pagination (or simple prev/next pagination matching AppTable pattern)
    - Empty state: "No reviews yet" message
    - Loading state: skeleton cards
  - Notes: Reviews sorted by lowest rating first by default (matches site theme). Wrap in shadcn `<Card>`.

- [ ] **Task 21: Integrate reviews into app detail page**
  - File: `frontend/src/app/apps/[id]/page.tsx`
  - Action: Import and render `<ReviewList appId={appId} />` below the RatingChart section
  - Action: Replace `<img>` with `<Image>` for app icon
  - Action: Replace inline SVGs (back arrow) with lucide icons
  - Action: Wrap stat cards and metadata section in shadcn `<Card>` components
  - Action: Replace `max-h-64 overflow-y-auto` description with shadcn `<Collapsible>` (show first 3 lines, expand on click)
  - Notes: ReviewList handles its own data fetching via React Query — no prop drilling needed beyond `appId`.

### Phase 5: Frontend Tests

- [ ] **Task 22: Update existing frontend tests for upgraded stack**
  - File: `frontend/jest.config.ts`
  - Action: Update config for React 19 + Next 15 compatibility if needed (module name mapper, transform config)
  - File: `frontend/src/__tests__/fixtures.ts`
  - Action: Add review fixture data (mock PaginatedReviews, mock ReviewSummary)
  - File: All existing test files (`AppTable.test.tsx`, `Filters.test.tsx`, `ThemeToggle.test.tsx`, etc.)
  - Action: Run all tests, fix any breakage from React 19 / Next 15 / shadcn refactors. Common issues: changed import paths, ref handling, component API changes.
  - Notes: This is a verification task — fix what broke, don't rewrite tests.

- [ ] **Task 23: Write tests for new review components**
  - File: `frontend/src/__tests__/RatingDistribution.test.tsx` (new)
  - Action: Test cases:
    - Renders correct number of bars (5)
    - Bar widths proportional to counts
    - Displays total reviews count
    - Handles empty distribution (all zeros)
  - File: `frontend/src/__tests__/ReviewList.test.tsx` (new)
  - Action: Test cases (mock API via jest.mock on api.ts):
    - Renders reviews from mock data
    - Shows loading skeleton initially
    - Shows empty state when no reviews
    - Sort selector changes query params
    - Pagination controls work
    - Rating distribution summary renders

### Acceptance Criteria

**Backend — Review Storage:**
- [ ] AC 1: Given a new Review model exists, when running `alembic upgrade head`, then the `reviews` table is created with all columns, constraints (`uq_review_app_author`), and indexes (`ix_reviews_app_date`, `ix_reviews_app_rating`), and the `apps` table has a new `rating_distribution` JSONB column.
- [ ] AC 2: Given a valid Apple RSS JSON feed URL, when `ReviewCrawler.fetch_reviews()` is called, then it returns a list of parsed review dicts with fields: author_name, author_url, rating (int), title, body, review_date, language.
- [ ] AC 3: Given an RSS feed that returns a single entry (dict instead of list), when `fetch_reviews()` is called, then it handles the single entry correctly and returns a list with one item.
- [ ] AC 4: Given an app with no reviews (empty or missing RSS feed), when `fetch_reviews()` is called, then it returns an empty list without raising an exception.
- [ ] AC 5: Given a set of reviews with a duplicate `(app_id, author_url)`, when `upsert_reviews()` is called, then existing reviews are updated (not duplicated), and the returned count reflects total upserts.
- [ ] AC 6: Given reviews have been upserted for an app, when `update_rating_distribution()` is called, then `App.rating_distribution` contains a correct JSON object: `{"1": N, "2": N, "3": N, "4": N, "5": N}`.
- [ ] AC 7: Given the reviews endpoint `GET /api/v1/apps/{app_id}/reviews`, when called with `sort=lowest`, then reviews are returned ordered by rating ascending.
- [ ] AC 8: Given the reviews endpoint, when called with `language=en`, then only reviews with `language="en"` are returned.
- [ ] AC 9: Given the reviews endpoint, when the response is returned, then it includes a `summary` object with `total_reviews`, `rating_distribution`, and `average_review_rating`.
- [ ] AC 10: Given the Celery beat schedule, when the application starts, then `crawl_reviews_task` is scheduled to run daily at 3:00 AM UTC.

**Frontend — Framework Upgrades:**
- [ ] AC 11: Given the Tailwind 4 migration, when loading any page, then all existing styles render identically (dark mode, brand colors, responsive breakpoints, custom scrollbar, range slider thumb).
- [ ] AC 12: Given the Next.js 15 + React 19 upgrade, when running `npm run build`, then the build succeeds with no errors.
- [ ] AC 13: Given shadcn/ui is initialized, when viewing the homepage, then filter controls use shadcn Select, Input, and Slider components with consistent styling.
- [ ] AC 14: Given next-themes is integrated, when toggling between dark and light mode, then the theme persists across page navigations and full page reloads without a flash of unstyled content.

**Frontend — Component Quality:**
- [ ] AC 15: Given the homepage loads, when the initial render completes, then app icons are rendered with `next/image` `<Image>` component (verifiable via rendered `<img>` having `srcset` attribute).
- [ ] AC 16: Given the homepage is loading data, when React Query `isLoading` is true, then skeleton loaders are displayed instead of a spinner.
- [ ] AC 17: Given a user types in the search box, when they stop typing, then the API call is debounced by 300ms (no call fires on every keystroke).
- [ ] AC 18: Given the homepage is a React Server Component, when a fresh page load occurs, then the initial HTML response contains pre-rendered app data (no client-side loading spinner visible on first paint).

**Frontend — Reviews UI:**
- [ ] AC 19: Given an app detail page, when reviews exist for the app, then a RatingDistribution component shows horizontal bars for 1-5 star ratings with correct proportions.
- [ ] AC 20: Given an app detail page with reviews, when the ReviewList renders, then reviews are displayed as cards with author name, star rating, title, body, and date.
- [ ] AC 21: Given the ReviewList, when the user selects "Lowest Rating" sort, then reviews are re-fetched and displayed ordered by rating ascending.
- [ ] AC 22: Given an app with no reviews, when the ReviewList renders, then an empty state message "No reviews yet" is displayed.

**Cross-cutting:**
- [ ] AC 23: Given all changes are complete, when running `cd backend && python -m pytest -v`, then all existing tests plus new review tests pass (target: 170+ tests).
- [ ] AC 24: Given all changes are complete, when running `cd frontend && npx jest`, then all existing tests plus new review component tests pass (target: 70+ tests).
- [ ] AC 25: Given the existing auth flows (login, register, dashboard), when the frontend upgrades are applied, then all auth functionality continues to work without regression.

## Additional Context

### Dependencies

**Backend (new pip packages):**
- None required — `httpx` (for RSS fetch) and JSON parsing are already available. RSS JSON endpoint eliminates XML parsing need.

**Frontend (npm upgrades):**
- `next` 14.2 → 15.x (breaking: async request APIs, Image component changes, no nested `<a>` in Link)
- `react` + `react-dom` 18.3 → 19.x (breaking: ref as prop, use() hook, new JSX transform)
- `tailwindcss` 3.4 → 4.x (breaking: config moves to CSS @theme, PostCSS plugin changes)
- `typescript` 5.9 → latest compatible

**Frontend (new npm packages):**
- `next-themes` (SSR-safe theme management)
- `lucide-react` (icon library, default with shadcn/ui)
- `class-variance-authority` + `clsx` + `tailwind-merge` (shadcn/ui utilities)
- `@radix-ui/*` (auto-installed per shadcn component)

**Frontend (remove):**
- `tailwind.config.ts` (replaced by CSS-based TW4 config)
- `autoprefixer` (handled by TW4 internally)

### Testing Strategy

**Backend:**
- Unit tests for `ReviewCrawler` methods (fetch, upsert, distribution update) using `respx` for HTTP mocking and SQLite in-memory DB
- API integration tests for `/apps/{id}/reviews` endpoint using `seeded_client` fixture with review seed data
- Upsert idempotency test: insert same review twice, verify single row
- Edge case tests: empty RSS feed, single-entry feed, malformed feed data
- Estimated: ~15-20 new backend tests

**Frontend:**
- Component tests for `RatingDistribution` and `ReviewList` using React Testing Library with mocked API
- Verify existing tests pass after framework upgrades (this may require test config updates)
- Manual testing checklist: dark/light mode toggle, filter interactions, search debounce, pagination, app detail page with reviews
- Estimated: ~8-12 new frontend tests

**Manual Verification:**
- Visual regression check: compare homepage before/after on both dark and light themes
- Mobile responsiveness: verify responsive column hiding still works on AppTable
- Performance: verify server-rendered homepage loads without client-side spinner (view source)

### Notes

**High-risk items:**
- Tailwind CSS 4 migration is the most disruptive frontend change — every utility class must still resolve correctly. Run visual comparison after this step.
- React 19 may break existing Jest tests due to changed ref handling and async rendering. Budget time for test fixes in Task 22.
- Apple RSS feed format is undocumented and may change without notice. The crawler should fail gracefully and log errors rather than crashing the entire task.

**Known limitations:**
- Apple RSS feed returns max ~50 reviews per app per country — for apps with thousands of reviews, we only capture the most recent 50.
- RSS feed updates are not real-time — there may be a delay between a review being posted and appearing in the feed.
- `rating_distribution` on the App model reflects only reviews we've captured via RSS, not the total App Store distribution (which Apple doesn't expose).

**Future considerations (out of scope):**
- Sentiment analysis on review text (NLP pipeline)
- Review trend analysis over time (would need periodic re-crawls and historical storage)
- Review aggregation across countries for the same app
- Full-text search on review bodies
- Review response tracking (developer replies)
