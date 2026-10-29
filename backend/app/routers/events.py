import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import config
from app.core.ratelimit import SlidingWindowLimiter, client_key
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.admin import Admin
from app.models.event import Event
from app.schemas.event import (
    AdminEventList,
    CheckInRequest,
    CheckInResponse,
    EventAdminOut,
    EventCheckInInfo,
    EventCreate,
    EventList,
    EventMediaRemove,
    EventOut,
    EventRegistrationAdminCreate,
    EventRegistrationCreate,
    EventRegistrationOut,
    EventRegistrationUpdate,
    EventUpdate,
)
from app.services.events import (
    add_event_media,
    cancel_registration,
    check_in_participant,
    create_event,
    delete_event_permanently,
    end_event,
    get_checkin_event_info,
    get_event,
    get_registration_by_id,
    list_event_registrations,
    list_events,
    register_participant_for_event,
    remove_event_cover,
    remove_event_media,
    reopen_event,
    send_due_reminders,
    send_registration_confirmation,
    set_event_cover,
    submit_attendance,
    update_event,
    update_registration,
)
from app.services.notifications import record_notification

# Public signups & check-ins are rate limited per IP (in-memory sliding window).
registration_limiter = SlidingWindowLimiter(
    max_events=config.registration_rate_limit_per_min
)


def _event_or_404():
    """Dependency: resolve {event_id} to an Event or raise 404."""

    def dep(event_id: uuid.UUID, db: Session = Depends(get_db)) -> Event:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found",
            )
        return event

    return dep


# --- Public: /api/events ---

public_router = APIRouter(prefix="/api/events", tags=["events"])


@public_router.get("", response_model=EventList)
def list_public_events(
    event_status: Literal["upcoming", "ongoing", "past"] | None = Query(
        default="upcoming", alias="status"
    ),
    event_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    events, total = list_events(
        db, status=event_status, event_type=event_type, limit=limit, offset=offset
    )
    return EventList(items=events, total=total)


@public_router.get("/{event_id}", response_model=EventOut)
def get_public_event(
    event: Event = Depends(_event_or_404()),
):
    return event


@public_router.post(
    "/{event_id}/register",
    response_model=EventRegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
def public_register_participant(
    body: EventRegistrationCreate,
    request: Request,
    db: Session = Depends(get_db),
    event: Event = Depends(_event_or_404()),
):
    registration_limiter.check(client_key(request))
    result = register_participant_for_event(db, event, body)
    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )
    record_notification(
        db,
        "event_registration_created",
        f"{result.participant_name} registered for '{event.name}'",
    )
    send_registration_confirmation(event, result)
    return result


# --- Check-in: /api/check-in ---

checkin_router = APIRouter(prefix="/api/check-in", tags=["check-in"])


# Manual trigger for the reminder pass (admin-only; handy right after deploy).
# Defined before /{token} so "run-reminders" is never read as a token.
@checkin_router.post("/run-reminders")
def run_reminders_now(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    processed = send_due_reminders(db)
    return {"message": f"Processed {processed} reminder batch(es)"}


@checkin_router.get("/{token}", response_model=EventCheckInInfo)
def checkin_event_info(
    token: str,
    db: Session = Depends(get_db),
):
    event = get_checkin_event_info(db, token)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid check-in code",
        )
    return EventCheckInInfo(
        event_name=event.name,
        event_date=event.event_date,
        start_time=event.start_time,
        venue=event.venue,
        status=event.status,
    )


@checkin_router.post("/{token}", response_model=CheckInResponse)
def checkin_mark_present(
    token: str,
    body: CheckInRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    registration_limiter.check(client_key(request))
    result = check_in_participant(db, token, body.email)
    if result == "unknown-token":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid check-in code",
        )
    if result == "not-open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in is only open while the event is ongoing",
        )
    if result == "not-registered":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active registration found for this email",
        )
    registration, already = result
    return CheckInResponse(
        participant_name=registration.participant_name,
        already_checked_in=already,
    )


# --- Admin: /api/admin/events ---

admin_router = APIRouter(prefix="/api/admin/events", tags=["events-admin"])


@admin_router.get("", response_model=AdminEventList)
def admin_list_events(
    event_status: str | None = Query(default=None, alias="status"),
    event_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    events, total = list_events(
        db,
        status=event_status,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )
    return AdminEventList(items=events, total=total)


@admin_router.get("/{event_id}", response_model=EventAdminOut)
def admin_get_event(
    event: Event = Depends(_event_or_404()),
):
    """Admin detail — includes check_in_token (never exposed publicly)."""
    return event


@admin_router.post(
    "", response_model=EventAdminOut, status_code=status.HTTP_201_CREATED
)
def admin_create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    event = create_event(db, body)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create event",
        )
    record_notification(db, "event_created", f"Event '{event.name}' was created")
    return event


@admin_router.patch("/{event_id}", response_model=EventAdminOut)
def admin_update_event(
    body: EventUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    updated = update_event(db, event, body)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update event",
        )
    record_notification(db, "event_updated", f"Event '{updated.name}' was updated")
    return updated


@admin_router.post("/{event_id}/attendance/submit", response_model=EventAdminOut)
def admin_submit_attendance(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    was_submitted = event.attendance_submitted_at is not None
    submitted = submit_attendance(db, event)
    if submitted is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance is locked (24h after submission have passed)",
        )
    verb = "re-submitted" if was_submitted else "submitted"
    record_notification(
        db, "event_updated", f"Attendance {verb} for '{submitted.name}'"
    )
    return submitted


@admin_router.post("/{event_id}/end", response_model=EventAdminOut)
def admin_end_event(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    ended = end_event(db, event)
    if ended is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is already over",
        )
    record_notification(db, "event_ended", f"Event '{ended.name}' was ended")
    return ended


@admin_router.post("/{event_id}/reopen", response_model=EventAdminOut)
def admin_reopen_event(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    result = reopen_event(db, event)
    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=result,
        )
    record_notification(
        db, "event_reopened", f"Event '{result.name}' was reopened"
    )
    return result


@admin_router.delete("/{event_id}")
def admin_delete_event(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    name = event.name
    delete_event_permanently(db, event)
    record_notification(
        db, "event_deleted", f"Event '{name}' was permanently deleted"
    )
    return {"message": f"'{name}' was permanently deleted"}


@admin_router.post("/{event_id}/photos", response_model=EventAdminOut)
async def admin_upload_photos(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    try:
        updated = add_event_media(db, event, files, "photos")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    record_notification(
        db, "event_media_added", f"Photos added to event '{updated.name}'"
    )
    return updated


@admin_router.post("/{event_id}/videos", response_model=EventAdminOut)
async def admin_upload_videos(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    try:
        updated = add_event_media(db, event, files, "videos")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    record_notification(
        db, "event_media_added", f"Videos added to event '{updated.name}'"
    )
    return updated


@admin_router.delete("/{event_id}/media", response_model=EventAdminOut)
def admin_remove_media(
    body: EventMediaRemove,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    return remove_event_media(db, event, body.urls, body.type)


@admin_router.post("/{event_id}/cover", response_model=EventAdminOut)
async def admin_upload_cover(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    data = await file.read()
    try:
        return set_event_cover(db, event, data, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@admin_router.delete("/{event_id}/cover", response_model=EventAdminOut)
def admin_remove_cover(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    return remove_event_cover(db, event)


# --- Registrations (admin-managed) ---


@admin_router.post(
    "/{event_id}/register",
    response_model=EventRegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_register_participant(
    body: EventRegistrationAdminCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    result = register_participant_for_event(db, event, body)
    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )
    record_notification(
        db,
        "event_registration_created",
        f"{result.participant_name} registered for '{event.name}'",
    )
    send_registration_confirmation(event, result)
    return result


@admin_router.get(
    "/{event_id}/registrations", response_model=list[EventRegistrationOut]
)
def admin_list_registrations(
    reg_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    return list_event_registrations(db, event.id, status=reg_status)


@admin_router.patch(
    "/{event_id}/registrations/{registration_id}",
    response_model=EventRegistrationOut,
)
def admin_update_registration(
    registration_id: uuid.UUID,
    body: EventRegistrationUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    registration = get_registration_by_id(db, registration_id)
    if registration is None or registration.event_id != event.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found",
        )
    if (
        body.attendance is not None
        and body.attendance != registration.attendance
        and event.attendance_locked
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance is locked (24h after submission)",
        )
    updated = update_registration(
        db,
        registration,
        status=body.status,
        attendance=body.attendance,
        payment_status=body.payment_status,
        payment_reference=body.payment_reference,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update registration",
        )
    return updated


@admin_router.delete(
    "/{event_id}/registrations/{registration_id}",
    response_model=EventRegistrationOut,
)
def admin_cancel_registration(
    registration_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    event: Event = Depends(_event_or_404()),
):
    registration = get_registration_by_id(db, registration_id)
    if registration is None or registration.event_id != event.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found",
        )
    if (
        event.status == "past"
        and event.attendance_submitted_at is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration cannot be cancelled after attendance has "
            "been submitted",
        )
    cancelled = cancel_registration(db, registration)
    if cancelled is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration is already cancelled",
        )
    record_notification(
        db,
        "event_registration_cancelled",
        f"Registration cancelled for event '{event.name}'",
    )
    return cancelled
