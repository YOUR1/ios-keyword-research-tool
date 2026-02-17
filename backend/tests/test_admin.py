"""
Tests for /api/v1/admin endpoints — admin-only user management and stats.

Creates admin users by directly modifying the role in the database after
standard registration.
"""

import pytest

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from tests.conftest import create_test_user, auth_headers


async def _create_admin_user(auth_client, db_session, email="admin@example.com"):
    """Helper: register a user and promote to admin directly in DB."""
    tokens = await create_test_user(
        auth_client, email=email, password="adminpass123", full_name="Admin User",
    )

    # Promote to admin
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = "admin"
    await db_session.flush()

    # Re-login to get a token with the admin role
    login_resp = await auth_client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "adminpass123",
    })
    tokens = login_resp.json()

    return tokens, auth_headers(tokens["access_token"])


class TestAdminListUsers:
    async def test_admin_list_users(self, auth_client, db_session):
        admin_tokens, admin_headers = await _create_admin_user(
            auth_client, db_session,
        )

        # Create a few regular users
        await create_test_user(auth_client, email="user1@example.com", password="password123")
        await create_test_user(auth_client, email="user2@example.com", password="password123")

        resp = await auth_client.get("/api/v1/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 3  # admin + 2 users
        assert len(data["items"]) >= 3
        assert "page" in data
        assert "total_pages" in data

        # Verify user structure
        user_item = data["items"][0]
        assert "email" in user_item
        assert "role" in user_item
        assert "plan" in user_item

    async def test_non_admin_forbidden(self, auth_client, db_session):
        tokens = await create_test_user(
            auth_client, email="regular@example.com", password="password123",
        )
        headers = auth_headers(tokens["access_token"])

        resp = await auth_client.get("/api/v1/admin/users", headers=headers)
        assert resp.status_code == 403
        assert "admin" in resp.json()["detail"].lower()


class TestAdminUpdateUser:
    async def test_admin_update_user(self, auth_client, db_session):
        admin_tokens, admin_headers = await _create_admin_user(
            auth_client, db_session, email="admin2@example.com",
        )

        # Create a regular user
        user_tokens = await create_test_user(
            auth_client, email="target@example.com", password="password123",
        )

        # Get the user's ID
        result = await db_session.execute(
            select(User).where(User.email == "target@example.com")
        )
        target_user = result.scalar_one()

        # Admin changes the user's plan to starter (plan_id=2)
        resp = await auth_client.patch(
            f"/api/v1/admin/users/{target_user.id}",
            headers=admin_headers,
            json={"plan_id": 2, "role": "admin"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan"]["name"] == "starter"
        assert data["role"] == "admin"


class TestAdminStats:
    async def test_admin_stats(self, auth_client, db_session):
        admin_tokens, admin_headers = await _create_admin_user(
            auth_client, db_session, email="admin3@example.com",
        )

        resp = await auth_client.get("/api/v1/admin/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_users" in data
        assert "total_keywords" in data
        assert "total_crawl_jobs" in data
        assert "total_apps" in data
        assert data["total_users"] >= 1  # at least the admin
        assert data["total_apps"] >= 5  # seeded apps
