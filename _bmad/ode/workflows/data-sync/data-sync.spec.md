# Workflow Specification: Data Sync

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Utility

---

## Workflow Overview

**Goal:** Synchronize, deduplicate, and clean data across the ODE system.

**Description:** Ensures data integrity by removing duplicates, updating stale records, and maintaining consistency between tables. Runs after crawls or on schedule.

**Workflow Type:** Scheduled / Post-crawl

---

## Workflow Structure

### Entry Point

```yaml
---
name: data-sync
description: Synchronize, deduplicate, and clean data
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/data-sync'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Duplicate Detection | Find duplicate records |
| 2 | Merge Strategy | Determine how to merge duplicates |
| 3 | Deduplication | Remove/merge duplicate records |
| 4 | Stale Detection | Identify outdated records |
| 5 | Refresh Queue | Queue stale records for re-crawl |
| 6 | Integrity Check | Verify foreign key relationships |
| 7 | Statistics | Generate sync statistics |

---

## Workflow Inputs

### Required Inputs

- PostgreSQL connection
- Stale threshold (days since last update)

### Optional Inputs

- Dry run mode (report only, don't modify)
- Specific table to sync
- Date range filter

---

## Workflow Outputs

### Output Format

- [x] Document-producing (sync report)
- [x] Non-document (database updates)

### Output Files

- `data-sync-{date}.md` — Sync statistics report
- Database: Cleaned/deduplicated records

---

## Agent Integration

### Primary Agent

**Ops** — Owns and triggers this workflow

### Other Agents

- **Chief** — Receives sync status for team-status

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Use existing unique constraint (itunes_id, country_id)
- Preserve most recent data when merging
- Log all deletions for audit trail
- Report: duplicates found, merged, stale records queued

---

_Spec created on 2026-02-17 via BMAD Module workflow_
