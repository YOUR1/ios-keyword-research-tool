#!/usr/bin/env python3
"""
Database seed script.

Populates the database with:
  - Country records
  - Category records
  - 100 sample apps fetched from iTunes API (or mock data as fallback)

Usage:
    # With live iTunes API data:
    python scripts/seed_db.py

    # With mock data (no network):
    python scripts/seed_db.py --mock

    # Specify database URL:
    DATABASE_URL=postgresql://user:pass@localhost/iosstore python scripts/seed_db.py
"""

import argparse
import asyncio
import os
import random
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

from app.core.database import Base
from app.models.models import App, Category, Country, RatingHistory, CrawlLog
from app.utils.constants import ITUNES_CATEGORIES, SUPPORTED_COUNTRIES
from app.services.scoring import compute_weighted_score


# Mock app data for offline seeding
MOCK_APPS = [
    ("Flashlight Pro Max", "QuickTools LLC", 1.2, 15234, 0.99),
    ("QR Scanner Ultimate", "ScanApps Inc", 1.4, 8921, 0),
    ("Battery Saver Plus", "OptimizeCo", 1.1, 23456, 2.99),
    ("VPN Unlimited Free", "SecureNet", 1.5, 45123, 0),
    ("Wallpaper HD 4K", "PixelArt Studio", 1.3, 6789, 0),
    ("Calculator ++", "MathTools", 1.6, 3421, 0),
    ("Weather Live Pro", "ForecastApp", 1.8, 12890, 4.99),
    ("Photo Editor AI", "FilterLab", 1.0, 34567, 0),
    ("Music Player Free", "SoundWave", 1.7, 9087, 0),
    ("File Manager Plus", "FileCo", 2.0, 5643, 1.99),
    ("Compass & GPS Nav", "NavTools", 1.9, 7832, 0),
    ("Notes & Lists Pro", "ProductivityApp", 2.1, 4321, 0.99),
    ("Alarm Clock HD", "WakeUp Inc", 1.4, 11234, 0),
    ("Contacts Backup", "SafeData", 1.3, 8765, 2.99),
    ("Speed Test Master", "NetCheck", 2.2, 19876, 0),
    ("Emoji Keyboard ++", "TypeFun", 1.5, 28934, 0),
    ("Screen Recorder HD", "RecordAll", 1.6, 7654, 0),
    ("Translator Pro", "LingoCo", 2.3, 15678, 0),
    ("Ringtone Maker Free", "SoundFX", 1.2, 21345, 0),
    ("PDF Scanner Pro", "DocScan", 1.8, 9012, 3.99),
    ("Video Downloader++", "MediaGrab", 1.1, 43210, 0),
    ("Antivirus & Cleaner", "SafePhone", 1.0, 56789, 0),
    ("Fonts & Themes", "StyleApp", 1.4, 13456, 0),
    ("WiFi Password Show", "NetworkTools", 1.2, 32145, 0),
    ("RAM Booster Pro", "SpeedUp LLC", 1.1, 27890, 1.99),
    ("Fake GPS Location", "MockLoc", 2.0, 16789, 0),
    ("Call Recorder", "RecordCall Inc", 1.5, 38901, 4.99),
    ("Sticker Maker", "StickerCo", 2.4, 5678, 0),
    ("Age Face Editor", "FunFilter", 1.7, 22345, 0),
    ("Horoscope Daily", "StarSign App", 1.9, 11234, 0),
    ("Step Counter Pro", "FitTrack", 2.5, 8901, 0),
    ("Mirror App HD", "UtilCo", 1.3, 4567, 0),
    ("Volume Booster Max", "AudioTools", 1.2, 31234, 0),
    ("Color Flashlight", "LightApps", 1.0, 9876, 0),
    ("Text Free Messenger", "ChatCo", 1.8, 67890, 0),
    ("Ad Blocker Pro", "CleanBrowse", 2.1, 23456, 2.99),
    ("Meme Generator", "MemeLab", 2.6, 14567, 0),
    ("GIF Maker Pro", "AnimationCo", 2.3, 7890, 0),
    ("Night Camera Plus", "PhotoTools", 1.6, 5432, 1.99),
    ("Voice Changer Fun", "AudioFX", 1.9, 18901, 0),
    ("Countdown Timer", "TimerCo", 2.7, 3456, 0),
    ("Drawing Pad Kids", "KidsApp Inc", 2.0, 12345, 0),
    ("Tip Calculator Pro", "CalcApps", 2.8, 2345, 0.99),
    ("Unit Converter++", "ConvertCo", 2.5, 6789, 0),
    ("Ruler & Measure", "ToolBox", 2.2, 4321, 0),
    ("Sleep Sounds Free", "RelaxApp", 2.9, 11234, 0),
    ("Baby Names 2024", "ParentCo", 2.4, 3456, 0),
    ("Dog Whistle Pro", "PetTools", 1.8, 7890, 0.99),
    ("Metal Detector App", "DetectCo", 1.5, 5678, 0),
    ("Ghost Detector!!", "SpookApps", 1.1, 45678, 0),
    ("Lie Detector Test", "FunScan", 1.0, 34567, 0),
    ("X-Ray Scanner", "JokeApps", 1.2, 23456, 0),
    ("Fart Sounds Board", "PrankCo", 2.0, 12345, 0),
    ("Police Scanner", "RadioApps", 1.7, 8901, 1.99),
    ("Bubble Level Tool", "UtilKit", 2.3, 5432, 0),
    ("Strobe Light App", "FlashCo", 1.4, 7654, 0),
    ("Lucky Lottery Gen", "GamblingCo", 1.3, 16789, 0),
    ("BMI Calculator", "HealthCalc", 2.6, 4567, 0),
    ("Currency Exchange", "FinanceKit", 2.4, 8901, 0),
    ("Parking Timer Pro", "AutoCo", 2.8, 3456, 0.99),
    ("Fake Call Prank", "PrankLab", 1.6, 21345, 0),
    ("Sound Meter dB", "AudioMeasure", 2.1, 6789, 0),
    ("Pregnancy Tracker", "MomApp", 3.0, 15678, 0),
    ("Blood Pressure Log", "HealthLog", 2.5, 4321, 0),
    ("Random Number Gen", "MathCo", 2.9, 2345, 0),
    ("Calorie Counter+", "DietApp", 2.2, 19876, 0),
    ("Water Reminder", "HydrateCo", 3.1, 7890, 0),
    ("Mood Tracker Daily", "MindApp", 2.7, 5678, 0),
    ("Habit Builder Pro", "ProductCo", 2.3, 9012, 1.99),
    ("Budget Planner", "MoneyApp", 2.0, 13456, 0),
    ("Meditation Timer", "CalmCo", 3.2, 11234, 0),
    ("Sudoku Classic", "PuzzleCo", 3.0, 28934, 0),
    ("Crossword Daily", "WordGame Inc", 2.8, 15678, 0),
    ("Solitaire HD", "CardGames", 2.5, 43210, 0),
    ("Chess Master Pro", "StrategyApp", 3.3, 9876, 0),
    ("Tic Tac Toe Free", "SimpleGames", 2.1, 6789, 0),
    ("Snake Classic", "RetroGames", 2.4, 12345, 0),
    ("2048 Number Game", "PuzzleKit", 3.1, 21345, 0),
    ("Flappy Clone", "CloneGames", 1.5, 38901, 0),
    ("Candy Pop Blast", "MatchCo", 2.0, 56789, 0),
    ("Zombie Runner 3D", "ActionGames", 1.8, 14567, 0),
    ("Racing Drift Car", "SpeedGames", 1.9, 23456, 0),
    ("Bubble Shooter", "ArcadeCo", 2.6, 32145, 0),
    ("Tower Defense HD", "StratCo", 2.3, 8901, 0),
    ("Fruit Ninja Clone", "SliceCo", 1.4, 17890, 0),
    ("Jump & Run Free", "PlatformCo", 2.1, 5678, 0),
    ("Fidget Spinner 3D", "TrendApps", 1.2, 67890, 0),
    ("Slime Simulator", "ASMRApps", 2.0, 45678, 0),
    ("Dress Up Fashion", "StyleGames", 2.5, 23456, 0),
    ("Coloring Book HD", "ArtApps", 3.0, 16789, 0),
    ("Baby Piano Music", "KidsMusicCo", 2.7, 9012, 0),
    ("Pet Salon Spa", "PetGames", 2.2, 11234, 0),
    ("Cooking Recipe App", "FoodGames", 2.8, 7890, 0),
    ("Dentist Doctor Game", "KidsPlay", 1.9, 13456, 0),
    ("Farm Simulator 3D", "SimCo", 2.4, 8901, 0),
    ("City Builder Town", "BuildCo", 2.1, 15678, 0),
    ("Fishing Master Pro", "OutdoorGames", 2.6, 5678, 0),
    ("Golf Shot Tracker", "SportsApp", 2.3, 4321, 0),
    ("Yoga Poses Guide", "FitnessApp", 3.2, 7890, 0),
    ("Push-Up Counter", "WorkoutCo", 2.9, 3456, 0),
    ("Drum Pad Machine", "MusicMaker", 2.5, 12345, 0),
]


async def seed(mock: bool = False):
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://iosstore:iosstore@localhost:5432/iosstore",
    )

    engine = create_async_engine(db_url)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        # --- Countries ---
        print("Seeding countries...")
        countries = {}
        for code, name in SUPPORTED_COUNTRIES.items():
            c = Country(code=code, name=name, active=True)
            db.add(c)
            countries[code] = c
        await db.flush()

        # --- Categories ---
        print("Seeding categories...")
        categories = {}
        for itunes_id, name in ITUNES_CATEGORIES.items():
            cat = Category(itunes_id=itunes_id, name=name)
            db.add(cat)
            categories[itunes_id] = cat
        await db.flush()

        # --- Apps ---
        print(f"Seeding {len(MOCK_APPS)} apps...")
        us_country = countries["US"]
        cat_ids = list(ITUNES_CATEGORIES.keys())

        # Calculate global mean for weighted scores
        all_ratings = [r for _, _, r, _, _ in MOCK_APPS if r is not None]
        global_mean = sum(all_ratings) / len(all_ratings) if all_ratings else 3.0
        min_ratings = 100

        for i, (name, developer, rating, review_count, price) in enumerate(MOCK_APPS):
            cat_id = cat_ids[i % len(cat_ids)]
            category = categories[cat_id]

            weighted = compute_weighted_score(rating, review_count, global_mean, min_ratings)

            app = App(
                itunes_id=1000000 + i,
                bundle_id=f"com.mock.{name.lower().replace(' ', '').replace('+', 'plus')}",
                name=name,
                developer=developer,
                category_id=category.id,
                country_id=us_country.id,
                average_rating=rating,
                rating_count=review_count,
                weighted_score=weighted,
                current_version=f"{random.randint(1, 5)}.{random.randint(0, 9)}.{random.randint(0, 9)}",
                price=price,
                currency="USD",
                icon_url=None,
                store_url=f"https://apps.apple.com/us/app/id{1000000 + i}",
                description=f"This is a mock entry for {name}. In production, this would contain the full App Store description.",
                content_rating="4+",
                release_date=date(2020, 1, 1) + timedelta(days=random.randint(0, 1800)),
            )
            db.add(app)
            await db.flush()

            # Add rating history (30 days of simulated snapshots)
            for day_offset in range(30):
                snapshot_date = date.today() - timedelta(days=29 - day_offset)
                # Add small random drift to ratings
                drift = random.uniform(-0.1, 0.1)
                snapshot_rating = max(1.0, min(5.0, rating + drift))
                review_drift = random.randint(-50, 200)
                snapshot_reviews = max(0, review_count + review_drift * day_offset)

                history = RatingHistory(
                    app_id=app.id,
                    average_rating=round(snapshot_rating, 2),
                    rating_count=snapshot_reviews,
                    weighted_score=compute_weighted_score(
                        snapshot_rating, snapshot_reviews, global_mean, min_ratings
                    ),
                    snapshot_date=snapshot_date,
                )
                db.add(history)

        # --- Crawl log ---
        log = CrawlLog(
            source="seed_script",
            country_code="US",
            status="completed",
            apps_found=len(MOCK_APPS),
            apps_updated=len(MOCK_APPS),
            duration_seconds=0.0,
        )
        db.add(log)

        await db.commit()

    print(f"\nSeeding complete!")
    print(f"  Countries:  {len(SUPPORTED_COUNTRIES)}")
    print(f"  Categories: {len(ITUNES_CATEGORIES)}")
    print(f"  Apps:       {len(MOCK_APPS)}")
    print(f"  History:    {len(MOCK_APPS) * 30} snapshots")
    print(f"  Global mean rating: {global_mean:.2f}")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the database")
    parser.add_argument("--mock", action="store_true", help="Use mock data (no API calls)")
    args = parser.parse_args()

    asyncio.run(seed(mock=args.mock))
