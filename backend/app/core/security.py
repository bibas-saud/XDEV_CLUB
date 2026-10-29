import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import config
from app.db.session import get_db
from app.models.admin import Admin

ALGORITHM = "HS256"
COOKIE_NAME = "access_token"

ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(admin: Admin) -> str:
    payload = {
        "sub": str(admin.id),
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=config.jwt_expires_minutes),
    }
    return jwt.encode(payload, config.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, config.jwt_secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_current_admin(
    request: Request, db: Session = Depends(get_db)
) -> Admin:
    token = request.cookies.get(COOKIE_NAME)
    payload = decode_access_token(token) if token else None
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        admin_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    admin = db.scalar(select(Admin).where(Admin.id == admin_id))
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return admin

