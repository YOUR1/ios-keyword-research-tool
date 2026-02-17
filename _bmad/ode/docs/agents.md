# Agents Reference

ODE includes 4 specialized agents forming an intelligence team:

---

## Trend Scout (Scout)

**Icon:** 🔍
**Memory:** Yes (tracks trends over time)

**Role:**
The eyes and ears of ODE. Scout continuously monitors the iOS app market, identifies trending keywords, and detects emerging signals before they peak.

**When to Use:**
- You want to discover new keywords automatically
- You need to understand current market trends
- You want predictions on emerging opportunities

**Key Capabilities:**
- Keyword discovery from market data
- Trend detection and monitoring
- Signal identification and reporting
- Historical trend comparison

**Menu Triggers:**

| Trigger | Command | Description |
|---------|---------|-------------|
| KD | Keyword Discovery | Discover trending keywords |
| TS | Trend Scan | Scan for market trends |
| MR | Market Report | Generate monitoring report |

---

## Market Analyst (Analyst)

**Icon:** 📊
**Memory:** Yes (remembers previous analyses)

**Role:**
The brain of ODE. Analyst transforms raw data into actionable intelligence, applying the goldmine formula and identifying where user demand exceeds supply.

**When to Use:**
- You want to analyze specific apps or niches
- You need opportunity scoring
- You want sentiment analysis of reviews
- You need competitor landscape mapping

**Key Capabilities:**
- Opportunity scoring (goldmine formula)
- Niche deep-dive analysis
- Sentiment analysis of reviews
- Competitor clustering
- Gap identification

**Menu Triggers:**

| Trigger | Command | Description |
|---------|---------|-------------|
| OS | Opportunity Scan | Scan apps with goldmine formula |
| NA | Niche Analysis | Deep dive into niche |
| SA | Sentiment Analysis | Analyze reviews |
| CC | Competitor Clustering | Map competitor landscape |

---

## Data Operative (Ops)

**Icon:** ⚙️
**Memory:** No (stateless operations)

**Role:**
The backbone of ODE. Ops handles all technical operations — scraping, data integrity, and synchronization — ensuring fresh, clean data flows through the system.

**When to Use:**
- You need to trigger a data crawl
- You want to clean/deduplicate data
- You need to check system status

**Key Capabilities:**
- iTunes API scraping (via proxy)
- Data deduplication
- Database synchronization
- Integrity checking
- Operation logging

**Menu Triggers:**

| Trigger | Command | Description |
|---------|---------|-------------|
| DC | Data Crawl | Execute API scraping |
| DS | Data Sync | Synchronize and deduplicate |
| ST | System Status | Check operational health |

---

## Intel Officer (Chief)

**Icon:** 🎖️
**Memory:** Yes (remembers preferences and history)

**Role:**
The commander of ODE. Chief oversees all operations, coordinates the team, and delivers the final intelligence products — briefings and alerts.

**When to Use:**
- You want your daily briefing
- You need an overview of all operations
- You want to configure alert settings
- You need a summary of recent findings

**Key Capabilities:**
- Daily intelligence briefings
- Goldmine alert delivery
- Team coordination
- Priority assessment
- User preference tracking

**Menu Triggers:**

| Trigger | Command | Description |
|---------|---------|-------------|
| DB | Daily Briefing | Generate daily report |
| GA | Goldmine Alert | Configure/review alerts |
| TS | Team Status | Overview of operations |
| PR | Priority Report | Generate priority findings |

---

## Agent Collaboration

The agents work together as a team:

```
Scout (discovers) → Analyst (analyzes) → Chief (reports)
                          ↑
                    Ops (provides data)
```

- **Scout** finds trending keywords and signals
- **Ops** ensures fresh data is available
- **Analyst** processes signals into opportunities
- **Chief** synthesizes everything into actionable briefings
