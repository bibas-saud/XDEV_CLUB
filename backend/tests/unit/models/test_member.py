from datetime import datetime

import pytest

from app.models.member import Member

pytestmark = pytest.mark.unit


def test_is_active_true_when_left_at_is_none():
    member = Member(full_name="Test Member", email="test@example.com")
    assert member.is_active is True


def test_is_active_false_when_left_at_is_set():
    member = Member(
        full_name="Test Member",
        email="test@example.com",
        left_at=datetime(2026, 3, 20),
    )
    assert member.is_active is False
