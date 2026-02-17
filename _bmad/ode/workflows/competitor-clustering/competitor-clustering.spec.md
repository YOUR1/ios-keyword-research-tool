# Workflow Specification: Competitor Clustering

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Feature

---

## Workflow Overview

**Goal:** Group similar apps to identify market segments and competitive positioning.

**Description:** Analyzes app features, descriptions, and metadata to cluster competitors into meaningful groups (e.g., freemium vs premium, feature-rich vs simple). Helps identify gaps between segments.

**Workflow Type:** On-demand

---

## Workflow Structure

### Entry Point

```yaml
---
name: competitor-clustering
description: Group similar apps by market segment
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/competitor-clustering'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | App Collection | Gather apps in target category/niche |
| 2 | Feature Extraction | Extract key features from descriptions |
| 3 | Pricing Analysis | Categorize by pricing model |
| 4 | Rating Stratification | Group by rating tiers |
| 5 | Clustering Algorithm | Apply clustering logic |
| 6 | Segment Naming | Label each cluster meaningfully |
| 7 | Gap Analysis | Identify gaps between clusters |
| 8 | Visualization | Generate cluster map/table |

---

## Workflow Inputs

### Required Inputs

- Category or keyword to analyze
- Minimum app count

### Optional Inputs

- Clustering parameters
- Focus on specific price range
- Exclude specific apps

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [ ] Non-document

### Output Files

- `competitor-clustering-{niche}-{date}.md` — Cluster analysis
- Includes: cluster definitions, app assignments, gap analysis

---

## Agent Integration

### Primary Agent

**Analyst** — Owns and triggers this workflow

### Other Agents

- **Scout** — May provide keyword context for clustering

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Simple clustering: pricing tier + rating tier + feature count
- Visual output: table with cluster assignments
- Highlight "blue ocean" gaps (underserved segments)
- Reference for niche-analysis workflow

---

_Spec created on 2026-02-17 via BMAD Module workflow_
