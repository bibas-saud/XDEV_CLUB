import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.core.storage import ID_CARD_URL_EXPIRY_SECONDS
from app.db.session import get_db
from app.models.admin import Admin
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberDetail, MemberUpdate
from app.services.members import (
    create_member,
    deactivate_member,
    get_member,
    get_member_signed_card_url,
    list_active_members,
    list_all_members,
    list_past_members,
    purge_member,
    reactivate_member,
    set_member_id_card,
    set_member_photo,
    update_member,
)
from app.services.notifications import record_notification

router = APIRouter(prefix="/api/members", tags=["members"])


def _get_member_or_404(
    member_id: uuid.UUID, db: Session = Depends(get_db)
) -> Member:
    member = get_member(db, member_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )
    return member


@router.get("", response_model=list[MemberDetail])
def list_active(db: Session = Depends(get_db)):
    return list_active_members(db)


@router.get("/past", response_model=list[MemberDetail])
def list_past(db: Session = Depends(get_db)):
    return list_past_members(db)


@router.get("/all", response_model=list[MemberDetail])
def list_every_member(db: Session = Depends(get_db)):
    return list_all_members(db)


@router.get("/{member_id}", response_model=MemberDetail)
def get_single(member: Member = Depends(_get_member_or_404)):
    return member


@router.post(
    "", response_model=MemberDetail, status_code=status.HTTP_201_CREATED
)
def create(
    body: MemberCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    member = create_member(db, body)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    record_notification(db, "member_added", f"{member.full_name} joined the club")
    return member


@router.patch("/{member_id}", response_model=MemberDetail)
def update(
    body: MemberUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    role_changed = (
        "role" in body.model_fields_set and body.role is not None and body.role != member.role
    )
    try:
        updated = update_member(db, member, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    if role_changed:
        record_notification(
            db,
            "member_updated",
            f"{updated.full_name}'s role changed to {updated.role}",
        )
    else:
        record_notification(
            db, "member_updated", f"{updated.full_name}'s details were updated"
        )
    return updated


@router.delete("/{member_id}", response_model=MemberDetail)
def deactivate(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    deactivated = deactivate_member(db, member)
    if deactivated is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Member is already deactivated",
        )
    record_notification(db, "member_deactivated", f"{deactivated.full_name} left the club")
    return deactivated


@router.post("/{member_id}/reactivate", response_model=MemberDetail)
def reactivate(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    reactivated = reactivate_member(db, member)
    if reactivated is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Member is already active",
        )
    record_notification(db, "member_reactivated", f"{reactivated.full_name} rejoined the club")
    return reactivated


@router.delete("/{member_id}/purge")
def purge(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    name = member.full_name
    deleted = purge_member(db, member)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deactivate the member before permanent deletion",
        )
    record_notification(db, "member_deleted", f"{name} was permanently removed")
    return {"message": f"{name} was permanently deleted"}


@router.post("/{member_id}/photo", response_model=MemberDetail)
async def upload_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    data = await file.read()
    try:
        return set_member_photo(db, member, data, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/{member_id}/id-card", response_model=MemberDetail)
async def upload_id_card(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    data = await file.read()
    try:
        return set_member_id_card(db, member, data, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get("/{member_id}/id-card")
def get_id_card(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    member: Member = Depends(_get_member_or_404),
):
    url = get_member_signed_card_url(member)
    if url is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ID card has been generated for this member",
        )
    return {"url": url, "expires_in": ID_CARD_URL_EXPIRY_SECONDS}
