# TODO: ODE - Opportunity Discovery Engine

Development roadmap for ode module.

---

## Agents to Build

- [x] **Scout** (Trend Scout) ✅
  - Built: `agents/scout.agent.yaml`
  - Sidecar: `ode-scout`

- [x] **Analyst** (Market Analyst) ✅
  - Built: `agents/analyst.agent.yaml`
  - Sidecar: `ode-analyst`

- [x] **Ops** (Data Operative) ✅
  - Built: `agents/ops.agent.yaml`
  - No sidecar (stateless)

- [x] **Chief** (Intel Officer) ✅
  - Built: `agents/chief.agent.yaml`
  - Sidecar: `ode-chief`

---

## Workflows to Build

### Core Workflows

- [x] **keyword-discovery** ✅
  - Built: `workflows/keyword-discovery/workflow.md`

- [x] **opportunity-scan** ✅
  - Built: `workflows/opportunity-scan/workflow.md`

- [x] **daily-briefing** ✅
  - Built: `workflows/daily-briefing/workflow.md`

### Feature Workflows

- [x] **niche-analysis** ✅
  - Built: `workflows/niche-analysis/workflow.md`

- [x] **goldmine-alert** ✅
  - Built: `workflows/goldmine-alert/workflow.md`

- [x] **sentiment-analysis** ✅
  - Built: `workflows/sentiment-analysis/workflow.md`

- [x] **competitor-clustering** ✅
  - Built: `workflows/competitor-clustering/workflow.md`

- [x] **trend-prediction** ✅
  - Built: `workflows/trend-prediction/workflow.md`

### Utility Workflows

- [x] **data-crawl** ✅
  - Built: `workflows/data-crawl/workflow.md`

- [x] **data-sync** ✅
  - Built: `workflows/data-sync/workflow.md`

- [x] **team-status** ✅
  - Built: `workflows/team-status/workflow.md`

---

## Backend Integration

- [ ] Integrate with existing iTunes API client (`backend/app/services/itunes.py`)
- [ ] Add proxy support to all external API calls
- [ ] Create keyword discovery service
- [ ] Implement goldmine scoring algorithm
- [ ] Add sentiment analysis integration
- [ ] Add Google Trends API integration

---

## Database Updates

- [ ] Add keywords table for trending keyword storage
- [ ] Add opportunity_scores table
- [ ] Add alerts table for goldmine alerts history
- [ ] Update existing app queries for ODE requirements

---

## Installation Testing

- [ ] Test installation with `bmad install`
- [ ] Verify module.yaml prompts work correctly
- [ ] Verify all agents and workflows are discoverable

---

## Documentation

- [ ] Complete README.md with usage examples
- [ ] Enhance docs/ folder with more guides
- [ ] Add troubleshooting section
- [ ] Document configuration options

---

## Next Steps

1. Build agents using create-agent workflow
2. Build workflows using create-workflow workflow
3. Integrate with existing backend services
4. Test installation and functionality
5. Iterate based on testing

---

_Last updated: 2026-02-17 (agents + workflows completed)_
