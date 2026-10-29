import pytest

from app.services import transfer as transfer_service
from tests.conftest import TEST_ADMIN_EMAIL

pytestmark = pytest.mark.integration

ACCEPT_BODY = {
    "token": "some-raw-token",
    "full_name": "New Boss",
    "password": "Password123!",
}


def test_invite_requires_authentication(client):
    response = client.post(
        "/api/ownership/invitation", json={"email": "successor@example.com"}
    )
    assert response.status_code == 401


def test_pending_status_requires_authentication(client):
    response = client.get("/api/ownership/invitation")
    assert response.status_code == 401


def test_cancel_requires_authentication(client):
    response = client.delete("/api/ownership/invitation")
    assert response.status_code == 401


def test_invite_success_sends_email_and_returns_status(
    authenticated_client, monkeypatch
):
    sent = {}
    monkeypatch.setattr(
        "app.routers.transfer.send_invitation_email",
        lambda invitation, raw_token: sent.update(
            {"to": invitation.invitee_email, "token": raw_token}
        ),
    )

    response = authenticated_client.post(
        "/api/ownership/invitation",
        json={"email": "Successor@Example.com"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["invitee_email"] == "successor@example.com"
    assert body["is_expired"] is False
    # raw token must never leak through the API response
    assert "token" not in response.text
    assert sent["to"] == "successor@example.com"


def test_invite_rejects_own_email(authenticated_client):
    response = authenticated_client.post(
        "/api/ownership/invitation", json={"email": TEST_ADMIN_EMAIL}
    )
    assert response.status_code == 400
    assert "yourself" in response.json()["detail"]


def test_invite_smtp_failure_returns_503(authenticated_client, monkeypatch):
    def broken_send(invitation, raw_token):
        raise RuntimeError("Email delivery is not configured. ...")

    monkeypatch.setattr(
        "app.routers.transfer.send_invitation_email", broken_send
    )

    response = authenticated_client.post(
        "/api/ownership/invitation", json={"email": "x@example.com"}
    )
    assert response.status_code == 503


def test_pending_invitation_none_initially(authenticated_client):
    response = authenticated_client.get("/api/ownership/invitation")
    assert response.status_code == 404


def test_pending_invitation_visible_after_create(
    authenticated_client, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.transfer.send_invitation_email",
        lambda invitation, raw_token: None,
    )
    authenticated_client.post(
        "/api/ownership/invitation", json={"email": "pending@example.com"}
    )

    response = authenticated_client.get("/api/ownership/invitation")

    assert response.status_code == 200
    assert response.json()["invitee_email"] == "pending@example.com"


def test_cancel_pending_invitation(authenticated_client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.transfer.send_invitation_email",
        lambda invitation, raw_token: None,
    )
    authenticated_client.post(
        "/api/ownership/invitation", json={"email": "cancelme@example.com"}
    )

    response = authenticated_client.delete("/api/ownership/invitation")
    assert response.status_code == 200
    assert response.json() == {"message": "Invitation cancelled"}

    second = authenticated_client.delete("/api/ownership/invitation")
    assert second.status_code == 404


def test_accept_is_public(client, admin_user, db_session, monkeypatch):
    """No cookie needed — the token itself is the authorization."""
    invitation, raw_token = transfer_service.create_invitation(
        db_session,
        admin_user,
        transfer_service.TransferInviteCreate(email="next@example.com"),
    )

    response = client.post(
        "/api/ownership/invitation/accept",
        json={
            "token": raw_token,
            "full_name": "Next Boss",
            "password": "Password123!",
        },
    )

    assert response.status_code == 200
    assert response.json()["email"] == "next@example.com"


def test_accept_with_invalid_token(client):
    response = client.post(
        "/api/ownership/invitation/accept", json=ACCEPT_BODY
    )
    assert response.status_code == 400
    assert "Invalid" in response.json()["detail"]


def test_accept_short_password_rejected(client):
    response = client.post(
        "/api/ownership/invitation/accept",
        json={"token": "t", "full_name": "X", "password": "short"},
    )
    assert response.status_code == 422


def test_new_admin_can_login_after_transfer(
    client, admin_user, db_session, monkeypatch
):
    from tests.conftest import TEST_ADMIN_PASSWORD

    _invitation, raw_token = transfer_service.create_invitation(
        db_session,
        admin_user,
        transfer_service.TransferInviteCreate(email="finalboss@example.com"),
    )

    accept_response = client.post(
        "/api/ownership/invitation/accept",
        json={
            "token": raw_token,
            "full_name": "Final Boss",
            "password": "Password123!",
        },
    )
    assert accept_response.status_code == 200

    old_login = client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    new_login = client.post(
        "/api/auth/login",
        json={"email": "finalboss@example.com", "password": "Password123!"},
    )

    assert old_login.status_code == 401
    assert new_login.status_code == 200
