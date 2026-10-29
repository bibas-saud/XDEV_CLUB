from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
