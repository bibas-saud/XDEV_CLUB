import uuid
from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models.admin import Admin
from app.models.member import Member
from app.schemas.admin import AdminOut
from app.schemas.auth import LoginRequest
from app.schemas.member import (
    MemberCreate,
    MemberDetail,
    MemberOut,
    MemberUpdate,
)

pytestmark = pytest.mark.unit


def test_login_request_valid():
    req = LoginRequest(email="admin@example.com", password="Password123!")
    assert req.email == "admin@example.com"
    assert req.password == "Password123!"


def test_login_request_rejects_invalid_email():
    with pytest.raises(ValidationError):
        LoginRequest(email="not-an-email", password="Password123!")


def test_login_request_rejects_missing_fields():
    with pytest.raises(ValidationError):
        LoginRequest(email="admin@example.com")


def test_admin_out_from_orm_model():
    admin_id = uuid.uuid4()
    admin = Admin(
        id=admin_id,
        full_name="Alice Admin",
        email="alice@example.com",
        password_hash="secret_hash",
    )
    admin_out = AdminOut.model_validate(admin)
    assert admin_out.id == admin_id
    assert admin_out.email == "alice@example.com"
    assert admin_out.full_name == "Alice Admin"
    assert not hasattr(admin_out, "password_hash")


def test_member_detail_from_orm_model():
    member_id = uuid.uuid4()
    member = Member(
        id=member_id,
        full_name="Bob Member",
        email="bob@example.com",
        joined_at=datetime(2026, 1, 8),
        role="member",
    )
    detail = MemberDetail.model_validate(member)
    assert isinstance(detail, MemberOut)
    assert detail.id == member_id
    assert detail.full_name == "Bob Member"
    assert detail.is_active is True
    assert detail.role == "member"


def test_member_create_has_no_password_or_role_field():
    data = MemberCreate(full_name="New", email="new@example.com")
    assert not hasattr(data, "password")
    assert data.role == "member"


def test_member_create_accepts_valid_roles():
    for role in (
        "president",
        "vice-president",
        "secretary",
        "treasurer",
        "faculty-advisor",
    ):
        data = MemberCreate(full_name="New", email="new@example.com", role=role)
        assert data.role == role


def test_member_create_rejects_unknown_role():
    with pytest.raises(ValidationError):
        MemberCreate(full_name="New", email="new@example.com", role="emperor")


def test_member_update_accepts_role_change():
    data = MemberUpdate(role="president")
    assert data.role == "president"


def test_member_update_rejects_unknown_role_field():
    with pytest.raises(ValidationError):
        MemberUpdate(role="admin")
