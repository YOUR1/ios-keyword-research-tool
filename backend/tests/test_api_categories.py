"""
Tests for /api/v1/categories endpoints.
"""

import pytest


class TestListCategories:
    async def test_returns_empty_when_no_data(self, client):
        resp = await client.get("/api/v1/categories")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_seeded_categories(self, seeded_client):
        resp = await seeded_client.get("/api/v1/categories")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        names = {c["name"] for c in data}
        assert "Games" in names
        assert "Business" in names

    async def test_categories_have_correct_fields(self, seeded_client):
        resp = await seeded_client.get("/api/v1/categories")
        data = resp.json()
        for cat in data:
            assert "id" in cat
            assert "itunes_id" in cat
            assert "name" in cat


class TestListCountries:
    async def test_returns_empty_when_no_data(self, client):
        resp = await client.get("/api/v1/categories/countries")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_seeded_countries(self, seeded_client):
        resp = await seeded_client.get("/api/v1/categories/countries")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        codes = {c["code"] for c in data}
        assert "US" in codes
        assert "NL" in codes

    async def test_countries_have_correct_fields(self, seeded_client):
        resp = await seeded_client.get("/api/v1/categories/countries")
        data = resp.json()
        for country in data:
            assert "id" in country
            assert "code" in country
            assert "name" in country
