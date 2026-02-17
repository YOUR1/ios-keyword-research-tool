#!/usr/bin/env python3
"""
Simulate crawling 100 apps from the iTunes Search API.

This script actually calls Apple's public iTunes Search API (no auth needed)
and prints parsed results. Use it to verify the data pipeline works.

Usage:
    python scripts/simulate_crawl.py
    python scripts/simulate_crawl.py --country NL --limit 50
"""

import argparse
import asyncio
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"

# Sample search terms to get variety
SAMPLE_TERMS = [
    "photo", "weather", "fitness", "game", "music",
    "finance", "travel", "food", "news", "social",
]


async def search_itunes(
    client: httpx.AsyncClient,
    term: str,
    country: str = "US",
    limit: int = 10,
) -> list[dict]:
    """Search iTunes and return raw results."""
    params = {
        "term": term,
        "country": country,
        "media": "software",
        "entity": "software",
        "limit": limit,
    }
    response = await client.get(ITUNES_SEARCH_URL, params=params)
    response.raise_for_status()
    data = response.json()
    return data.get("results", [])


def parse_app(raw: dict) -> dict:
    """Parse relevant fields from iTunes response."""
    return {
        "itunes_id": raw.get("trackId"),
        "name": raw.get("trackName", "Unknown"),
        "developer": raw.get("artistName"),
        "category": raw.get("primaryGenreName"),
        "average_rating": raw.get("averageUserRating"),
        "rating_count": raw.get("userRatingCount", 0),
        "version": raw.get("version"),
        "price": raw.get("price", 0),
        "currency": raw.get("currency", "USD"),
        "icon_url": raw.get("artworkUrl100"),
        "bundle_id": raw.get("bundleId"),
        "content_rating": raw.get("contentAdvisoryRating"),
    }


async def main(country: str, limit: int):
    print(f"\n{'='*70}")
    print(f"  iTunes Search API Crawl Simulation")
    print(f"  Country: {country} | Target: ~{limit} apps")
    print(f"{'='*70}\n")

    apps_seen = set()
    all_apps = []
    per_term = max(limit // len(SAMPLE_TERMS), 10)

    async with httpx.AsyncClient(timeout=30.0) as client:
        for term in SAMPLE_TERMS:
            if len(all_apps) >= limit:
                break

            print(f"  Searching: '{term}' ...", end=" ")
            try:
                results = await search_itunes(client, term, country, per_term)
                new_count = 0

                for raw in results:
                    itunes_id = raw.get("trackId")
                    if itunes_id and itunes_id not in apps_seen:
                        apps_seen.add(itunes_id)
                        parsed = parse_app(raw)
                        all_apps.append(parsed)
                        new_count += 1

                print(f"found {len(results)} results, {new_count} new")

                # Be nice to Apple's servers
                await asyncio.sleep(3)

            except Exception as e:
                print(f"ERROR: {e}")

    print(f"\n{'='*70}")
    print(f"  Total unique apps collected: {len(all_apps)}")
    print(f"{'='*70}\n")

    # Show stats
    rated_apps = [a for a in all_apps if a["average_rating"] is not None]
    if rated_apps:
        avg_rating = sum(a["average_rating"] for a in rated_apps) / len(rated_apps)
        avg_reviews = sum(a["rating_count"] for a in rated_apps) / len(rated_apps)
        worst = min(rated_apps, key=lambda a: a["average_rating"])
        best = max(rated_apps, key=lambda a: a["average_rating"])

        print(f"  Apps with ratings: {len(rated_apps)}")
        print(f"  Average rating:    {avg_rating:.2f}")
        print(f"  Average reviews:   {avg_reviews:.0f}")
        print(f"  Worst rated:       {worst['name']} ({worst['average_rating']:.1f} stars, {worst['rating_count']} reviews)")
        print(f"  Best rated:        {best['name']} ({best['average_rating']:.1f} stars, {best['rating_count']} reviews)")
    else:
        print("  No rated apps found.")

    # Print bottom 10
    bottom_10 = sorted(
        [a for a in rated_apps if a["rating_count"] >= 10],
        key=lambda a: a["average_rating"],
    )[:10]

    if bottom_10:
        print(f"\n  {'─'*60}")
        print(f"  BOTTOM 10 (min 10 reviews):")
        print(f"  {'─'*60}")
        for i, app in enumerate(bottom_10, 1):
            print(
                f"  {i:>2}. {app['name'][:40]:<40} "
                f"⭐ {app['average_rating']:.1f}  "
                f"({app['rating_count']:>6} reviews)"
            )

    # Save raw data
    output_file = f"crawl_sample_{country.lower()}.json"
    with open(output_file, "w") as f:
        json.dump(all_apps, f, indent=2)
    print(f"\n  Raw data saved to: {output_file}")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate iTunes API crawl")
    parser.add_argument("--country", default="US", help="Country code (default: US)")
    parser.add_argument("--limit", type=int, default=100, help="Target number of apps")
    args = parser.parse_args()

    asyncio.run(main(args.country, args.limit))
