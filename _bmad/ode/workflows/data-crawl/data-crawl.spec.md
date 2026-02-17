# Workflow Specification: Data Crawl

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Utility

---

## Workflow Overview

**Goal:** Execute iTunes API scraping operations to gather fresh app data.

**Description:** Orchestrates the crawling of iTunes Search API to fetch app metadata, ratings, and reviews. Handles rate limiting, proxy rotation, and error recovery.

**Workflow Type:** Scheduled / On-demand

---

## Workflow Structure

### Entry Point

```yaml
---
name: data-crawl
description: Execute iTunes API scraping operations
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/data-crawl'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Configuration | Load crawl parameters and proxy config |
| 2 | Target Selection | Determine what to crawl (categories, keywords) |
| 3 | API Execution | Execute iTunes API calls via proxy |
| 4 | Response Parsing | Parse and validate API responses |
| 5 | Deduplication Check | Skip already-crawled apps |
| 6 | Storage | Save new/updated data to PostgreSQL |
| 7 | Logging | Log crawl results to crawl_logs table |

---

## Workflow Inputs

### Required Inputs

- Proxy configuration (from .env)
- Target countries (from module config)
- PostgreSQL connection

### Optional Inputs

- Specific categories to crawl
- Search terms override
- Limit (max apps to fetch)

---

## Workflow Outputs

### Output Format

- [ ] Document-producing
- [x] Non-document (database updates)

### Output Files

- Database: apps table (new/updated records)
- Database: crawl_logs table (operation log)

---

## Agent Integration

### Primary Agent

**Ops** — Owns and triggers this workflow

### Other Agents

- **Scout** — May request specific keyword crawls
- **Chief** — Receives status reports

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- ALL API calls MUST use proxy from .env
- Respect rate limits (existing semaphore: 20/min)
- Skip apps already in database (deduplication)
- Use existing backend/app/services/itunes.py patterns
- Log all operations for debugging

---

_Spec created on 2026-02-17 via BMAD Module workflow_
