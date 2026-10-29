import pytest
from pydantic import ValidationError

from app.core.config import Config

pytestmark = pytest.mark.unit


def test_config_rejects_empty_admin_password():
    with pytest.raises(ValidationError):
        Config(
            database_url="sqlite://",
            admin_name="admin",
            admin_email="a@example.com",
            admin_password="",
            jwt_secret_key="a_very_secret_key_that_is_32_bytes!",
        )


def test_config_rejects_short_jwt_secret_key():
    with pytest.raises(ValidationError):
        Config(
            database_url="sqlite://",
            admin_name="admin",
            admin_email="a@example.com",
            admin_password="ValidPassword123!",
            jwt_secret_key="too_short",
        )


def test_config_accepts_valid_parameters():
    c = Config(
        database_url="sqlite://",
        admin_name="admin",
        admin_email="a@example.com",
        admin_password="ValidPassword123!",
        jwt_secret_key="a_very_secret_key_that_is_32_bytes!",
        jwt_expires_minutes=1440,
        cors_origins=[],
    )
    assert c.admin_password == "ValidPassword123!"
    assert c.jwt_expires_minutes == 1440
    assert c.cors_origins == []
