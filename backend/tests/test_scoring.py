"""
Tests for app.services.scoring — weighted rating calculations.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.scoring import (
    compute_weighted_score,
    get_global_mean_rating,
    recompute_all_scores,
)


class TestComputeWeightedScore:
    """Unit tests for the Bayesian weighted average formula."""

    def test_basic_calculation(self):
        # W = (v/(v+m)) * R + (m/(v+m)) * C
        # W = (500/(500+100)) * 1.5 + (100/(500+100)) * 3.0
        # W = (500/600) * 1.5 + (100/600) * 3.0
        # W = 0.8333 * 1.5 + 0.1667 * 3.0
        # W = 1.25 + 0.5 = 1.75
        result = compute_weighted_score(
            average_rating=1.5,
            rating_count=500,
            global_mean=3.0,
            min_ratings=100,
        )
        assert abs(result - 1.75) < 0.01

    def test_high_review_count_approaches_actual_rating(self):
        """With many reviews, weighted score should be close to actual rating."""
        result = compute_weighted_score(
            average_rating=1.0,
            rating_count=100_000,
            global_mean=3.5,
            min_ratings=100,
        )
        # v >> m, so result ≈ R = 1.0
        assert abs(result - 1.0) < 0.01

    def test_low_review_count_approaches_global_mean(self):
        """With few reviews, weighted score should be close to global mean."""
        result = compute_weighted_score(
            average_rating=1.0,
            rating_count=1,
            global_mean=3.5,
            min_ratings=100,
        )
        # v << m, so result ≈ C = 3.5
        assert abs(result - 3.5) < 0.1

    def test_zero_reviews_returns_global_mean(self):
        """Zero reviews should return exactly the global mean (v=0)."""
        result = compute_weighted_score(
            average_rating=1.0,
            rating_count=0,
            global_mean=3.5,
            min_ratings=100,
        )
        # (0/(0+100)) * 1.0 + (100/(0+100)) * 3.5 = 3.5
        assert result == 3.5

    def test_equal_review_and_threshold(self):
        """When v == m, result should be midpoint of R and C."""
        result = compute_weighted_score(
            average_rating=2.0,
            rating_count=100,
            global_mean=4.0,
            min_ratings=100,
        )
        # (100/200)*2.0 + (100/200)*4.0 = 1.0 + 2.0 = 3.0
        assert result == 3.0

    def test_perfect_rating(self):
        result = compute_weighted_score(
            average_rating=5.0,
            rating_count=1000,
            global_mean=3.0,
            min_ratings=100,
        )
        # (1000/1100)*5.0 + (100/1100)*3.0 ≈ 4.545 + 0.273 = 4.818
        assert 4.8 < result < 4.9

    def test_worst_possible_rating(self):
        result = compute_weighted_score(
            average_rating=1.0,
            rating_count=1000,
            global_mean=3.0,
            min_ratings=100,
        )
        # (1000/1100)*1.0 + (100/1100)*3.0 ≈ 0.909 + 0.273 = 1.182
        assert 1.1 < result < 1.2

    def test_different_min_ratings_threshold(self):
        """Higher threshold should pull score more toward global mean."""
        low_m = compute_weighted_score(1.5, 500, 3.0, min_ratings=50)
        high_m = compute_weighted_score(1.5, 500, 3.0, min_ratings=500)
        # With low m, closer to actual rating (1.5)
        # With high m, closer to global mean (3.0)
        assert low_m < high_m

    def test_symmetry_around_global_mean(self):
        """Apps equidistant from global mean should have symmetric weighted scores."""
        above = compute_weighted_score(4.0, 500, 3.0, 100)
        below = compute_weighted_score(2.0, 500, 3.0, 100)
        # Both should be equidistant from 3.0
        assert abs((above - 3.0) - (3.0 - below)) < 0.001

    def test_result_always_between_rating_and_mean(self):
        """Weighted score must always be between actual rating and global mean."""
        for r in [1.0, 1.5, 2.0, 3.0, 4.0, 5.0]:
            for v in [1, 10, 100, 1000, 10000]:
                result = compute_weighted_score(r, v, 3.0, 100)
                low = min(r, 3.0)
                high = max(r, 3.0)
                assert low <= result <= high, f"Failed for R={r}, v={v}: {result}"


class TestGetGlobalMeanRating:
    """Tests for the global mean calculation (requires DB)."""

    async def test_returns_default_when_no_data(self, db_session):
        """Should return 3.0 when database is empty."""
        result = await get_global_mean_rating(db_session, min_ratings=100)
        assert result == 3.0

    async def test_computes_mean_from_qualifying_apps(self, db_session, seeded_db):
        """Should compute mean only from apps with enough reviews."""
        # From seeded data: apps with rating_count >= 100 and average_rating is not None:
        #   - Terrible Game: 1.2 (5000 reviews)
        #   - Awful Business App: 1.5 (200 reviews)
        #   - Mediocre Game: 3.0 (10000 reviews)
        #   - Dutch App: 2.0 (300 reviews)
        # Mean = (1.2 + 1.5 + 3.0 + 2.0) / 4 = 1.925
        result = await get_global_mean_rating(db_session, min_ratings=100)
        assert abs(result - 1.925) < 0.01

    async def test_respects_min_ratings_threshold(self, db_session, seeded_db):
        """Higher threshold should exclude more apps."""
        # With min_ratings=1000, only apps with 1000+ reviews qualify:
        #   - Terrible Game: 1.2 (5000)
        #   - Mediocre Game: 3.0 (10000)
        # Mean = (1.2 + 3.0) / 2 = 2.1
        result = await get_global_mean_rating(db_session, min_ratings=1000)
        assert abs(result - 2.1) < 0.01


class TestRecomputeAllScores:
    """Tests for bulk score recomputation."""

    async def test_updates_scores(self, db_session, seeded_db):
        """Should update weighted_score for all qualifying apps."""
        updated = await recompute_all_scores(db_session, min_ratings=100)
        # 4 apps have average_rating IS NOT NULL and rating_count > 0
        assert updated == 4

    async def test_no_updates_on_empty_db(self, db_session):
        """Should return 0 when no apps exist."""
        updated = await recompute_all_scores(db_session, min_ratings=100)
        assert updated == 0
