---
name: sentiment-analysis
description: Analyze app reviews for sentiment patterns and user pain points
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/sentiment-analysis'
---

# Sentiment Analysis Workflow

**Primary Agent:** Analyst
**Type:** On-demand

---

## Goal

Analyze app reviews to extract sentiment patterns, user pain points, and feature requests.

---

## Workflow Steps

### Step 1: Review Collection

Gather reviews for target apps.

```yaml
input:
  - app_ids: List of apps to analyze
  - review_count: Max reviews per app (default: 100)
  - date_range: Optional time filter
```

### Step 2: Sentiment Classification

Classify reviews by sentiment.

```yaml
classification:
  positive: Rating >= 4, positive keywords
  neutral: Rating = 3, mixed sentiment
  negative: Rating <= 2, negative keywords
```

### Step 3: Pain Point Extraction

Identify common user complaints and issues.

```yaml
extraction:
  - Bug reports
  - Feature complaints
  - Performance issues
  - UX problems
  - Pricing concerns
```

### Step 4: Feature Request Mining

Extract feature requests from positive and negative reviews.

```yaml
features:
  - Requested features
  - Praised features
  - Missing functionality
```

### Step 5: Pattern Analysis

Identify sentiment patterns over time.

```yaml
patterns:
  - Sentiment trend (improving/declining)
  - Recurring issues
  - Seasonal patterns
```

---

## Output

```yaml
output:
  file: "sentiment-analysis-{date}.md"
  format: |
    ## Sentiment Analysis Report
    **Apps Analyzed:** {app_count}
    **Reviews Processed:** {review_count}

    ### Sentiment Distribution
    - Positive: {positive_pct}%
    - Neutral: {neutral_pct}%
    - Negative: {negative_pct}%

    ### Top Pain Points
    {pain_points_list}

    ### Feature Opportunities
    {feature_requests}

    ### Recommendations
    {actionable_insights}
```

---

_ODE Workflow - Analyst Agent_
