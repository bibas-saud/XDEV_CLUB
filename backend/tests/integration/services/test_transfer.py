from datetime import timedelta

import pytest

from app.core.config import config
from app.models.invitation import AdminInvitation, utcnow_naive
from app.schemas.invitation import TransferInviteCreate
from app.services import transfer as transfer_service
from app.services.auth import authenticate_admin
from app.services.transfer import (
    accept_invitation,
    build_accept_url,
    cancel_invitation,
    create_invitation,
    get_pending_invitation,
    send_invitation_email,
)
from tests.conftest import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD


class FakeSMTPServer:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.started = False
        self.credentials = None
        self.sent = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def starttls(self):
        self.started = True

    def login(self, username, password):
        self.credentials = (username, password)

    def send_message(self, message):
        self.sent = message


def _invite_data(email="successor@example.com"):
    return TransferInviteCreate(email=email)


# ---------------- create ----------------


def test_create_invitation_success(db_session, admin_user):
    invitation, raw_token = create_invitation(
        db_session, admin_user, _invite_data()
    )

    assert invitation.invitee_email == "successor@example.com"
    assert invitation.token_hash != raw_token
    assert len(raw_token) > 20
    assert invitation.accepted_at is None
    assert invitation.expires_at > utcnow_naive()
    assert invitation.is_expired is False
    assert invitation.invited_by_id == admin_user.id


def test_create_invitation_rejects_self_invite(db_session, admin_user):
    with pytest.raises(ValueError, match="yourself"):
        create_invitation(db_session, admin_user, _invite_data(TEST_ADMIN_EMAIL))


def test_create_invitation_lowercases_email(db_session, admin_user):
    invitation, _ = create_invitation(
        db_session, admin_user, _invite_data("Successor@Example.COM")
    )
    assert invitation.invitee_email == "successor@example.com"


def test_create_invitation_replaces_previous_pending(db_session, admin_user):
    first, first_token = create_invitation(db_session, admin_user, _invite_data())
    second, second_token = create_invitation(
        db_session, admin_user, _invite_data("other@example.com")
    )

    from sqlalchemy import func as sa_func
    from sqlalchemy import select

    remaining_count = db_session.scalar(
        select(sa_func.count()).where(
            AdminInvitation.id == first.id
        )
    )
    assert remaining_count == 0
    assert second.token_hash != first_token


def test_get_pending_invitation_empty(db_session):
    assert get_pending_invitation(db_session) is None


# ---------------- email sending ----------------


def test_send_invitation_email_sends_link(monkeypatch, db_session, admin_user):
    server = FakeSMTPServer("smtp.test", 587)
    monkeypatch.setattr(transfer_service.smtplib, "SMTP", lambda h, p: server)
    monkeypatch.setattr(config, "smtp_host", "smtp.test")
    monkeypatch.setattr(config, "smtp_port", 587)
    monkeypatch.setattr(config, "smtp_username", "club@gmail.com")
    monkeypatch.setattr(config, "smtp_password", "app-password")
    monkeypatch.setattr(config, "smtp_from", "club@gmail.com")
    monkeypatch.setattr(config, "frontend_base_url", "https://xdev.example.com")

    invitation, raw_token = create_invitation(
        db_session, admin_user, _invite_data()
    )

    send_invitation_email(invitation, raw_token)

    assert server.started is True
    assert server.credentials == ("club@gmail.com", "app-password")
    assert server.sent["To"] == "successor@example.com"
    expected_link = build_accept_url(raw_token)
    assert expected_link == (
        "https://xdev.example.com/transfer/accept"
        f"?token={raw_token}"
    )
    body = server.sent.get_content()
    assert raw_token in body
    assert "48 hours" in body


def test_send_invitation_email_raises_when_unconfigured(
    monkeypatch, db_session, admin_user
):
    monkeypatch.setattr(config, "smtp_host", "")
    monkeypatch.setattr(config, "frontend_base_url", "")
    invitation, raw_token = create_invitation(
        db_session, admin_user, _invite_data()
    )

    with pytest.raises(RuntimeError, match="not configured"):
        send_invitation_email(invitation, raw_token)


# ---------------- acceptance ----------------


def test_accept_invitation_transfers_ownership(db_session, admin_user):
    invitation, raw_token = create_invitation(db_session, admin_user, _invite_data())

    new_admin = accept_invitation(
        db_session, raw_token, "New Boss", "Password123!"
    )

    assert new_admin.email == "successor@example.com"
    assert new_admin.full_name == "New Boss"

    from sqlalchemy import select

    from app.models.admin import Admin
    from app.models.invitation import AdminInvitation

    remaining = list(db_session.scalars(select(Admin)).all())
    assert len(remaining) == 1
    assert remaining[0].id == new_admin.id
    assert authenticate_admin(
        db_session, "successor@example.com", "Password123!"
    ) is not None

    # Acceptance burns the invitation by deleting its row entirely
    remaining_invitations = list(
        db_session.scalars(select(AdminInvitation)).all()
    )
    assert remaining_invitations == []


def test_accept_invitation_old_admin_login_revoked(db_session, admin_user):
    invitation, raw_token = create_invitation(db_session, admin_user, _invite_data())

    accept_invitation(db_session, raw_token, "New Boss", "Password123!")

    assert (
        authenticate_admin(
            db_session, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
        )
        is None
    )


def test_accept_invitation_wrong_token(db_session):
    with pytest.raises(ValueError, match="Invalid"):
        accept_invitation(db_session, "no-such-token", "X", "Password123!")


def test_accept_invitation_expired(db_session, admin_user):
    invitation, raw_token = create_invitation(db_session, admin_user, _invite_data())
    invitation.expires_at = utcnow_naive() - timedelta(minutes=1)
    db_session.commit()

    with pytest.raises(ValueError, match="Invalid"):
        accept_invitation(db_session, raw_token, "Late", "Password123!")


def test_accept_invitation_burns_token_after_use(db_session, admin_user):
    invitation, raw_token = create_invitation(db_session, admin_user, _invite_data())

    accept_invitation(db_session, raw_token, "First Boss", "Password123!")

    with pytest.raises(ValueError, match="Invalid"):
        accept_invitation(db_session, raw_token, "Second Boss", "Password123!")
