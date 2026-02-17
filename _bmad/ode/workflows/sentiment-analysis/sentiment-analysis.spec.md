# Workflow Specification: Sentiment Analysis

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Feature

---

## Workflow Overview

**Goal:** Analyze app reviews to extract sentiment patterns and user pain points.

**Description:** Processes app reviews through sentiment analysis API to identify common complaints, feature requests, and satisfaction patterns. Essential for understanding WHY apps have poor ratings.

**Workflow Type:** On-demand / Batch

---

## Workflow Structure

### Entry Point

```yaml
---
name: sentiment-analysis
description: Analyze app reviews for patterns and pain points
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/sentiment-analysis'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Review Collection | Gather reviews for target app(s) |
| 2 | Preprocessing | Clean and prepare review text |
| 3 | Sentiment Scoring | Run through sentiment API (via proxy) |
| 4 | Topic Extraction | Identify common themes/topics |
| 5 | Pain Point Clustering | Group negative sentiments by issue |
| 6 | Opportunity Mapping | Map pain points to product opportunities |
| 7 | Report Generation | Create sentiment analysis report |

---

## Workflow Inputs

### Required Inputs

- App ID(s) or niche identifier
- Access to Sentiment Analysis API (via proxy)

### Optional Inputs

- Review count limit
- Date range filter
- Language filter

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [x] Non-document (database updates)

### Output Files

- `sentiment-analysis-{app/niche}-{date}.md` — Analysis report
- Database: Sentiment scores per app

---

## Agent Integration

### Primary Agent

**Analyst** — Owns and triggers this workflow

### Other Agents

- **Ops** — May need to fetch fresh review data
- **Chief** — Receives insights for briefings

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- All API calls via proxy
- Cache sentiment results to reduce API costs
- Extract top 5 pain points per app
- Include sample quotes for each pain point

---

_Spec created on 2026-02-17 via BMAD Module workflow_
