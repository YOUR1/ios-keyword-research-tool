---
name: opportunity-scan
description: Scan apps using goldmine formula for opportunity scoring
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/opportunity-scan'
---

# Opportunity Scan Workflow

**Primary Agent:** Analyst
**Type:** Automated / On-demand

---

## Goal

Analyze app data using the goldmine formula (high downloads + poor ratings = opportunity) to identify market opportunities.

---

## Workflow Steps

### Step 1: Data Retrieval

Fetch app data from the database with required metrics.

```yaml
query: |
  SELECT
    id, name, average_rating, rating_count,
    category_id, country_id, weighted_score
  FROM apps
  WHERE rating_count >= 100
  ORDER BY rating_count DESC
```

### Step 2: Goldmine Scoring

Apply the goldmine formula to calculate opportunity scores.

```yaml
formula: |
  # Goldmine Formula
  # High demand (downloads) + Poor supply (low ratings) = Opportunity

  normalized_downloads = downloads / max_downloads
  rating_gap = 1 - (rating / 5)
  opportunity_score = normalized_downloads * rating_gap * 100
```

### Step 3: Threshold Filter

Filter results by minimum opportunity score.

```yaml
filter:
  min_score: 50
  min_rating_count: 100
  max_rating: 3.5  # Only apps with ratings <= 3.5
```

### Step 4: Niche Grouping

Group opportunities by category/niche for strategic analysis.

```yaml
grouping:
  - Group by category_id
  - Calculate niche_score = avg(opportunity_score)
  - Identify underserved niches
```

### Step 5: Ranking

Rank all opportunities by score.

```yaml
ranking:
  primary: opportunity_score DESC
  secondary: rating_count DESC
  limit: 100
```

### Step 6: Alert Check

Check if any opportunities meet the goldmine alert threshold.

```yaml
alert:
  threshold: 90
  action: "Trigger goldmine-alert workflow"
  notify: Chief
```

### Step 7: Storage

Save opportunity scores to the database.

```yaml
storage:
  table: opportunity_scores
  fields:
    - app_id
    - opportunity_score
    - scan_date
    - niche_rank
```

---

## Output

```yaml
output:
  file: "opportunity-scan-{date}.md"
  format: |
    ## Opportunity Scan Results
    **Date:** {date}
    **Apps Scanned:** {total}
    **Opportunities Found:** {count}

    ### Top 10 Opportunities
    {ranked_apps_table}

    ### Hottest Niches
    {niche_rankings}

    ### Goldmine Alerts
    {alerts_if_any}
```

---

## Configuration

```yaml
config:
  goldmine_threshold: 90
  min_opportunity_score: 50
  scan_batch_size: 1000
```

---

_ODE Workflow - Analyst Agent_
