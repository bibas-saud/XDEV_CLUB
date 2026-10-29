from datetime import datetime, timedelta, timezone
import uuid

import jwt
import pytest

from app.core.config import config
from app.core.security import (
    ALGORITHM,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.admin import Admin

pytestmark = pytest.mark.unit


def test_hash_password_returns_argon2id_hash():
    hashed = hash_password("SomePassword123!")
    assert hashed.startswith("$argon2id$")


def test_verify_password_round_trip():
    hashed = hash_password("SomePassword123!")
    assert verify_password("SomePassword123!", hashed) is True


def test_verify_password_wrong_password():
    hashed = hash_password("SomePassword123!")
    assert verify_password("WrongPassword!", hashed) is False


def test_verify_password_corrupt_hash():
    assert verify_password("SomePassword123!", "not-a-valid-hash") is False


def test_hash_password_is_salted():
    first = hash_password("SomePassword123!")
    second = hash_password("SomePassword123!")
    assert first != second


def test_create_access_token_claims():
    admin = Admin(
        id=uuid.uuid4(),
        full_name="Admin",
        email="a@example.com",
        password_hash="hash",
    )
    token = create_access_token(admin)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == str(admin.id)
    assert "role" not in payload
    assert "exp" in payload


def test_decode_access_token_returns_none_for_expired_token():
    expired_payload = {
        "sub": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
    }
    expired_token = jwt.encode(expired_payload, config.jwt_secret_key, algorithm=ALGORITHM)
    assert decode_access_token(expired_token) is None


def test_decode_access_token_returns_none_for_corrupt_token():
    assert decode_access_token("corrupt.jwt.token") is None

