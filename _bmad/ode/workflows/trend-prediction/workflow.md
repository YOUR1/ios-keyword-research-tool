---
name: trend-prediction
description: Scan for emerging market trends and forecast patterns
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/trend-prediction'
---

# Trend Prediction Workflow

**Primary Agent:** Scout
**Type:** Automated / On-demand

---

## Goal

Analyze historical data patterns to predict emerging market trends before they peak.

---

## Workflow Steps

### Step 1: Historical Data Collection

Gather historical keyword and app performance data.

```yaml
data_sources:
  - keywords: Last 30 days trending data
  - apps: Rating changes over time
  - categories: Growth patterns
```

### Step 2: Pattern Recognition

Identify recurring patterns and growth trajectories.

```yaml
analysis:
  - Moving averages (7-day, 30-day)
  - Growth velocity calculation
  - Seasonality detection
```

### Step 3: Trend Scoring

Score potential trends by confidence and magnitude.

```yaml
scoring:
  confidence: Based on data consistency
  magnitude: Expected growth percentage
  velocity: Speed of trend development
```

### Step 4: Prediction Generation

Generate trend predictions with confidence levels.

```yaml
predictions:
  - Emerging keywords (next 7 days)
  - Growing niches (next 30 days)
  - Declining categories (watchlist)
```

### Step 5: Report Output

Generate trend prediction report.

---

## Output

```yaml
output:
  file: "trend-prediction-{date}.md"
  format: |
    ## Trend Prediction Report
    **Date:** {date}
    **Confidence:** {avg_confidence}%

    ### Rising Trends
    {rising_trends_table}

    ### Predicted Breakouts
    {breakout_predictions}

    ### Declining Trends
    {declining_trends}
```

---

_ODE Workflow - Scout Agent_
