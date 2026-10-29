import uuid
import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.event import Event


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )

    # Participant details (free-form — participants are not club members)
    participant_name: Mapped[str] = mapped_column(String(120), nullable=False)
    participant_email: Mapped[str] = mapped_column(String(255), nullable=False)
    participant_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    participant_college: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    participant_roll_no: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Registration lifecycle (attended removed; attendance is tracked separately)
    registered_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="registered", nullable=False)

    # Attendance: pending | present | absent
    attendance: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    checked_in_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    # Payment (fee captured at registration time)
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    event: Mapped["Event"] = relationship("Event", back_populates="registrations")

    __table_args__ = (
        UniqueConstraint(
            "event_id", "participant_email", name="uq_event_participant_email"
        ),
    )
