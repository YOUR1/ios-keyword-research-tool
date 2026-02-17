# Module Brief: ode

**Date:** 2026-02-17
**Author:** Youri
**Module Code:** ode
**Module Type:** Standalone
**Status:** Ready for Development

---

## Executive Summary

An opportunity discovery engine that actively hunts for niche market gaps in the iOS app ecosystem. Instead of reactive keyword research, ODE proactively identifies trending keywords, analyzes apps using the "goldmine formula" (high downloads + poor ratings = unmet demand), and delivers actionable alerts to users seeking product opportunities.

**Module Category:** Market Intelligence & Opportunity Discovery
**Target Users:** Entrepreneurs & Product Builders seeking niche market opportunities
**Complexity Level:** Medium-High (4 agents, 11 workflows, external API integrations)

---

## Module Identity

### Module Code & Name

- **Code:** `ode`
- **Name:** `ODE: Opportunity Discovery Engine`

### Core Concept

ODE transforms passive app research into active opportunity hunting. The system automatically discovers trending keywords, scores apps on the goldmine formula (high downloads + poor ratings), and alerts users to validated niche markets where existing solutions fail to satisfy user needs.

### Personality Theme

Intelligence Agency — professional, data-driven, mission-focused. Agents communicate with authority and precision, using intelligence terminology (targets, signals, operations, briefings) while maintaining a professional tone. No easter eggs or casual elements.

---

## Module Type

**Type:** Standalone

ODE is a new, independent module with its own domain (market opportunity discovery). It does not extend existing BMAD modules and operates as a self-contained intelligence system for iOS app market analysis.

---

## Unique Value Proposition

**What makes this module special:**

For entrepreneurs and product builders, ODE provides automated niche detection in the iOS app market, unlike manual keyword research, because the system discovers trending keywords on its own, applies the goldmine formula (high downloads + poor ratings), and proactively sends opportunity alerts.

**Why users would choose this module:**

1. **Automated vs Manual** — No keyword input required; the system works 24/7
2. **Goldmine Formula** — One metric that directly reveals opportunities
3. **Proactive Alerts** — Opportunities find you, not the other way around
4. **Rich Analysis** — Sentiment, clustering, and trends in one view

---

## User Scenarios

### Target Users

**Primary Persona: Alex, the Opportunity Hunter**
- Role: Entrepreneur / Product Builder
- Goal: Find niche markets with unmet demand
- Pain Point: Manual research takes hours, misses trends
- Success: Finding a validated niche within minutes

### Primary Use Case

Discover niche app markets where high user adoption meets poor satisfaction — identifying gaps where a better product could succeed.

### User Journey

**Scenario 1: First Use — The Discovery**
Alex opens ODE and receives a Daily Briefing from Chief showing 12 new trending keywords, 3 high-value targets, and a top niche (sleep tracking) with 450K downloads but 2.1★ average. He clicks through to see common complaints and an Opportunity Score of 94/100.

**Scenario 2: Advanced Use — Deep Reconnaissance**
Sarah requests a keyword scan for "productivity" in the US market. Scout identifies 47 keywords with 3 high-opportunity signals. She selects "habit tracker" for deep Niche Analysis, receiving competitor clustering, sentiment breakdown, and trend prediction with a 6-month opportunity window.

**Scenario 3: Aha Moment — Goldmine Alert**
Alex receives a push notification: "High-value target detected. Confidence: 97%. Category: Pet Care. App: PetTracker Pro — 890K downloads, 1.8★, 78% negative sentiment." A market he never considered, now validated by data.

---

## Agent Architecture

### Agent Count Strategy

**Multi-Agent (4 agents)** — ODE covers a broad domain requiring distinct expertise areas: trend detection, market analysis, data operations, and strategic coordination. Each agent has clear responsibilities and workflows, forming a cohesive intelligence team.

### Agent Roster

| Agent | Name | Role | Memory |
|-------|------|------|--------|
| Trend Scout | Scout | Keyword discovery, market monitoring, trend detection | Yes |
| Market Analyst | Analyst | App analysis, opportunity scoring, niche detection, sentiment | Yes |
| Data Operative | Ops | Scraping operations, data integrity, deduplication, sync | No |
| Intel Officer | Chief | Team coordination, daily briefings, goldmine alerts | Yes |

### Agent Interaction Model

```
Scout (discovers) → Analyst (analyzes) → Chief (reports)
                          ↑
                    Ops (provides data)
```

- **Scout** monitors the market and identifies signals
- **Ops** ensures fresh, deduplicated data is available
- **Analyst** processes signals into actionable intelligence
- **Chief** synthesizes findings and delivers briefings/alerts

### Agent Communication Style

| Agent | Style |
|-------|-------|
| Scout | Short, alert-focused: "Signal acquired.", "Target in sight." |
| Analyst | Analytical, data-driven: "Assessment complete.", "Confidence level: high." |
| Ops | Technical, efficient: "Operation successful.", "Data secured." |
| Chief | Authoritative, strategic: "Good morning, Agent.", "Priority alpha." |

---

## Workflow Ecosystem

### Core Workflows (Essential)

| Workflow | Purpose | Agent |
|----------|---------|-------|
| **Keyword Discovery** | Automatically discover trending keywords from market data | Scout |
| **Opportunity Scan** | Scan apps and apply goldmine formula scoring | Analyst |
| **Daily Briefing** | Generate daily intelligence report with top findings | Chief |

### Feature Workflows (Specialized)

| Workflow | Purpose | Agent |
|----------|---------|-------|
| **Niche Analysis** | Deep dive analysis of a specific niche/category | Analyst |
| **Goldmine Alert** | Proactive alert when high-value target detected | Chief |
| **Sentiment Analysis** | Analyze app reviews for pain points and patterns | Analyst |
| **Competitor Clustering** | Group similar apps to identify market segments | Analyst |
| **Trend Prediction** | Forecast emerging trends and opportunity windows | Scout |

### Utility Workflows (Support)

| Workflow | Purpose | Agent |
|----------|---------|-------|
| **Data Crawl** | Execute iTunes API scraping operations | Ops |
| **Data Sync** | Synchronize, deduplicate, and clean data | Ops |
| **Team Status** | Overview of all operations and system health | Chief |

---

## Tools & Integrations

### MCP Tools

- **PostgreSQL connector** — App data storage and queries (existing)
- **Redis connector** — Caching for fast lookups (existing)
- **Celery scheduler** — Background task scheduling (existing)

### External Services

All external API calls route through existing proxy infrastructure (configured via .env):

| Service | Purpose |
|---------|---------|
| **iTunes Search API** | App data scraping |
| **Sentiment Analysis API** | Review analysis (OpenAI/AWS Comprehend) |
| **Google Trends API** | Keyword trend data |

**Proxy Requirement:** All external calls must use the existing proxy configuration for rate limit management and geo-specific routing.

### Integrations with Other Modules

None — ODE operates as a standalone module.

---

## Creative Features

### Personality & Theming

Intelligence Agency theme reflected in agent communication style only. Professional and functional — no casual elements.

### Easter Eggs & Delighters

None — keeping the module purely professional.

### Module Lore

None.

---

## Next Steps

1. **Review this brief** — Ensure the vision is clear
2. **Run create-module workflow** — Build the module structure
3. **Create agents** — Use create-agent workflow for each agent
4. **Create workflows** — Use create-workflow workflow for each workflow
5. **Test module** — Install and verify functionality

---

_Brief created on 2026-02-17 by Youri using the BMAD Module workflow_
