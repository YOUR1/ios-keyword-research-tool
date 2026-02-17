# Workflow Specification: Niche Analysis

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Feature

---

## Workflow Overview

**Goal:** Perform deep-dive analysis of a specific niche or category.

**Description:** When a user or alert identifies an interesting niche, this workflow performs comprehensive analysis including competitor mapping, sentiment breakdown, trend projection, and opportunity assessment.

**Workflow Type:** On-demand / User-triggered

---

## Workflow Structure

### Entry Point

```yaml
---
name: niche-analysis
description: Deep dive analysis of specific niche/category
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/niche-analysis'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Niche Definition | Define niche scope (category, keywords) |
| 2 | App Collection | Gather all apps in the niche |
| 3 | Competitor Mapping | Map competitive landscape |
| 4 | Sentiment Deep Dive | Analyze reviews across all apps |
| 5 | Trend Analysis | Project niche trajectory |
| 6 | Gap Identification | Find unmet needs |
| 7 | Opportunity Assessment | Calculate niche opportunity score |
| 8 | Report Generation | Create comprehensive analysis report |

---

## Workflow Inputs

### Required Inputs

- Niche identifier (category ID, keyword, or app cluster)
- Target country

### Optional Inputs

- Competitor depth (top N apps)
- Review sample size
- Historical date range

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [ ] Non-document

### Output Files

- `niche-analysis-{niche}-{date}.md` — Full analysis report
- Includes: competitor table, sentiment charts, trend data, recommendations

---

## Agent Integration

### Primary Agent

**Analyst** — Owns and triggers this workflow

### Other Agents

- **Scout** — Provides keyword context
- **Chief** — May trigger based on goldmine alerts

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Deep analysis, not quick scan
- Include visual data (tables, potential chart data)
- Actionable recommendations with confidence levels
- Export-friendly format for sharing

---

_Spec created on 2026-02-17 via BMAD Module workflow_
