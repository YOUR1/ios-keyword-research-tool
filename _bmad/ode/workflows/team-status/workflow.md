---
name: team-status
description: Generate overview of all ODE agent operations
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/team-status'
---

# Team Status Workflow

**Primary Agent:** Chief
**Type:** On-demand

---

## Goal

Provide a comprehensive overview of all ODE agent operations and system health.

---

## Workflow Steps

### Step 1: Scout Status

Check Scout agent operational status.

```yaml
scout_status:
  - Last keyword discovery: {timestamp}
  - Keywords discovered (24h): {count}
  - Active trend scans: {active}
  - Memory status: {sidecar_health}
```

### Step 2: Analyst Status

Check Analyst agent operational status.

```yaml
analyst_status:
  - Last opportunity scan: {timestamp}
  - Opportunities identified: {count}
  - Pending analyses: {pending}
  - Memory status: {sidecar_health}
```

### Step 3: Ops Status

Check Ops agent operational status.

```yaml
ops_status:
  - Last crawl: {timestamp}
  - Crawl success rate: {rate}%
  - Data freshness: {age}
  - System health: {status}
```

### Step 4: System Health

Aggregate system health metrics.

```yaml
system:
  - Database: {db_status}
  - Redis: {cache_status}
  - API limits: {remaining}/{total}
  - Disk usage: {disk_pct}%
```

### Step 5: Alert Summary

Summarize recent alerts and notifications.

```yaml
alerts:
  - Active alerts: {count}
  - Resolved (24h): {resolved}
  - Pending actions: {pending}
```

---

## Output

```yaml
output:
  format: |
    ## ODE Team Status Report
    **Timestamp:** {timestamp}
    **Overall Status:** {overall_status}

    ---

    ### 🔍 Scout
    - Status: {scout_status}
    - Last activity: {scout_last}
    - Discoveries (24h): {scout_discoveries}

    ### 📊 Analyst
    - Status: {analyst_status}
    - Last activity: {analyst_last}
    - Analyses (24h): {analyst_count}

    ### ⚙️ Ops
    - Status: {ops_status}
    - Last crawl: {ops_last}
    - Success rate: {ops_rate}%

    ### 🖥️ System
    - Database: {db_status}
    - Cache: {cache_status}
    - APIs: {api_status}

    ### 🚨 Alerts
    - Active: {alert_count}
    - Action required: {action_needed}

    ---
    **Team status nominal.**
    _Report by ODE Chief_
```

---

_ODE Workflow - Chief Agent_
