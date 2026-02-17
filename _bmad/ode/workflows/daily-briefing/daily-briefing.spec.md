# Workflow Specification: Daily Briefing

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Core

---

## Workflow Overview

**Goal:** Generate a daily intelligence report summarizing key findings and opportunities.

**Description:** Compiles data from all agents into a comprehensive daily briefing. Includes trending keywords, top opportunities, system status, and recommended actions.

**Workflow Type:** Scheduled / On-demand

---

## Workflow Structure

### Entry Point

```yaml
---
name: daily-briefing
description: Generate daily intelligence report with top findings
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/daily-briefing'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Data Gathering | Collect reports from all agents |
| 2 | Keyword Summary | Summarize new/trending keywords |
| 3 | Opportunity Summary | Highlight top opportunities |
| 4 | Alert Review | List any goldmine alerts from past 24h |
| 5 | System Status | Include operational health from Ops |
| 6 | Recommendations | Generate actionable recommendations |
| 7 | Format Report | Compile into briefing document |

---

## Workflow Inputs

### Required Inputs

- Keyword discovery data (from Scout)
- Opportunity scan data (from Analyst)
- System status (from Ops)
- Date range (default: last 24 hours)

### Optional Inputs

- Focus categories
- Priority countries
- Executive summary length

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [ ] Non-document

### Output Files

- `daily-briefing-{date}.md` — Full intelligence report
- Stored in `{reports_folder}/briefings/`

---

## Agent Integration

### Primary Agent

**Chief** — Owns and triggers this workflow

### Other Agents

- **Scout** — Provides keyword data
- **Analyst** — Provides opportunity data
- **Ops** — Provides system status

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Should be schedulable (daily at configured time)
- Professional intelligence report format
- Include confidence levels for recommendations
- Reference specific apps/niches with data

---

_Spec created on 2026-02-17 via BMAD Module workflow_
