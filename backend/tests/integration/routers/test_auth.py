from datetime import datetime, timedelta, timezone
import uuid

import jwt
import pytest

from app.core.config import config
from app.core.security import COOKIE_NAME, create_access_token
from app.models.admin import Admin
from tests.conftest import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

pytestmark = pytest.mark.integration


def test_login_success(client, admin_user):
    response = client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(admin_user.id),
        "email": TEST_ADMIN_EMAIL,
        "full_name": admin_user.full_name,
    }
    set_cookie = response.headers["set-cookie"]
    assert f"{COOKIE_NAME}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()
    assert "path=/" in set_cookie.lower()


def test_login_invalid_email_format(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "not-a-valid-email", "password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 422


def test_login_wrong_password(client, admin_user):
    response = client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}


def test_login_unknown_email(client, admin_user):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 401


def test_me_with_valid_session_cookie(authenticated_client, admin_user):
    response = authenticated_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == TEST_ADMIN_EMAIL


def test_me_without_cookie(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_me_with_expired_token(client):
    expired = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        },
        config.jwt_secret_key,
        algorithm="HS256",
    )
    client.cookies.set(COOKIE_NAME, expired)
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_forged_token(client):
    client.cookies.set(COOKIE_NAME, "forged.token.payload")
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_valid_token_for_missing_admin(client):
    ghost = Admin(
        id=uuid.uuid4(),
        full_name="Ghost Admin",
        email="ghost@example.com",
        password_hash="x",
    )
    token = create_access_token(ghost)
    client.cookies.set(COOKIE_NAME, token)

    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(authenticated_client):
    logout_res = authenticated_client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json() == {"message": "logged out"}

    me_res = authenticated_client.get("/api/auth/me")
    assert me_res.status_code == 401

