from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.admin import Admin
from app.schemas.notification import NotificationList
from app.services.notifications import list_notifications, mark_all_read

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationList)
def get_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    items, unread_count = list_notifications(db, limit)
    return NotificationList(items=items, unread_count=unread_count)


@router.post("/mark-read")
def mark_read(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    updated = mark_all_read(db)
    return {"message": "All notifications marked as read", "updated": updated}
