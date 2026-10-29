from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer

MemberRole = Literal[
    "member",
    "president",
    "vice-president",
    "secretary",
    "treasurer",
    "faculty-advisor",
]


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str


class MemberDetail(MemberOut):
    joined_at: datetime
    left_at: datetime | None = None
    is_active: bool
    role: MemberRole
    photo_url: str | None = None
    has_id_card: bool
    department: str | None = None
    course: str | None = None
    semester: int | None = None
    roll_no: str | None = None
    phone: str | None = None
    description: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None

    @field_serializer("joined_at", "left_at")
    def _dates_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        return value.replace(tzinfo=timezone.utc)


class MemberCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str
    email: EmailStr
    role: MemberRole = "member"
    department: str | None = None
    course: str | None = None
    semester: int | None = Field(default=None, ge=1, le=12)
    roll_no: str | None = None
    phone: str | None = None
    description: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None


class MemberUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = None
    email: EmailStr | None = None
    role: MemberRole | None = None
    joined_at: datetime | None = None
    left_at: datetime | None = None
    department: str | None = None
    course: str | None = None
    semester: int | None = Field(default=None, ge=1, le=12)
    roll_no: str | None = None
    phone: str | None = None
    description: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None
