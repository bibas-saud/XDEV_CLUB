import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.session import Base


def utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AdminInvitation(Base):
    __tablename__ = "admin_invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    token_hash: Mapped[str] = mapped_column(
        String, unique=True, nullable=False
    )
    invitee_email: Mapped[str] = mapped_column(String, nullable=False)
    invited_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("admins.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    @property
    def is_expired(self) -> bool:
        return self.expires_at < utcnow_naive()

    @property
    def is_used(self) -> bool:
        return self.accepted_at is not None
