import uuid

import pytest

from app.models.member import Member
from app.services import members as member_service
from tests.conftest import TEST_ADMIN_EMAIL, TEST_MEMBER_EMAIL

pytestmark = pytest.mark.integration

PNG_FILE = {"file": ("photo.png", b"png-bytes", "image/png")}
JPEG_FILE = {"file": ("card.jpg", b"jpeg-bytes", "image/jpeg")}
PDF_FILE = {"file": ("doc.pdf", b"pdf-bytes", "application/pdf")}


def _mutation(method: str, path: str, **kwargs):
    return (method, path, kwargs)


MUTATIONS = [
    _mutation(
        "post",
        "/api/members",
        json={"full_name": "New Member", "email": "new.member@example.com"},
    ),
    _mutation("patch", "/api/members/{id}", json={"full_name": "Renamed"}),
    _mutation("delete", "/api/members/{id}"),
    _mutation("post", "/api/members/{id}/reactivate"),
    _mutation("post", "/api/members/{id}/photo", files=PNG_FILE),
    _mutation("post", "/api/members/{id}/id-card", files=PNG_FILE),
]


def _seed_past_member(db_session):
    past = Member(
        full_name="Past Member",
        email="past@example.com",
        left_at=datetime_utc(2026, 1, 1),
    )
    db_session.add(past)
    db_session.commit()
    db_session.refresh(past)
    return past


def datetime_utc(*args):
    from datetime import datetime

    return datetime(*args)


# ---------------- public GET routes ----------------


def test_list_active_members_empty_db(client):
    response = client.get("/api/members")
    assert response.status_code == 200
    assert response.json() == []


def test_list_active_members_excludes_past_members(
    client, member_user, db_session
):
    past = _seed_past_member(db_session)

    response = client.get("/api/members")

    assert response.status_code == 200
    ids = {m["id"] for m in response.json()}
    assert str(member_user.id) in ids
    assert str(past.id) not in ids


def test_list_past_members_returns_only_past(client, member_user, db_session):
    past = _seed_past_member(db_session)

    response = client.get("/api/members/past")

    assert response.status_code == 200
    ids = {m["id"] for m in response.json()}
    assert ids == {str(past.id)}
    assert str(member_user.id) not in ids


def test_list_all_members_includes_active_and_past(
    client, member_user, db_session
):
    past = _seed_past_member(db_session)

    response = client.get("/api/members/all")

    assert response.status_code == 200
    ids = {m["id"] for m in response.json()}
    assert ids == {str(member_user.id), str(past.id)}


def test_get_member_by_id_returns_full_detail(client, member_user):
    response = client.get(f"/api/members/{member_user.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(member_user.id)
    assert body["email"] == TEST_MEMBER_EMAIL
    assert body["full_name"] == member_user.full_name
    assert body["is_active"] is True
    assert body["role"] == "member"
    assert body["left_at"] is None
    assert body["photo_url"] is None
    assert body["has_id_card"] is False
    assert "id_card_url" not in body
    assert "password_hash" not in body


def test_get_member_by_id_not_found(client):
    response = client.get(f"/api/members/{uuid.uuid4()}")
    assert response.status_code == 404


# ---------------- auth guards on mutations ----------------


@pytest.mark.parametrize("method,path,kwargs", MUTATIONS)
def test_mutations_require_authentication(
    client, member_user, method, path, kwargs
):
    response = getattr(client, method)(path.format(id=member_user.id), **kwargs)
    assert response.status_code == 401


def test_forged_admin_cookie_rejected_on_mutations(client, member_user):
    client.cookies.set("access_token", "forged.token.payload")
    response = client.patch(
        f"/api/members/{member_user.id}", json={"full_name": "Hacked"}
    )
    assert response.status_code == 401


# ---------------- POST /api/members ----------------


def test_create_member_success(authenticated_client):
    response = authenticated_client.post(
        "/api/members",
        json={"full_name": "Brand New Member", "email": "brand.new@example.com"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Brand New Member"
    assert body["email"] == "brand.new@example.com"
    assert body["role"] == "member"
    assert body["is_active"] is True
    assert "password_hash" not in body


def test_create_member_rejects_role_field(authenticated_client):
    response = authenticated_client.post(
        "/api/members",
        json={
            "full_name": "Sneaky Admin",
            "email": "sneaky@example.com",
            "role": "admin",
        },
    )
    assert response.status_code == 422


def test_create_member_with_display_role(authenticated_client):
    response = authenticated_client.post(
        "/api/members",
        json={
            "full_name": "Club Lead",
            "email": "lead@example.com",
            "role": "president",
        },
    )

    assert response.status_code == 201
    assert response.json()["role"] == "president"


def test_create_member_invalid_display_role(authenticated_client):
    response = authenticated_client.post(
        "/api/members",
        json={
            "full_name": "Odd Role",
            "email": "odd.role@example.com",
            "role": "emperor",
        },
    )
    assert response.status_code == 422


def test_create_member_duplicate_email(authenticated_client, member_user):
    response = authenticated_client.post(
        "/api/members",
        json={"full_name": "Dup", "email": TEST_MEMBER_EMAIL},
    )
    assert response.status_code == 409


def test_create_member_email_matching_admin_is_allowed(
    authenticated_client, admin_user
):
    """Admins and members are separate tables — the same human may exist in both."""
    response = authenticated_client.post(
        "/api/members",
        json={"full_name": "Admin Also Member", "email": TEST_ADMIN_EMAIL},
    )
    assert response.status_code == 201


# ---------------- PATCH /api/members/{id} ----------------


def test_update_member_partial(authenticated_client, member_user):
    response = authenticated_client.patch(
        f"/api/members/{member_user.id}",
        json={"full_name": "Renamed Member"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Renamed Member"
    assert body["email"] == TEST_MEMBER_EMAIL


def test_update_member_rejects_auth_role_field(authenticated_client, member_user):
    response = authenticated_client.patch(
        f"/api/members/{member_user.id}",
        json={"role": "admin"},
    )
    assert response.status_code == 422


def test_update_member_display_role(authenticated_client, member_user):
    response = authenticated_client.patch(
        f"/api/members/{member_user.id}",
        json={"role": "vice-president"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "vice-president"


def test_update_member_duplicate_email_conflict(
    authenticated_client, member_user
):
    first = authenticated_client.post(
        "/api/members",
        json={"full_name": "First Member", "email": "first@example.com"},
    )
    assert first.status_code == 201

    response = authenticated_client.patch(
        f"/api/members/{first.json()['id']}",
        json={"email": TEST_MEMBER_EMAIL},
    )
    assert response.status_code == 409


def test_update_unknown_member(authenticated_client):
    response = authenticated_client.patch(
        f"/api/members/{uuid.uuid4()}", json={"full_name": "Ghost"}
    )
    assert response.status_code == 404


# ---------------- DELETE /api/members/{id} ----------------


def test_deactivate_member_soft_deletes(authenticated_client, member_user):
    response = authenticated_client.delete(f"/api/members/{member_user.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["is_active"] is False
    assert body["left_at"] is not None

    listing = authenticated_client.get("/api/members").json()
    assert str(member_user.id) not in {m["id"] for m in listing}


def test_deactivate_already_deactivated_conflict(
    authenticated_client, member_user
):
    first = authenticated_client.delete(f"/api/members/{member_user.id}")
    assert first.status_code == 200

    second = authenticated_client.delete(f"/api/members/{member_user.id}")
    assert second.status_code == 409


def test_delete_unknown_member(authenticated_client):
    response = authenticated_client.delete(f"/api/members/{uuid.uuid4()}")
    assert response.status_code == 404


# ---------------- POST /{id}/reactivate ----------------


def test_reactivate_member(authenticated_client, member_user):
    authenticated_client.delete(f"/api/members/{member_user.id}")

    response = authenticated_client.post(
        f"/api/members/{member_user.id}/reactivate"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_active"] is True
    assert body["left_at"] is None


def test_reactivate_already_active_conflict(authenticated_client, member_user):
    response = authenticated_client.post(
        f"/api/members/{member_user.id}/reactivate"
    )
    assert response.status_code == 409


# ---------------- photo + id card uploads ----------------


def test_upload_photo_success(
    authenticated_client, member_user, monkeypatch
):
    monkeypatch.setattr(member_service, "upload_file", lambda path, data, ct, **_: None)

    response = authenticated_client.post(
        f"/api/members/{member_user.id}/photo", files=PNG_FILE
    )

    assert response.status_code == 200
    assert (
        response.json()["photo_url"]
        .endswith(f"photos/{member_user.id}/photo.png")
    )


def test_upload_photo_invalid_type_returns_400(
    authenticated_client, member_user, monkeypatch
):
    monkeypatch.setattr(member_service, "upload_file", lambda path, data, ct, **_: None)

    response = authenticated_client.post(
        f"/api/members/{member_user.id}/photo", files=PDF_FILE
    )
    assert response.status_code == 400


def test_upload_id_card_success(
    authenticated_client, member_user, monkeypatch
):
    monkeypatch.setattr(member_service, "upload_file", lambda path, data, ct, **_: None)

    response = authenticated_client.post(
        f"/api/members/{member_user.id}/id-card", files=PNG_FILE
    )

    assert response.status_code == 200
    body = response.json()
    assert body["has_id_card"] is True
    assert "id_card_url" not in body


def test_upload_id_card_non_png_returns_400(
    authenticated_client, member_user, monkeypatch
):
    monkeypatch.setattr(member_service, "upload_file", lambda path, data, ct, **_: None)

    response = authenticated_client.post(
        f"/api/members/{member_user.id}/id-card", files=JPEG_FILE
    )
    assert response.status_code == 400


# ---------------- GET /{id}/id-card (admin-only signed URL) ----------------


def test_get_id_card_requires_authentication(client, member_user):
    response = client.get(f"/api/members/{member_user.id}/id-card")
    assert response.status_code == 401


def test_get_id_card_for_unknown_member(authenticated_client):
    response = authenticated_client.get(f"/api/members/{uuid.uuid4()}/id-card")
    assert response.status_code == 404


def test_get_id_card_when_never_generated(authenticated_client, member_user):
    response = authenticated_client.get(f"/api/members/{member_user.id}/id-card")
    assert response.status_code == 404
    assert response.json() == {
        "detail": "No ID card has been generated for this member"
    }


def test_get_id_card_returns_signed_url_for_admin(
    authenticated_client, member_user, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.members.get_member_signed_card_url",
        lambda member: "https://signed.example.com/card",
    )

    response = authenticated_client.get(f"/api/members/{member_user.id}/id-card")

    assert response.status_code == 200
    body = response.json()
    assert body["url"] == "https://signed.example.com/card"
    assert body["expires_in"] == 3600

