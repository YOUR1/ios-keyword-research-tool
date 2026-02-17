---
name: niche-analysis
description: Deep dive analysis into a specific app niche
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/niche-analysis'
---

# Niche Analysis Workflow

**Primary Agent:** Analyst
**Type:** On-demand (user-triggered)

---

## Goal

Perform comprehensive analysis of a specific niche/category to identify opportunities and competition.

---

## Workflow Steps

### Step 1: Niche Definition

Define the target niche for analysis.

```yaml
input:
  required:
    - category_id OR keyword
  optional:
    - country_filter
    - price_range
```

### Step 2: Competitor Mapping

Map all competitors in the niche.

```yaml
analysis:
  - List all apps in niche
  - Calculate market share estimates
  - Identify top performers
  - Note recent entrants
```

### Step 3: Gap Analysis

Identify gaps in current market offerings.

```yaml
gaps:
  - Feature gaps (based on reviews)
  - Price gaps
  - Quality gaps (rating distribution)
  - Regional gaps
```

### Step 4: Opportunity Assessment

Calculate niche opportunity score.

```yaml
opportunity:
  - Market size estimate
  - Competition intensity
  - User satisfaction level
  - Entry barriers
```

### Step 5: Recommendations

Generate actionable recommendations for entering/competing in niche.

---

## Output

```yaml
output:
  file: "niche-analysis-{niche}-{date}.md"
  format: |
    ## Niche Analysis: {niche_name}
    **Date:** {date}
    **Opportunity Score:** {score}/100

    ### Market Overview
    - Total apps: {app_count}
    - Avg rating: {avg_rating}
    - Top performer: {top_app}

    ### Competitor Landscape
    {competitor_table}

    ### Gap Analysis
    {identified_gaps}

    ### Entry Recommendation
    {recommendation}
```

---

_ODE Workflow - Analyst Agent_
