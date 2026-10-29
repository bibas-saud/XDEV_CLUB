from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.admin import Admin


def authenticate_admin(
    db: Session, email: str, password: str
) -> Admin | None:
    admin = db.scalar(select(Admin).where(Admin.email == email.lower()))
    if admin is None:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin
