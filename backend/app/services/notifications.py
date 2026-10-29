from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification

NOTIFICATION_TYPES = {
    "member_added",
    "member_updated",
    "member_deactivated",
    "member_reactivated",
    "member_deleted",
    "event_created",
    "event_updated",
    "event_ended",
    "event_reopened",
    "event_deleted",
    "event_media_added",
    "event_registration_created",
    "event_registration_cancelled",
}

MAX_LIST_SIZE = 20
ABSOLUTE_MAX_LIST_SIZE = 100


def record_notification(db: Session, notification_type: str, message: str) -> None:
    """Persist an event. Best-effort: never let logging break the action."""
    try:
        db.add(
            Notification(type=notification_type, message=message[:500])
        )
        db.commit()
    except Exception:
        db.rollback()


def list_notifications(
    db: Session, limit: int | None = None
) -> tuple[list[Notification], int]:
    size = max(1, min(limit or MAX_LIST_SIZE, ABSOLUTE_MAX_LIST_SIZE))
    items = list(
        db.scalars(
            select(Notification).order_by(Notification.created_at.desc()).limit(size)
        ).all()
    )
    unread_count = db.scalar(
        select(func.count()).select_from(Notification).where(Notification.is_read.is_(False))
    )
    return items, int(unread_count or 0)


def mark_all_read(db: Session) -> int:
    result = db.execute(
        update(Notification).where(Notification.is_read.is_(False)).values(is_read=True)
    )
    db.commit()
    return result.rowcount or 0
