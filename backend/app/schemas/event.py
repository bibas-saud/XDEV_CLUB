from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, model_validator

EventType = Literal["workshop", "competitive"]
EventStatus = Literal["upcoming", "ongoing", "past"]
PrizeStructure = Literal["first", "first_second", "first_second_third"]
RegistrationStatus = Literal["registered", "cancelled"]
AttendanceStatus = Literal["pending", "present", "absent"]
PaymentStatus = Literal["pending", "paid", "failed", "refunded", "waived"]

REOPEN_WINDOW_HOURS = 24


class PrizeInfo(BaseModel):
    amount: Decimal = Field(ge=0)
    description: str = ""


class EventBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    type: EventType
    event_date: date
    start_time: time
    end_time: time | None = None
    venue: str = Field(min_length=1, max_length=300)
    is_free: bool = True
    fee_amount: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="INR", pattern="^[A-Z]{3}$")
    max_capacity: int = Field(ge=1)
    prize_structure: PrizeStructure | None = None
    prizes: dict[str, PrizeInfo] | None = None
    has_certificates: bool = False
    certificate_details: str | None = None


class EventCreate(EventBase):
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_competitive_fields(self) -> "EventCreate":
        if self.type == "competitive":
            if not self.prize_structure:
                raise ValueError(
                    "prize_structure is required for competitive events"
                )
        if self.prize_structure and not self.prizes:
            raise ValueError("prizes are required when prize_structure is set")
        if self.type == "workshop" and self.prize_structure:
            raise ValueError("prize_structure is only for competitive events")
        if not self.is_free and self.fee_amount is None:
            raise ValueError("fee_amount is required when event is not free")
        return self


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    type: EventType | None = None
    event_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    venue: str | None = Field(default=None, min_length=1, max_length=300)
    is_free: bool | None = None
    fee_amount: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    max_capacity: int | None = Field(default=None, ge=1)
    prize_structure: PrizeStructure | None = None
    prizes: dict[str, PrizeInfo] | None = None
    has_certificates: bool | None = None
    certificate_details: str | None = None


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: EventStatus
    photos: list[str] = []
    videos: list[str] = []
    cover_image_url: str | None = None
    registration_count: int
    spots_left: int
    registration_open: bool
    created_at: datetime
    updated_at: datetime
    ended_at: datetime | None = None

    @field_serializer("event_date")
    def _serialize_date(self, value: date) -> str:
        return value.isoformat()

    @field_serializer("start_time", "end_time")
    def _serialize_time(self, value: time | None) -> str | None:
        return value.isoformat() if value else None

    @field_serializer("created_at", "updated_at", "ended_at")
    def _dates_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        return value.replace(tzinfo=timezone.utc)


class EventAdminOut(EventOut):
    """Admin-only event payload — includes the secret check-in token
    and attendance submission state."""

    check_in_token: str
    attendance_submitted_at: datetime | None = None
    attendance_editable_until: datetime | None = None
    attendance_locked: bool

    @field_serializer("attendance_submitted_at", "attendance_editable_until")
    def _submitted_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        return value.replace(tzinfo=timezone.utc)


class EventList(BaseModel):
    items: list[EventOut]
    total: int


class AdminEventList(BaseModel):
    items: list[EventAdminOut]
    total: int


class EventRegistrationCreate(BaseModel):
    """Public signup payload — deliberately has no payment fields, so
    participants can never mark themselves as paid."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    college: str | None = Field(default=None, max_length=200)
    roll_no: str | None = Field(default=None, max_length=50)


class EventRegistrationAdminCreate(EventRegistrationCreate):
    """Admin panel registration — may record cash-in-person payment.

    - payment_status None  → default logic (waived if free, else pending)
    - "paid"               → cash received now (paid_at stamped)
    - "waived"             → fee waived by admin
    """

    payment_status: Literal["paid", "waived"] | None = None
    payment_reference: str | None = Field(default=None, max_length=100)


class EventRegistrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    participant_name: str
    participant_email: EmailStr
    participant_phone: str | None = None
    participant_college: str | None = None
    participant_roll_no: str | None = None
    registered_at: datetime
    status: RegistrationStatus
    attendance: AttendanceStatus
    checked_in_at: datetime | None = None
    fee_amount: Decimal
    payment_status: PaymentStatus
    payment_reference: str | None = None
    paid_at: datetime | None = None

    @field_serializer("registered_at", "paid_at", "checked_in_at")
    def _dates_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        return value.replace(tzinfo=timezone.utc)


class EventRegistrationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: RegistrationStatus | None = None
    attendance: AttendanceStatus | None = None
    payment_status: PaymentStatus | None = None
    payment_reference: str | None = None


class CheckInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class CheckInResponse(BaseModel):
    participant_name: str
    already_checked_in: bool


class EventCheckInInfo(BaseModel):
    event_name: str
    event_date: date
    start_time: time
    venue: str
    status: EventStatus


class EventMediaRemove(BaseModel):
    model_config = ConfigDict(extra="forbid")

    urls: list[str] = Field(min_length=1)
    type: Literal["photos", "videos"]
