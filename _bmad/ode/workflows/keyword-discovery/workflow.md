---
name: keyword-discovery
description: Automatically discover trending keywords from market data
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/keyword-discovery'
---

# Keyword Discovery Workflow

**Primary Agent:** Scout
**Type:** Automated / Scheduled

---

## Goal

Scan iTunes API data, analyze search patterns, and identify emerging keywords that indicate market opportunities.

---

## Workflow Steps

### Step 1: Data Collection

Gather recent app data and search trends from the database.

```yaml
actions:
  - query: "SELECT * FROM apps WHERE updated_at > NOW() - INTERVAL '24 hours'"
  - fetch: iTunes API trending searches (via proxy)
```

### Step 2: Pattern Analysis

Identify keyword patterns and frequencies in app names, descriptions, and search terms.

```yaml
analysis:
  - Extract keywords from app metadata
  - Calculate frequency distribution
  - Compare against historical baseline
```

### Step 3: Trend Scoring

Score keywords by trend strength using historical comparison.

```yaml
scoring:
  formula: "trend_score = (current_frequency / historical_frequency) * recency_weight"
  threshold: 1.5  # 50% increase = trending
```

### Step 4: Deduplication

Filter out already-known keywords from the discovery list.

```yaml
filter:
  - Compare against existing keywords table
  - Remove duplicates and near-matches
  - Keep only genuinely new discoveries
```

### Step 5: Storage

Save new keywords to the database with metadata.

```yaml
storage:
  table: keywords
  fields:
    - keyword
    - trend_score
    - discovery_date
    - source_apps
    - category
```

### Step 6: Report

Generate discovery report for Chief agent.

```yaml
output:
  file: "keyword-discovery-report-{date}.md"
  format: |
    ## Keyword Discovery Report
    **Date:** {date}
    **New Keywords:** {count}

    ### Top Discoveries
    {ranked_keywords}

    ### Category Distribution
    {category_breakdown}
```

---

## Configuration

```yaml
config:
  min_trend_score: 1.5
  max_keywords_per_run: 100
  proxy_required: true
  schedule: "0 */6 * * *"  # Every 6 hours
```

---

_ODE Workflow - Scout Agent_
