from datetime import datetime
import uuid

import pytest

from app.core.config import config
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate
from app.services import members as member_service
from app.services.members import (
    create_member,
    deactivate_member,
    get_member,
    get_member_by_email,
    list_active_members,
    list_all_members,
    list_past_members,
    reactivate_member,
    set_member_id_card,
    set_member_photo,
    update_member,
)
from tests.conftest import TEST_MEMBER_EMAIL

pytestmark = pytest.mark.integration


def test_list_all_members_empty_db(db_session):
    assert list_all_members(db_session) == []


def test_list_all_members_returns_every_member(db_session, member_user):
    extra = Member(full_name="Extra Member", email="extra@example.com")
    db_session.add(extra)
    db_session.commit()

    members = list_all_members(db_session)

    assert len(members) == 2
    assert {m.id for m in members} == {member_user.id, extra.id}


def test_list_all_members_includes_past_members(db_session, member_user):
    past = Member(
        full_name="Past Member",
        email="past@example.com",
        left_at=datetime(2026, 1, 1),
    )
    db_session.add(past)
    db_session.commit()

    members = list_all_members(db_session)

    assert len(members) == 2
    assert {m.email for m in members} == {TEST_MEMBER_EMAIL, "past@example.com"}


def test_list_all_members_orders_by_joined_at(db_session):
    newer = Member(
        full_name="Newer Member",
        email="newer@example.com",
        joined_at=datetime(2026, 1, 1),
    )
    older = Member(
        full_name="Older Member",
        email="older@example.com",
        joined_at=datetime(2024, 1, 1),
    )
    db_session.add_all([newer, older])
    db_session.commit()

    members = list_all_members(db_session)

    assert [m.id for m in members] == [older.id, newer.id]


def test_list_active_members_empty_db(db_session):
    assert list_active_members(db_session) == []


def test_list_active_members_excludes_past_members(
    db_session, admin_user, member_user
):
    past = Member(
        full_name="Past Member",
        email="past@example.com",
        left_at=datetime(2026, 1, 1),
    )
    db_session.add(past)
    db_session.commit()

    members = list_active_members(db_session)

    assert len(members) == 1
    assert members[0].id == member_user.id
    assert all(m.left_at is None for m in members)


def test_list_active_members_orders_by_joined_at(db_session):
    newer = Member(
        full_name="Newer Member",
        email="newer2@example.com",
        joined_at=datetime(2026, 1, 1),
    )
    older = Member(
        full_name="Older Member",
        email="older2@example.com",
        joined_at=datetime(2024, 1, 1),
    )
    db_session.add_all([newer, older])
    db_session.commit()

    members = list_active_members(db_session)

    assert [m.id for m in members] == [older.id, newer.id]


def test_list_past_members_empty_db(db_session):
    assert list_past_members(db_session) == []


def test_list_past_members_excludes_active_members(db_session, member_user):
    past = Member(
        full_name="Past Member",
        email="past@example.com",
        left_at=datetime(2026, 1, 1),
    )
    db_session.add(past)
    db_session.commit()

    members = list_past_members(db_session)

    assert len(members) == 1
    assert members[0].id == past.id
    assert all(m.left_at is not None for m in members)


def test_list_past_members_orders_by_left_at(db_session):
    recent = Member(
        full_name="Recent Alum",
        email="recent@example.com",
        left_at=datetime(2026, 6, 1),
    )
    old = Member(
        full_name="Old Alum",
        email="old@example.com",
        left_at=datetime(2025, 1, 1),
    )
    db_session.add_all([recent, old])
    db_session.commit()

    members = list_past_members(db_session)

    assert [m.id for m in members] == [old.id, recent.id]


def test_get_member_returns_matching_member(db_session, member_user):
    member = get_member(db_session, member_user.id)
    assert member is not None
    assert member.id == member_user.id
    assert member.email == TEST_MEMBER_EMAIL


def test_get_member_returns_none_for_unknown_id(db_session):
    assert get_member(db_session, uuid.uuid4()) is None


def test_get_member_by_email_is_case_insensitive(db_session, member_user):
    fetched = get_member_by_email(db_session, TEST_MEMBER_EMAIL.upper())
    assert fetched is not None
    assert fetched.id == member_user.id


def test_create_member_success(db_session):
    data = MemberCreate(
        full_name="Brand New", email="Brand.New@Example.com"
    )

    member = create_member(db_session, data)

    assert member is not None
    assert member.full_name == "Brand New"
    assert member.email == "brand.new@example.com"
    assert member.role == "member"
    assert member.is_active is True
    assert member.photo_url is None
    assert member.id_card_path is None


def test_create_member_with_display_role(db_session):
    data = MemberCreate(
        full_name="Club Lead",
        email="lead@example.com",
        role="president",
    )

    member = create_member(db_session, data)

    assert member is not None
    assert member.role == "president"


def test_update_member_display_role(db_session, member_user):
    updated = update_member(
        db_session, member_user, MemberUpdate(role="vice-president")
    )

    assert updated is not None
    assert updated.role == "vice-president"


def test_create_member_duplicate_email_returns_none(db_session, member_user):
    data = MemberCreate(full_name="Dup", email=TEST_MEMBER_EMAIL)
    assert create_member(db_session, data) is None


def test_create_member_duplicate_email_case_insensitive(
    db_session, member_user
):
    data = MemberCreate(
        full_name="Dup Upper", email=TEST_MEMBER_EMAIL.upper()
    )
    assert create_member(db_session, data) is None


def test_update_member_full_name(db_session, member_user):
    updated = update_member(
        db_session, member_user, MemberUpdate(full_name="Updated Name")
    )

    assert updated is not None
    assert updated.full_name == "Updated Name"
    assert updated.email == TEST_MEMBER_EMAIL


def test_update_member_email_is_lowercased_and_persisted(
    db_session, member_user
):
    updated = update_member(
        db_session, member_user, MemberUpdate(email="Renamed@Example.COM")
    )

    assert updated is not None
    assert updated.email == "renamed@example.com"
    fetched = get_member_by_email(db_session, "renamed@example.com")
    assert fetched is not None
    assert fetched.id == member_user.id


def test_update_member_partial_only_changes_sent_fields(
    db_session, member_user
):
    updated = update_member(
        db_session, member_user, MemberUpdate(full_name="Only Name Changed")
    )

    assert updated is not None
    assert updated.full_name == "Only Name Changed"
    assert updated.email == TEST_MEMBER_EMAIL


def test_update_member_empty_payload_returns_unchanged(
    db_session, member_user
):
    original_name = member_user.full_name
    updated = update_member(db_session, member_user, MemberUpdate())

    assert updated is not None
    assert updated.id == member_user.id
    assert updated.full_name == original_name


def test_update_member_duplicate_email_returns_none(
    db_session, member_user
):
    other = Member(full_name="Other Member", email="other@example.com")
    db_session.add(other)
    db_session.commit()

    result = update_member(
        db_session, member_user, MemberUpdate(email="other@example.com")
    )

    assert result is None
    db_session.refresh(other)
    assert other.email == "other@example.com"


def test_update_member_to_own_current_email_succeeds(db_session, member_user):
    updated = update_member(
        db_session, member_user, MemberUpdate(email=TEST_MEMBER_EMAIL)
    )

    assert updated is not None
    assert updated.email == TEST_MEMBER_EMAIL


def test_deactivate_member_sets_left_at(db_session, member_user):
    deactivated = deactivate_member(db_session, member_user)

    assert deactivated is not None
    assert deactivated.left_at is not None
    assert deactivated.is_active is False


def test_deactivate_member_keeps_row_retrievable(db_session, member_user):
    deactivate_member(db_session, member_user)

    fetched = get_member(db_session, member_user.id)

    assert fetched is not None
    assert fetched.is_active is False


def test_deactivate_already_deactivated_member_returns_none(
    db_session, member_user
):
    assert deactivate_member(db_session, member_user) is not None
    assert deactivate_member(db_session, member_user) is None


def test_reactivate_member_clears_left_at(db_session, member_user):
    deactivate_member(db_session, member_user)

    reactivated = reactivate_member(db_session, member_user)

    assert reactivated is not None
    assert reactivated.left_at is None
    assert reactivated.is_active is True


def test_reactivate_member_preserves_original_joined_at(
    db_session, member_user
):
    original_joined_at = member_user.joined_at
    deactivate_member(db_session, member_user)

    reactivated = reactivate_member(db_session, member_user)

    assert reactivated is not None
    assert reactivated.joined_at == original_joined_at


def test_reactivate_already_active_member_returns_none(
    db_session, member_user
):
    assert reactivate_member(db_session, member_user) is None


def test_set_member_photo_success(db_session, member_user, monkeypatch):
    uploads = []
    monkeypatch.setattr(
        member_service,
        "upload_file",
        lambda path, data, content_type: uploads.append(
            (path, data, content_type)
        ),
    )
    monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
    monkeypatch.setattr(config, "supabase_photos_bucket", "members")

    updated = set_member_photo(
        db_session, member_user, b"image-bytes", "image/png"
    )

    expected_path = f"photos/{member_user.id}/photo.png"
    assert uploads == [(expected_path, b"image-bytes", "image/png")]
    assert updated.photo_url == (
        "https://abc.supabase.co/storage/v1/object/public/"
        f"members/{expected_path}"
    )


def test_set_member_photo_rejects_invalid_type(
    db_session, member_user, monkeypatch
):
    uploads = []
    monkeypatch.setattr(
        member_service,
        "upload_file",
        lambda path, data, content_type: uploads.append(path),
    )

    with pytest.raises(ValueError, match="Unsupported image type"):
        set_member_photo(
            db_session, member_user, b"pdf", "application/pdf"
        )

    assert uploads == []
    assert member_user.photo_url is None


def test_set_member_photo_rejects_oversized_file(
    db_session, member_user, monkeypatch
):
    uploads = []
    monkeypatch.setattr(
        member_service,
        "upload_file",
        lambda path, data, content_type: uploads.append(path),
    )
    oversized = b"x" * (5 * 1024 * 1024 + 1)

    with pytest.raises(ValueError, match="maximum size"):
        set_member_photo(db_session, member_user, oversized, "image/png")

    assert uploads == []
    assert member_user.photo_url is None


def test_set_member_photo_reupload_overwrites(
    db_session, member_user, monkeypatch
):
    monkeypatch.setattr(member_service, "upload_file", lambda path, data, ct, **_: None)
    monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
    monkeypatch.setattr(config, "supabase_photos_bucket", "members")

    first = set_member_photo(db_session, member_user, b"a", "image/jpeg")
    first_url = first.photo_url
    second = set_member_photo(db_session, member_user, b"b", "image/webp")

    assert first_url.endswith("photo.jpg")
    assert second.photo_url.endswith("photo.webp")
    assert f"photos/{member_user.id}/" in second.photo_url


def test_set_member_id_card_success(db_session, member_user, monkeypatch):
    uploads = []
    monkeypatch.setattr(
        member_service,
        "upload_file",
        lambda path, data, content_type, bucket=None: uploads.append(
            (path, data, content_type, bucket)
        ),
    )
    monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
    monkeypatch.setattr(config, "supabase_id_cards_bucket", "id-cards")

    updated = set_member_id_card(
        db_session, member_user, b"card-png-bytes", "image/png"
    )

    expected_path = f"id-cards/{member_user.id}/card.png"
    assert uploads == [
        (expected_path, b"card-png-bytes", "image/png", "id-cards")
    ]
    assert updated.id_card_path == expected_path
    assert updated.has_id_card is True


def test_set_member_id_card_rejects_non_png(
    db_session, member_user, monkeypatch
):
    uploads = []
    monkeypatch.setattr(
        member_service,
        "upload_file",
        lambda path, data, content_type: uploads.append(path),
    )

    with pytest.raises(ValueError, match="Unsupported image type"):
        set_member_id_card(db_session, member_user, b"jpeg-card", "image/jpeg")

    assert uploads == []
    assert member_user.id_card_path is None


def test_set_member_id_card_rejects_oversized_file(
    db_session, member_user, monkeypatch
):
    uploads = []
    monkeypatch.setattr(
        member_service,
        "upload_file",
        lambda path, data, content_type: uploads.append(path),
    )
    oversized = b"x" * (5 * 1024 * 1024 + 1)

    with pytest.raises(ValueError, match="maximum size"):
        set_member_id_card(db_session, member_user, oversized, "image/png")

    assert uploads == []
    assert member_user.id_card_path is None


def test_set_member_id_card_reupload_overwrites(
    db_session, member_user, monkeypatch
):
    monkeypatch.setattr(member_service, "upload_file", lambda path, data, ct, **_: None)

    first = set_member_id_card(db_session, member_user, b"a", "image/png")
    first_path = first.id_card_path
    second = set_member_id_card(db_session, member_user, b"b", "image/png")

    assert first_path == f"id-cards/{member_user.id}/card.png"
    assert second.id_card_path == first_path
    assert second.has_id_card is True


def test_get_member_signed_card_url_returns_none_without_card(member_user):
    from app.services.members import get_member_signed_card_url

    assert get_member_signed_card_url(member_user) is None


def test_get_member_signed_card_url_builds_url(
    db_session, member_user, monkeypatch
):
    from app.services.members import get_member_signed_card_url

    monkeypatch.setattr(
        member_service,
        "create_signed_url",
        lambda path, expires_in_seconds: f"signed:{path}:{expires_in_seconds}",
    )
    member_user.id_card_path = f"id-cards/{member_user.id}/card.png"

    url = get_member_signed_card_url(member_user)

    assert url == (
        f"signed:id-cards/{member_user.id}/card.png:"
        "3600"
    )




