"""
Tests for GET /api/v1/health endpoint.
"""

import pytest


class TestHealthEndpoint:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["database"] == "ok"
