---
name: competitor-clustering
description: Group similar apps by market segment and competition level
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/competitor-clustering'
---

# Competitor Clustering Workflow

**Primary Agent:** Analyst
**Type:** On-demand

---

## Goal

Cluster apps into competitive groups based on features, pricing, and target audience.

---

## Workflow Steps

### Step 1: Data Collection

Gather app data for clustering analysis.

```yaml
input:
  - category_id: Target category
  - min_apps: Minimum cluster size (default: 5)
```

### Step 2: Feature Extraction

Extract clustering features from apps.

```yaml
features:
  - Price tier (free, freemium, paid)
  - Rating bracket
  - Download volume
  - Description keywords
  - Update frequency
```

### Step 3: Clustering Algorithm

Apply clustering to group similar apps.

```yaml
clustering:
  method: K-means or hierarchical
  clusters: Auto-detect optimal k
  similarity: Feature-based distance
```

### Step 4: Cluster Analysis

Analyze each cluster for characteristics.

```yaml
analysis:
  - Cluster size
  - Average rating
  - Price distribution
  - Market leader identification
  - Opportunity gaps
```

### Step 5: Competitive Mapping

Map competition intensity within and across clusters.

---

## Output

```yaml
output:
  file: "competitor-clusters-{category}-{date}.md"
  format: |
    ## Competitor Clustering: {category}
    **Clusters Found:** {cluster_count}

    ### Cluster Overview
    {cluster_summary_table}

    ### Cluster Details
    {detailed_cluster_breakdown}

    ### Strategic Insights
    - Underserved clusters: {gaps}
    - High competition: {crowded}
    - Entry recommendations: {recommendations}
```

---

_ODE Workflow - Analyst Agent_
