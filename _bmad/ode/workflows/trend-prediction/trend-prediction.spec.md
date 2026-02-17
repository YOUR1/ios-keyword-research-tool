# Workflow Specification: Trend Prediction

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Feature

---

## Workflow Overview

**Goal:** Forecast emerging trends and opportunity windows in the iOS app market.

**Description:** Analyzes historical keyword and app data combined with Google Trends to predict which niches are rising, peaking, or declining. Helps users time their market entry.

**Workflow Type:** Scheduled / On-demand

---

## Workflow Structure

### Entry Point

```yaml
---
name: trend-prediction
description: Forecast emerging trends and opportunity windows
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/trend-prediction'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Historical Data | Gather historical keyword/app data |
| 2 | Trends API Query | Fetch Google Trends data (via proxy) |
| 3 | Correlation Analysis | Correlate internal data with trends |
| 4 | Trajectory Calculation | Calculate rise/peak/decline trajectories |
| 5 | Window Estimation | Estimate opportunity window duration |
| 6 | Confidence Scoring | Score prediction confidence |
| 7 | Report Generation | Create trend forecast report |

---

## Workflow Inputs

### Required Inputs

- Keywords or categories to analyze
- Google Trends API access (via proxy)
- Historical data (minimum 30 days)

### Optional Inputs

- Prediction horizon (default: 6 months)
- Confidence threshold
- Geographic filter

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [x] Non-document (database updates)

### Output Files

- `trend-prediction-{date}.md` — Forecast report
- Database: Trend scores and predictions

---

## Agent Integration

### Primary Agent

**Scout** — Owns and triggers this workflow

### Other Agents

- **Analyst** — Uses predictions in niche analysis
- **Chief** — Incorporates in daily briefings

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- All external API calls via proxy
- Classify trends: Rising, Stable, Declining, Seasonal
- Include confidence levels (low/medium/high)
- "Opportunity window: X months" format

---

_Spec created on 2026-02-17 via BMAD Module workflow_
