---
name: data-sync
description: Synchronize and deduplicate data across sources
web_bundle: true
installed_path: '{project-root}/_bmad/ode/workflows/data-sync'
---

# Data Sync Workflow

**Primary Agent:** Ops
**Type:** Automated / On-demand

---

## Goal

Ensure data integrity through deduplication, validation, and synchronization.

---

## Workflow Steps

### Step 1: Duplicate Detection

Scan for duplicate records in the database.

```yaml
detection:
  - Check apps table for duplicate itunes_id
  - Check keywords for near-matches
  - Identify stale records (no update > 30 days)
```

### Step 2: Deduplication

Remove or merge duplicate records.

```yaml
deduplication:
  strategy: Keep newest, merge data
  fields_to_merge:
    - rating_count (sum if applicable)
    - Keep highest rating_count record
```

### Step 3: Data Validation

Validate data integrity across tables.

```yaml
validation:
  - Foreign key integrity
  - Required fields not null
  - Rating values in valid range (0-5)
  - Dates are reasonable
```

### Step 4: Cache Sync

Synchronize Redis cache with database state.

```yaml
cache:
  - Clear stale cache entries
  - Pre-warm frequently accessed data
  - Verify cache consistency
```

### Step 5: History Snapshot

Create rating history snapshots for tracking.

```yaml
snapshot:
  - Record current ratings to ratings_history
  - Calculate weighted_score changes
  - Identify significant movements
```

### Step 6: Report

Generate sync report.

---

## Output

```yaml
output:
  format: |
    ## Data Sync Complete
    **Status:** {status}
    **Duration:** {duration}s

    ### Deduplication
    - Duplicates found: {dup_count}
    - Records merged: {merged}

    ### Validation
    - Records validated: {validated}
    - Issues found: {issues}
    - Issues fixed: {fixed}

    ### Cache
    - Entries cleared: {cleared}
    - Entries warmed: {warmed}

    **Sync complete. 0 duplicates detected.**
```

---

_ODE Workflow - Ops Agent_
