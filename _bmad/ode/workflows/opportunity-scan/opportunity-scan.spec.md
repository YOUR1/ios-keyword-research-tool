# Workflow Specification: Opportunity Scan

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Core

---

## Workflow Overview

**Goal:** Scan apps and apply the goldmine formula to identify market opportunities.

**Description:** Analyzes app data using the goldmine formula (high downloads + poor ratings = opportunity). Calculates opportunity scores and identifies apps/niches with unmet user demand.

**Workflow Type:** Automated / On-demand

---

## Workflow Structure

### Entry Point

```yaml
---
name: opportunity-scan
description: Scan apps using goldmine formula for opportunity scoring
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/opportunity-scan'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Data Retrieval | Fetch app data from database |
| 2 | Goldmine Scoring | Apply downloads + ratings formula |
| 3 | Threshold Filter | Filter by minimum opportunity score |
| 4 | Niche Grouping | Group opportunities by category/niche |
| 5 | Ranking | Rank opportunities by score |
| 6 | Alert Check | Check if any meet goldmine alert threshold |
| 7 | Storage | Save scores to database |

---

## Workflow Inputs

### Required Inputs

- App data from database
- Goldmine formula parameters (configurable)
- Alert threshold from config

### Optional Inputs

- Category filter
- Country filter
- Minimum download count
- Maximum rating threshold

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [x] Non-document (database updates)

### Output Files

- `opportunity-scan-{date}.md` — Scan results summary
- Database: Updated opportunity scores

---

## Agent Integration

### Primary Agent

**Analyst** — Owns and triggers this workflow

### Other Agents

- **Chief** — Receives alerts for high-value opportunities
- **Scout** — May provide keyword context

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Goldmine formula: `score = (downloads / max_downloads) * (1 - (rating / 5))`
- Higher score = better opportunity
- Configurable thresholds
- Trigger goldmine-alert if score exceeds alert_threshold

---

_Spec created on 2026-02-17 via BMAD Module workflow_
