# Workflow Specification: Keyword Discovery

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Core

---

## Workflow Overview

**Goal:** Automatically discover trending keywords from market data and existing system data.

**Description:** Scans iTunes API data, analyzes search patterns, and identifies emerging keywords that indicate market opportunities. Works without user input to continuously enrich the keyword database.

**Workflow Type:** Automated / Scheduled

---

## Workflow Structure

### Entry Point

```yaml
---
name: keyword-discovery
description: Automatically discover trending keywords from market data
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/keyword-discovery'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Data Collection | Gather recent app data and search trends |
| 2 | Pattern Analysis | Identify keyword patterns and frequencies |
| 3 | Trend Scoring | Score keywords by trend strength |
| 4 | Deduplication | Filter already-known keywords |
| 5 | Storage | Save new keywords to database |
| 6 | Report | Generate discovery report for Chief |

---

## Workflow Inputs

### Required Inputs

- Access to iTunes API (via proxy)
- Access to PostgreSQL database
- Target countries configuration

### Optional Inputs

- Category filter
- Minimum trend threshold
- Date range for analysis

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [x] Non-document (database updates)

### Output Files

- `keyword-discovery-report-{date}.md` — Summary of discovered keywords
- Database: New keyword records in keywords table

---

## Agent Integration

### Primary Agent

**Scout** — Owns and triggers this workflow

### Other Agents

- **Ops** — May be called for data crawl operations
- **Chief** — Receives discovery reports

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Must work without user input (automated)
- Should use proxy for all API calls
- Deduplicate against existing keywords
- Score trends using historical comparison

---

_Spec created on 2026-02-17 via BMAD Module workflow_
