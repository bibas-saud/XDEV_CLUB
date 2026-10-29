import hashlib
import secrets
import smtplib
from datetime import timedelta

from email.message import EmailMessage
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import config
from app.core.security import hash_password
from app.models.admin import Admin
from app.models.invitation import AdminInvitation, utcnow_naive
from app.schemas.invitation import TransferInviteCreate


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _assert_smtp_configured() -> None:
    required = (
        config.smtp_host,
        config.smtp_username,
        config.smtp_password,
        config.smtp_from,
        config.frontend_base_url,
    )
    if not all(required):
        raise RuntimeError(
            "Email delivery is not configured. "
            "Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM "
            "and FRONTEND_BASE_URL in .env"
        )


def get_pending_invitation(db: Session) -> AdminInvitation | None:
    return db.scalar(
        select(AdminInvitation).where(
            AdminInvitation.accepted_at.is_(None)
        )
    )


def create_invitation(
    db: Session, admin: Admin, data: TransferInviteCreate
) -> tuple[AdminInvitation, str]:
    invitee_email = data.email.lower()
    if invitee_email == admin.email:
        raise ValueError("You cannot transfer ownership to yourself")

    pending = get_pending_invitation(db)
    if pending is not None:
        db.delete(pending)
        db.commit()

    raw_token = secrets.token_urlsafe(32)
    invitation = AdminInvitation(
        token_hash=_hash_token(raw_token),
        invitee_email=invitee_email,
        invited_by_id=admin.id,
        expires_at=utcnow_naive()
        + timedelta(hours=config.invite_expiry_hours),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation, raw_token


def build_accept_url(raw_token: str) -> str:
    return (
        f"{config.frontend_base_url.rstrip('/')}"
        f"/transfer/accept?token={raw_token}"
    )


def send_invitation_email(invitation: AdminInvitation, raw_token: str) -> None:
    _assert_smtp_configured()

    message = EmailMessage()
    message["From"] = config.smtp_from
    message["To"] = invitation.invitee_email
    message["Subject"] = "XDEV Club - Admin Ownership Transfer Invitation"
    expiry_hours = config.invite_expiry_hours
    message.set_content(
        "Hello,\n"
        "\n"
        "You have been invited to become the administrator of the "
        "XDEV Club website.\n"
        "\n"
        f"Accept your invitation by opening the link below:\n"
        f"{build_accept_url(raw_token)}\n"
        "\n"
        f"This link expires in {expiry_hours} hours and can be used only "
        "once.\n"
        "If you were not expecting this email, you can safely ignore it.\n"
    )

    with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
        server.starttls()
        server.login(config.smtp_username, config.smtp_password)
        server.send_message(message)


def cancel_invitation(db: Session) -> bool:
    pending = get_pending_invitation(db)
    if pending is None:
        return False
    db.delete(pending)
    db.commit()
    return True


def accept_invitation(
    db: Session, raw_token: str, full_name: str, password: str
) -> Admin:
    invitation = db.scalar(
        select(AdminInvitation).where(
            AdminInvitation.token_hash == _hash_token(raw_token)
        )
    )
    invalid_error = ValueError("Invalid, expired, or already used invitation")
    if invitation is None or invitation.is_used or invitation.is_expired:
        raise invalid_error

    outgoing_admin = db.get(Admin, invitation.invited_by_id)

    new_admin = Admin(
        full_name=full_name,
        email=invitation.invitee_email,
        password_hash=hash_password(password),
    )
    db.add(new_admin)
    # The invitation row holds a NOT NULL FK (invited_by_id -> admins.id) and
    # there is no ORM relationship() between the models, so SQLAlchemy gives
    # no child-before-parent delete-ordering guarantee within a single flush.
    # Flush the invitation deletion first, otherwise deleting the outgoing
    # admin below violates the constraint.
    db.delete(invitation)
    db.flush()
    if outgoing_admin is not None:
        db.delete(outgoing_admin)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "This email address cannot be registered as an admin"
        ) from exc

    db.refresh(new_admin)
    return new_admin
