from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.admin import Admin
from app.schemas.invitation import (
    InvitationOut,
    TransferAccept,
    TransferInviteCreate,
)
from app.services.transfer import (
    accept_invitation,
    cancel_invitation,
    create_invitation,
    get_pending_invitation,
    send_invitation_email,
)

router = APIRouter(prefix="/api/ownership", tags=["ownership"])


@router.post("/invitation", response_model=InvitationOut)
def invite_new_admin(
    body: TransferInviteCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    try:
        invitation, raw_token = create_invitation(db, admin, body)
        send_invitation_email(invitation, raw_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    return invitation


@router.get("/invitation", response_model=InvitationOut)
def pending_invitation(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    invitation = get_pending_invitation(db)
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invitation",
        )
    return invitation


@router.delete("/invitation")
def cancel_pending_invitation(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    cancelled = cancel_invitation(db)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invitation",
        )
    return {"message": "Invitation cancelled"}


@router.post("/invitation/accept")
def accept_transfer_invitation(
    body: TransferAccept,
    db: Session = Depends(get_db),
):
    try:
        new_admin = accept_invitation(
            db, body.token, body.full_name, body.password
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return {
        "message": "Ownership transferred. You can now log in.",
        "email": new_admin.email,
    }
