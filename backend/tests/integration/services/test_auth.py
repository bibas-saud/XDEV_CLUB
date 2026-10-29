import pytest

from app.models.admin import Admin
from app.services.auth import authenticate_admin
from tests.conftest import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

pytestmark = pytest.mark.integration


def test_authenticate_admin_success(db_session, admin_user):
    admin = authenticate_admin(db_session, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
    assert admin is not None
    assert admin.id == admin_user.id
    assert admin.email == TEST_ADMIN_EMAIL


def test_authenticate_admin_case_insensitive_email(db_session, admin_user):
    uppercase_email = TEST_ADMIN_EMAIL.upper()
    admin = authenticate_admin(db_session, uppercase_email, TEST_ADMIN_PASSWORD)
    assert admin is not None
    assert admin.id == admin_user.id


def test_authenticate_admin_wrong_password(db_session, admin_user):
    assert (
        authenticate_admin(db_session, TEST_ADMIN_EMAIL, "WrongPassword!")
        is None
    )


def test_authenticate_admin_unknown_email(db_session, admin_user):
    assert (
        authenticate_admin(db_session, "nobody@example.com", TEST_ADMIN_PASSWORD)
        is None
    )


def test_members_cannot_authenticate(db_session, member_user):
    """Members have no credentials and are not even looked up in the admins table."""
    assert (
        authenticate_admin(
            db_session, "member@example.com", "whatever-password"
        )
        is None
    )
