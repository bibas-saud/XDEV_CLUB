from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer


class TransferInviteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invitee_email: EmailStr
    created_at: datetime
    expires_at: datetime
    is_expired: bool

    @field_serializer("created_at", "expires_at")
    def _dates_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        # Stored as naive UTC; emit explicit offset so browsers parse correctly
        return value.replace(tzinfo=timezone.utc)


class TransferAccept(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1)
    full_name: str = Field(min_length=1)
    password: str = Field(min_length=8)
