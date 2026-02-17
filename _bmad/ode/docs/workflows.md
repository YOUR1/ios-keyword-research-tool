# Workflows Reference

ODE includes 11 workflows organized into three categories:

---

## Core Workflows

Essential functionality that runs automatically or daily.

### Keyword Discovery

**Agent:** Scout
**Type:** Automated / Scheduled

Automatically discovers trending keywords from market data and the existing system database. Runs without user input to continuously enrich the keyword database.

**When to Use:**
- Runs automatically based on `crawl_schedule` setting
- Trigger manually when you want fresh keyword data

**Output:**
- New keywords added to database
- Discovery report

---

### Opportunity Scan

**Agent:** Analyst
**Type:** Automated / On-demand

Scans apps and applies the goldmine formula to identify market opportunities. Calculates opportunity scores and triggers alerts for high-value targets.

**Goldmine Formula:**
```
Opportunity = High Downloads + Poor Ratings
```

**When to Use:**
- After new data is crawled
- When you want to refresh opportunity scores
- Triggered automatically after data-crawl

**Output:**
- Updated opportunity scores
- Triggers goldmine-alert if score exceeds threshold

---

### Daily Briefing

**Agent:** Chief
**Type:** Scheduled / On-demand

Compiles intelligence from all agents into a comprehensive daily report. Your one-stop overview of opportunities and system status.

**When to Use:**
- Daily (can be scheduled)
- When you want a quick overview
- Before starting your research session

**Output:**
- `daily-briefing-{date}.md` in reports folder

---

## Feature Workflows

Specialized capabilities for deeper analysis.

### Niche Analysis

**Agent:** Analyst
**Type:** On-demand

Performs comprehensive analysis of a specific niche or category. Includes competitor mapping, sentiment breakdown, trend projection, and opportunity assessment.

**When to Use:**
- When you find an interesting opportunity
- When you need detailed market research
- Before committing to a product idea

**Output:**
- Full analysis report with recommendations

---

### Goldmine Alert

**Agent:** Chief
**Type:** Event-triggered

Generates proactive alerts when opportunities exceed your configured threshold. Delivers immediate notification with key data.

**When to Use:**
- Triggered automatically by opportunity-scan
- When opportunity score > `alert_threshold`

**Output:**
- Alert notification
- Alert logged for history

---

### Sentiment Analysis

**Agent:** Analyst
**Type:** On-demand / Batch

Analyzes app reviews to extract sentiment patterns and user pain points. Essential for understanding WHY apps have poor ratings.

**When to Use:**
- When you want to understand user complaints
- During niche analysis
- Before product planning

**Output:**
- Sentiment breakdown
- Top pain points with sample quotes

---

### Competitor Clustering

**Agent:** Analyst
**Type:** On-demand

Groups similar apps to identify market segments and competitive positioning. Helps find gaps between segments.

**When to Use:**
- When analyzing a crowded market
- To find underserved segments
- During competitive research

**Output:**
- Cluster definitions and assignments
- Gap analysis

---

### Trend Prediction

**Agent:** Scout
**Type:** Scheduled / On-demand

Forecasts emerging trends and opportunity windows. Combines internal data with Google Trends to predict timing.

**When to Use:**
- When planning market entry
- To understand if a niche is rising or declining
- For investment timing

**Output:**
- Trend trajectories (Rising/Stable/Declining)
- Opportunity window estimates

---

## Utility Workflows

Supporting operations that keep the system running.

### Data Crawl

**Agent:** Ops
**Type:** Scheduled / On-demand

Executes iTunes API scraping to gather fresh app data. Handles rate limiting, proxy rotation, and error recovery.

**When to Use:**
- Runs automatically per `crawl_schedule`
- Manual trigger for specific categories
- When you need fresh data

**Output:**
- New/updated app records in database
- Crawl log entry

---

### Data Sync

**Agent:** Ops
**Type:** Post-crawl / Scheduled

Synchronizes, deduplicates, and cleans data. Ensures data integrity across the system.

**When to Use:**
- Runs automatically after crawls
- Manual trigger for cleanup
- When database needs maintenance

**Output:**
- Cleaned/deduplicated records
- Sync statistics report

---

### Team Status

**Agent:** Chief
**Type:** On-demand

Provides overview of all ODE operations and system health. Quick check on what's working.

**When to Use:**
- When you want system status
- After configuration changes
- When troubleshooting issues

**Output:**
- Status report with traffic lights (✅⚠️❌)
- Recent activity summary

---

## Workflow Dependencies

```
Data Crawl → Data Sync → Keyword Discovery → Opportunity Scan
                              ↓                    ↓
                        Trend Prediction    Niche Analysis
                                                   ↓
                                           Goldmine Alert → Daily Briefing
```
