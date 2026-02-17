"""
Tests for /api/v1/auth endpoints — register, login, refresh, logout, me.

Covers the full authentication lifecycle with various error cases.
"""

import pytest

from tests.conftest import create_test_user, auth_headers


class TestRegister:
    async def test_register_success(self, auth_client):
        resp = await auth_client.post("/api/v1/auth/register", json={
            "email": "new@example.com",
            "password": "securepass123",
            "full_name": "New User",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@example.com"
        assert data["plan"] == "free"
        assert "id" in data

    async def test_register_duplicate_email(self, auth_client):
        await auth_client.post("/api/v1/auth/register", json={
            "email": "dup@example.com",
            "password": "securepass123",
        })
        resp = await auth_client.post("/api/v1/auth/register", json={
            "email": "dup@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"]

    async def test_register_invalid_email(self, auth_client):
        resp = await auth_client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "securepass123",
        })
        assert resp.status_code == 422

    async def test_register_short_password(self, auth_client):
        resp = await auth_client.post("/api/v1/auth/register", json={
            "email": "short@example.com",
            "password": "abc",
        })
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, auth_client):
        await auth_client.post("/api/v1/auth/register", json={
            "email": "login@example.com",
            "password": "securepass123",
        })
        resp = await auth_client.post("/api/v1/auth/login", json={
            "email": "login@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    async def test_login_wrong_password(self, auth_client):
        await auth_client.post("/api/v1/auth/register", json={
            "email": "wrong@example.com",
            "password": "securepass123",
        })
        resp = await auth_client.post("/api/v1/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        assert "Invalid" in resp.json()["detail"]

    async def test_login_nonexistent_user(self, auth_client):
        resp = await auth_client.post("/api/v1/auth/login", json={
            "email": "nobody@example.com",
            "password": "somepassword",
        })
        assert resp.status_code == 401


class TestMe:
    async def test_get_me_authenticated(self, auth_client):
        tokens = await create_test_user(auth_client)
        resp = await auth_client.get(
            "/api/v1/auth/me",
            headers=auth_headers(tokens["access_token"]),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert data["role"] == "user"
        assert "plan" in data
        assert data["plan"]["name"] == "free"

    async def test_get_me_no_token(self, auth_client):
        resp = await auth_client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_update_profile(self, auth_client):
        tokens = await create_test_user(auth_client)
        resp = await auth_client.patch(
            "/api/v1/auth/me",
            headers=auth_headers(tokens["access_token"]),
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"


class TestPasswordChange:
    async def test_change_password(self, auth_client):
        tokens = await create_test_user(auth_client)
        resp = await auth_client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers(tokens["access_token"]),
            json={
                "current_password": "testpass123",
                "new_password": "newpassword123",
            },
        )
        assert resp.status_code == 200

        # Verify new password works
        login_resp = await auth_client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "newpassword123",
        })
        assert login_resp.status_code == 200

    async def test_change_password_wrong_current(self, auth_client):
        tokens = await create_test_user(auth_client)
        resp = await auth_client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers(tokens["access_token"]),
            json={
                "current_password": "wrongcurrent",
                "new_password": "newpassword123",
            },
        )
        assert resp.status_code == 400
        assert "incorrect" in resp.json()["detail"]


class TestRefreshAndLogout:
    async def test_refresh_token(self, auth_client):
        tokens = await create_test_user(auth_client)
        resp = await auth_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # Refreshed token should be a valid JWT
        assert len(data["access_token"]) > 0

    async def test_logout(self, auth_client):
        tokens = await create_test_user(auth_client)

        # Logout
        resp = await auth_client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert resp.status_code == 200

        # Refresh should now fail (token revoked)
        refresh_resp = await auth_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert refresh_resp.status_code == 401
