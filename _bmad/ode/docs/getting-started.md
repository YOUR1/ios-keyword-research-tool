# Getting Started with ODE

Welcome to ODE (Opportunity Discovery Engine)! This guide will help you get up and running.

---

## What This Module Does

ODE transforms passive app research into active opportunity hunting. The system automatically:

- **Discovers trending keywords** without manual input
- **Scans the iOS app market** for opportunities using the goldmine formula
- **Alerts you proactively** when high-value targets are detected
- **Provides daily briefings** with actionable intelligence

The core insight: **Apps with high downloads + poor ratings = unmet market demand = your opportunity.**

---

## Installation

If you haven't installed the module yet:

```bash
bmad install ode
```

Follow the prompts to configure:
- Alert threshold (default: 90% confidence)
- Target countries (default: US, NL)
- Crawl schedule (default: daily)
- Reports folder location

---

## First Steps

### 1. Meet Your Team

ODE has 4 specialized agents:

| Agent | What They Do |
|-------|--------------|
| **Chief** | Your main contact. Delivers briefings and alerts. |
| **Scout** | Monitors trends and discovers keywords. |
| **Analyst** | Deep analysis of opportunities and niches. |
| **Ops** | Handles data operations behind the scenes. |

### 2. Get Your First Briefing

Start by asking Chief for a daily briefing:

```
/daily-briefing
```

This gives you:
- New trending keywords discovered
- Top opportunities detected
- System status
- Recommended actions

### 3. Explore an Opportunity

When you see an interesting niche, ask Analyst to dig deeper:

```
/niche-analysis [category or keyword]
```

You'll get:
- Competitor mapping
- Sentiment breakdown
- Trend projection
- Opportunity assessment

---

## Common Use Cases

### Finding Your Next Product Idea

1. Check the daily briefing for high-scoring opportunities
2. Look for niches where apps have 100K+ downloads but < 3★ ratings
3. Run sentiment analysis to understand user pain points
4. Use competitor clustering to find market gaps

### Monitoring a Specific Market

1. Configure target countries in module settings
2. Set up keyword tracking for your domain
3. Review trend predictions for timing
4. Wait for goldmine alerts

### Validating an Existing Idea

1. Run niche analysis on your target category
2. Review competitor landscape
3. Check sentiment for unmet needs
4. Assess opportunity score

---

## What's Next?

- Check out the [Agents Reference](agents.md) to meet your team
- Browse the [Workflows Reference](workflows.md) to see what you can do
- See [Examples](examples.md) for real-world usage

---

## Need Help?

If you run into issues:
1. Check the troubleshooting section in examples.md
2. Review your module configuration in `module.yaml`
3. Verify proxy configuration in `.env`
4. Check that all external APIs are accessible
