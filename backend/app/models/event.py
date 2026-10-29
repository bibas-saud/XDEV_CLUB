import uuid
import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Integer, Numeric, String, Text, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.event_registration import EventRegistration


def _new_check_in_token() -> str:
    return uuid.uuid4().hex


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Date/time
    event_date: Mapped[datetime.date] = mapped_column(nullable=False)
    start_time: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[datetime.time | None] = mapped_column(Time, nullable=True)
    venue: Mapped[str] = mapped_column(String(300), nullable=False)

    # Fee
    is_free: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fee_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)

    # Capacity
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False)

    # Competitive prizes
    prize_structure: Mapped[str | None] = mapped_column(String(30), nullable=True)
    prizes: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    has_certificates: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    certificate_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Media (JSON arrays of Supabase URLs)
    photos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    videos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Banner shown on the public event page
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Lifecycle
    status: Mapped[str] = mapped_column(String(20), default="upcoming", nullable=False)
    ended_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    reminder_sent_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    check_in_token: Mapped[str] = mapped_column(
        String(64), unique=True, default=_new_check_in_token, nullable=False
    )
    attendance_submitted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    registrations: Mapped[list["EventRegistration"]] = relationship(
        "EventRegistration",
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def registration_open(self) -> bool:
        """Registration closes 2 hours before the event starts."""
        start_dt = datetime.datetime.combine(self.event_date, self.start_time)
        return datetime.datetime.now() < start_dt - datetime.timedelta(hours=2)

    @property
    def attendance_locked(self) -> bool:
        """Attendance becomes immutable 24h after it was submitted."""
        if self.attendance_submitted_at is None:
            return False
        elapsed = datetime.datetime.now() - self.attendance_submitted_at
        return elapsed > datetime.timedelta(hours=24)

    @property
    def attendance_editable_until(self) -> datetime.datetime | None:
        if self.attendance_submitted_at is None:
            return None
        return self.attendance_submitted_at + datetime.timedelta(hours=24)

    @property
    def registration_count(self) -> int:
        return sum(1 for r in self.registrations if r.status != "cancelled")

    @property
    def spots_left(self) -> int:
        return self.max_capacity - self.registration_count
