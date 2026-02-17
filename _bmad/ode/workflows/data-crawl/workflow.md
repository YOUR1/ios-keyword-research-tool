---
name: data-crawl
description: Execute iTunes API scraping operations
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/data-crawl'
---

# Data Crawl Workflow

**Primary Agent:** Ops
**Type:** Automated / On-demand

---

## Goal

Execute iTunes API scraping to gather fresh app data for analysis.

---

## Workflow Steps

### Step 1: Configuration

Load crawl configuration and parameters.

```yaml
config:
  countries: [US, GB, DE, FR, NL]
  categories: All active categories
  batch_size: 50
  rate_limit: 20/minute
  proxy_required: true
```

### Step 2: Pre-Crawl Check

Verify system readiness before crawling.

```yaml
checks:
  - Database connection: OK
  - Proxy availability: OK
  - API rate limit status: OK
  - Last crawl time: Check cooldown
```

### Step 3: Execute Crawl

Run the iTunes API scraping operation.

```yaml
execution:
  - Loop through search terms
  - Apply rate limiting (3s delay)
  - Use semaphore (20 concurrent)
  - Handle errors gracefully
```

### Step 4: Data Processing

Process and validate crawled data.

```yaml
processing:
  - Validate JSON responses
  - Extract required fields
  - Calculate weighted scores
  - Prepare for upsert
```

### Step 5: Database Upsert

Insert or update records in database.

```yaml
upsert:
  table: apps
  conflict: (itunes_id, country_id)
  update: All fields except id, created_at
```

### Step 6: Log Results

Record crawl operation in crawl_logs.

```yaml
logging:
  table: crawl_logs
  fields:
    - source
    - country_code
    - status
    - apps_found
    - apps_updated
    - duration_seconds
    - error_message (if any)
```

---

## Output

```yaml
output:
  format: |
    ## Crawl Operation Complete
    **Status:** {status}
    **Duration:** {duration}s

    ### Results
    - Apps found: {found}
    - Apps updated: {updated}
    - New apps: {new}
    - Errors: {errors}

    ### Countries Covered
    {country_list}

    **Systems nominal.**
```

---

_ODE Workflow - Ops Agent_
