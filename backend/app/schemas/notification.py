from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    message: str
    is_read: bool
    created_at: datetime

    @field_serializer("created_at")
    def _created_at_utc(self, value: datetime) -> datetime:
        # Stored as naive UTC; emit explicit offset so browsers parse correctly
        return value.replace(tzinfo=timezone.utc)


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread_count: int
