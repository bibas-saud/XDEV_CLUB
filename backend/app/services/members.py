import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import config
from app.core.storage import (
    ID_CARD_URL_EXPIRY_SECONDS,
    create_signed_url,
    delete_file,
    public_url,
    upload_file,
    validate_image,
)
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate

_IMAGE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
_ID_CARD_TYPES = {"image/png"}


def _as_naive(value: datetime) -> datetime:
    return value.replace(tzinfo=None) if value.tzinfo else value


def list_all_members(db: Session) -> list[Member]:
    return list(db.scalars(select(Member).order_by(Member.joined_at)).all())


def list_active_members(db: Session) -> list[Member]:
    return list(
        db.scalars(
            select(Member)
            .where(Member.left_at.is_(None))
            .order_by(Member.joined_at)
        ).all()
    )


def list_past_members(db: Session) -> list[Member]:
    return list(
        db.scalars(
            select(Member)
            .where(Member.left_at.is_not(None))
            .order_by(Member.left_at)
        ).all()
    )


def get_member(db: Session, member_id: uuid.UUID) -> Member | None:
    return db.scalar(select(Member).where(Member.id == member_id))


def get_member_by_email(db: Session, email: str) -> Member | None:
    return db.scalar(select(Member).where(Member.email == email.lower()))


_PROFILE_FIELDS = (
    "department",
    "course",
    "semester",
    "roll_no",
    "phone",
    "description",
    "facebook_url",
    "instagram_url",
    "linkedin_url",
    "twitter_url",
)


def create_member(db: Session, data: MemberCreate) -> Member:
    values = data.model_dump()
    values["email"] = values["email"].lower()
    # treat empty strings as "field cleared" for optional text fields
    for field in ("full_name", *_PROFILE_FIELDS):
        if isinstance(values.get(field), str):
            value = values[field].strip()
            values[field] = value or None

    member = Member(**values)
    db.add(member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(member)
    return member


def update_member(
    db: Session, member: Member, data: MemberUpdate
) -> Member | None:
    updates = data.model_dump(exclude_unset=True)

    if "email" in updates:
        new_email = updates["email"].lower()
        existing = get_member_by_email(db, new_email)
        if existing is not None and existing.id != member.id:
            return None
        updates["email"] = new_email

    if updates.get("joined_at") is not None:
        updates["joined_at"] = _as_naive(updates["joined_at"])

    if updates.get("left_at") is not None:
        if member.is_active:
            raise ValueError(
                "Left date can only be set for deactivated members"
            )
        updates["left_at"] = _as_naive(updates["left_at"])

    # treat empty strings as "field cleared" for optional text fields
    for field in ("full_name", *_PROFILE_FIELDS):
        if field in updates and isinstance(updates[field], str):
            value = updates[field].strip()
            updates[field] = value or None

    joined = updates.get("joined_at", member.joined_at) or member.joined_at
    left = updates.get("left_at", member.left_at)
    if left is not None and left < joined:
        raise ValueError("Left date cannot be before the joined date")

    for field, value in updates.items():
        setattr(member, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(member)
    return member


def deactivate_member(db: Session, member: Member) -> Member | None:
    if not member.is_active:
        return None

    member.left_at = func.now()
    db.commit()
    db.refresh(member)
    return member


def reactivate_member(db: Session, member: Member) -> Member | None:
    if member.is_active:
        return None

    member.left_at = None
    db.commit()
    db.refresh(member)
    return member


def purge_member(db: Session, member: Member) -> bool:
    """Hard-delete a deactivated member along with their stored files.

    Returns False when the member is still active (must be deactivated first).
    Storage cleanup is best-effort: the DB row is removed regardless.
    """
    if member.is_active:
        return False

    for extension in _IMAGE_EXTENSIONS.values():
        try:
            delete_file(f"photos/{member.id}/photo.{extension}")
        except Exception:
            pass
    try:
        delete_file(
            f"id-cards/{member.id}/card.png",
            bucket=config.supabase_id_cards_bucket,
        )
    except Exception:
        pass

    db.delete(member)
    db.commit()
    return True


def set_member_photo(
    db: Session, member: Member, data: bytes, content_type: str
) -> Member:
    validate_image(content_type, len(data))

    extension = _IMAGE_EXTENSIONS[content_type]
    path = f"photos/{member.id}/photo.{extension}"
    upload_file(path, data, content_type)

    member.photo_url = public_url(path)
    db.commit()
    db.refresh(member)
    return member


def set_member_id_card(
    db: Session, member: Member, data: bytes, content_type: str
) -> Member:
    validate_image(content_type, len(data), allowed_types=_ID_CARD_TYPES)

    path = f"id-cards/{member.id}/card.{_IMAGE_EXTENSIONS[content_type]}"
    upload_file(path, data, content_type, bucket=config.supabase_id_cards_bucket)

    member.id_card_path = path
    db.commit()
    db.refresh(member)
    return member


def get_member_signed_card_url(member: Member) -> str | None:
    if member.id_card_path is None:
        return None
    return create_signed_url(
        member.id_card_path, expires_in_seconds=ID_CARD_URL_EXPIRY_SECONDS
    )

