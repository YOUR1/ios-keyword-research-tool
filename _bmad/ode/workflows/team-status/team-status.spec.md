# Workflow Specification: Team Status

**Module:** ode
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17
**Type:** Utility

---

## Workflow Overview

**Goal:** Provide overview of all ODE operations and system health.

**Description:** Gathers status from all agents and workflows to provide a comprehensive operational view. Shows recent activity, pending tasks, system health, and any issues.

**Workflow Type:** On-demand

---

## Workflow Structure

### Entry Point

```yaml
---
name: team-status
description: Overview of all operations and system health
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/team-status'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Agent Status | Check status of each agent |
| 2 | Recent Activity | Gather recent workflow executions |
| 3 | Data Health | Check database statistics |
| 4 | API Health | Verify external API connectivity |
| 5 | Alert Summary | Summarize recent alerts |
| 6 | Issue Detection | Identify any problems |
| 7 | Report Generation | Compile team status report |

---

## Workflow Inputs

### Required Inputs

- Access to all agent sidecars
- Database connection
- Crawl logs

### Optional Inputs

- Time range (default: last 24h)
- Verbose mode (include detailed logs)

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [ ] Non-document

### Output Files

- `team-status-{date}.md` — Operational status report
- Displayed directly to user

---

## Agent Integration

### Primary Agent

**Chief** — Owns and triggers this workflow

### Other Agents

- **Scout** — Reports keyword discovery stats
- **Analyst** — Reports analysis stats
- **Ops** — Reports crawl/sync stats

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

Key considerations:
- Quick execution (status check, not deep analysis)
- Traffic light format: ✅ Good, ⚠️ Warning, ❌ Issue
- Include: last crawl time, apps in DB, keywords tracked
- Show any errors from recent operations

---

_Spec created on 2026-02-17 via BMAD Module workflow_
