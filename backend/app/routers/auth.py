from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import config
from app.core.security import (
    COOKIE_NAME,
    create_access_token,
    get_current_admin,
)
from app.db.session import get_db
from app.models.admin import Admin
from app.schemas.admin import AdminOut
from app.schemas.auth import LoginRequest
from app.services.auth import authenticate_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AdminOut)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    admin = authenticate_admin(db, body.email, body.password)
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(admin)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=config.jwt_expires_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return admin


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"message": "logged out"}


@router.get("/me", response_model=AdminOut)
def me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin

