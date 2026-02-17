# Examples & Use Cases

This section provides practical examples for using ODE.

---

## Example 1: Finding a Product Opportunity

**Scenario:** You want to find a niche iOS app market where you could build a better product.

### Step 1: Get Your Daily Briefing

```
/daily-briefing
```

Chief reports:
> "Good morning, Agent. 3 high-value targets detected overnight.
> Top opportunity: Sleep Tracking — 450K downloads, 2.1★ average.
> Opportunity Score: 94/100. Recommend investigation."

### Step 2: Deep Dive into the Niche

```
/niche-analysis sleep tracking
```

Analyst reports:
> "Assessment complete. 8 apps analyzed in Sleep Tracking niche.
>
> **Competitor Clusters:**
> - Premium ($4.99+): 2 apps, avg 3.2★
> - Freemium: 4 apps, avg 2.3★
> - Free with ads: 2 apps, avg 1.8★
>
> **Top Pain Points:**
> 1. Battery drain (mentioned in 45% of 1★ reviews)
> 2. Inaccurate tracking (38%)
> 3. Crashes/bugs (27%)
>
> **Opportunity:** Battery-efficient, accurate sleep tracker in freemium segment."

### Step 3: Check the Trend

```
/trend-prediction sleep tracking
```

Scout reports:
> "Trend analysis complete. Confidence: high.
>
> Status: Rising
> Growth rate: +15% YoY
> Opportunity window: 8-12 months
>
> Recommendation: Strong entry opportunity."

---

## Example 2: Goldmine Alert in Action

**Scenario:** You receive a goldmine alert while working on something else.

### The Alert

> 🚨 **GOLDMINE ALERT — Chief**
>
> "High-value target detected. Confidence: 97%"
>
> **Category:** Pet Care
> **App:** PetTracker Pro
> **Downloads:** 890K
> **Rating:** 1.8★
> **Sentiment:** 78% negative
> **Top complaint:** "GPS tracking unreliable"
> **Competition:** Weak — no app above 3.5★
>
> **Recommendation:** IMMEDIATE INVESTIGATION

### Follow-Up

```
/niche-analysis pet tracking
```

You discover the entire pet tracking niche has poor solutions, with users desperately wanting reliable GPS tracking for their pets.

---

## Example 3: Monitoring a Specific Market

**Scenario:** You're interested in the fitness app market and want to monitor it continuously.

### Step 1: Configure Target Keywords

Work with Scout to track specific keywords:
- "workout tracker"
- "fitness planner"
- "exercise app"
- "gym companion"

### Step 2: Set Up Automated Monitoring

Configure in `module.yaml`:
- `crawl_schedule: daily`
- `alert_threshold: 85`

### Step 3: Review Weekly

Each day, check your briefing for:
- New trending keywords in fitness
- Apps with declining ratings (opportunity emerging)
- Trend predictions for the category

---

## Common Scenarios

### "I have an app idea — is the market good?"

1. Run `/opportunity-scan [your category]`
2. Check the opportunity score for similar apps
3. Run `/sentiment-analysis` on top competitors
4. Review `/trend-prediction` for timing

### "What's hot right now?"

1. Get `/daily-briefing`
2. Review Scout's trending keywords
3. Check high-opportunity niches
4. Look at trend predictions for "Rising" categories

### "Why do users hate this app?"

1. Run `/sentiment-analysis [app name or category]`
2. Review top pain points
3. Check sample quotes for specific complaints
4. Map pain points to product opportunities

---

## Tips & Tricks

### Optimize Your Alerts

Set your `alert_threshold` based on your risk tolerance:
- **95+**: Only the most confident opportunities (fewer alerts)
- **90**: Balanced (default)
- **85**: More opportunities, some may be less certain

### Use Proxy Wisely

All external API calls use your proxy configuration. If you're getting rate limited:
- Check proxy pool health
- Consider reducing crawl frequency
- Focus crawls on specific categories

### Export Reports

All reports are saved to `{reports_folder}`:
- Daily briefings: `briefings/`
- Niche analyses: `analyses/`
- Alerts: `alerts/`

Share these with your team or save for reference.

---

## Troubleshooting

### "No new keywords discovered"

**Check:**
1. Is data-crawl running? (`/team-status`)
2. Is proxy configured in `.env`?
3. Are target countries set correctly?

### "Opportunity scores seem off"

**Check:**
1. Is data fresh? When was last crawl?
2. Are enough apps in the database?
3. Review goldmine formula parameters

### "Alerts not triggering"

**Check:**
1. What's your `alert_threshold`?
2. Are opportunity scans running?
3. Check `/team-status` for errors

### "Sentiment analysis failing"

**Check:**
1. Is Sentiment API configured?
2. Is proxy working for external APIs?
3. Are there reviews to analyze?

---

## Getting More Help

- Review the main BMAD documentation
- Check module configuration in `module.yaml`
- Verify proxy configuration in `.env`
- Run `/team-status` to check system health
