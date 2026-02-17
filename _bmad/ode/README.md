# ODE: Opportunity Discovery Engine

Opportunity Discovery Engine for iOS App Market Intelligence

Automated niche detection, trending keywords, and goldmine alerts

---

## Overview

ODE is an opportunity discovery engine that actively hunts for niche market gaps in the iOS app ecosystem. Instead of reactive keyword research, ODE proactively identifies trending keywords, analyzes apps using the "goldmine formula" (high downloads + poor ratings = unmet demand), and delivers actionable alerts to users seeking product opportunities.

**Key Features:**
- Automated keyword discovery without user input
- Goldmine formula: high downloads + poor ratings = opportunity
- Proactive alerts when high-value targets are detected
- Sentiment analysis, competitor clustering, and trend prediction
- Daily intelligence briefings

---

## Installation

```bash
bmad install ode
```

---

## Quick Start

1. **Check your Daily Briefing** — Chief will present today's top opportunities
2. **Explore trending keywords** — Scout continuously monitors the market
3. **Deep dive into niches** — Use Analyst for detailed niche analysis
4. **Get alerted** — Goldmine alerts notify you of high-confidence opportunities

**For detailed documentation, see [docs/](docs/).**

---

## Components

### Agents

| Agent | Role |
|-------|------|
| **Scout** | Trend Scout — Keyword discovery, market monitoring |
| **Analyst** | Market Analyst — App analysis, opportunity scoring |
| **Ops** | Data Operative — Scraping, data integrity |
| **Chief** | Intel Officer — Coordination, briefings, alerts |

### Workflows

**Core:**
- `keyword-discovery` — Automatically discover trending keywords
- `opportunity-scan` — Scan apps using goldmine formula
- `daily-briefing` — Generate daily intelligence report

**Feature:**
- `niche-analysis` — Deep dive into specific niche
- `goldmine-alert` — Proactive high-value target alerts
- `sentiment-analysis` — Analyze app reviews
- `competitor-clustering` — Group apps by segment
- `trend-prediction` — Forecast emerging trends

**Utility:**
- `data-crawl` — iTunes API scraping
- `data-sync` — Data synchronization and cleanup
- `team-status` — Operational overview

---

## Configuration

The module supports these configuration options (set during installation):

| Variable | Description | Default |
|----------|-------------|---------|
| `alert_threshold` | Minimum confidence for Goldmine Alerts | 90 |
| `target_countries` | Countries to monitor | US, NL |
| `crawl_schedule` | Automatic crawl frequency | daily |
| `reports_folder` | Intelligence reports location | `{output_folder}/ode-reports` |

---

## Module Structure

```
ode/
├── module.yaml
├── config.yaml
├── README.md
├── TODO.md
├── docs/
│   ├── getting-started.md
│   ├── agents.md
│   ├── workflows.md
│   └── examples.md
├── agents/
│   ├── scout.spec.md
│   ├── analyst.spec.md
│   ├── ops.spec.md
│   └── chief.spec.md
└── workflows/
    ├── keyword-discovery/
    ├── opportunity-scan/
    ├── daily-briefing/
    └── ...
```

---

## Documentation

For detailed user guides and documentation, see the **[docs/](docs/)** folder:
- [Getting Started](docs/getting-started.md)
- [Agents Reference](docs/agents.md)
- [Workflows Reference](docs/workflows.md)
- [Examples](docs/examples.md)

---

## Development Status

This module is currently in development. The following components are planned:

- [ ] Agents: 4 agents (specs created)
- [ ] Workflows: 11 workflows (specs created)

See TODO.md for detailed status.

---

## Author

Created via BMAD Module workflow

---

## License

Part of the BMAD framework.
