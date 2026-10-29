import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from email.message import EmailMessage

import smtplib
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import config
from app.core.storage import (
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    delete_file,
    public_url,
    upload_file,
)
from app.models.event import Event
from app.models.event_registration import EventRegistration
from app.schemas.event import (
    REOPEN_WINDOW_HOURS,
    EventCreate,
    EventRegistrationCreate,
    EventUpdate,
)


def compute_event_status(event: Event) -> str:
    """Ended events are past immediately; otherwise schedule decides."""
    if event.ended_at is not None:
        return "past"

    now = datetime.now()
    event_datetime = datetime.combine(event.event_date, event.start_time)

    if event.end_time:
        event_end = datetime.combine(event.event_date, event.end_time)
    else:
        event_end = event_datetime + timedelta(hours=2)

    if now > event_end:
        return "past"
    elif now >= event_datetime:
        return "ongoing"
    else:
        return "upcoming"


def _json_safe_prizes(prizes: dict | None) -> dict | None:
    """Convert prizes to plain JSON-serializable types (Decimal is not)."""
    if prizes is None:
        return None
    safe: dict = {}
    for place, info in prizes.items():
        if isinstance(info, dict):
            amount = info.get("amount")
            description = info.get("description", "")
        else:
            amount = getattr(info, "amount", None)
            description = getattr(info, "description", "")
        safe[str(place)] = {
            "amount": float(amount) if isinstance(amount, Decimal) else amount,
            "description": description or "",
        }
    return safe


def update_all_event_statuses(db: Session) -> int:
    """Recompute stored statuses from ended_at + schedule. Auto-sync hook."""
    events = list(db.scalars(select(Event)).all())
    updated = 0
    for event in events:
        new_status = compute_event_status(event)
        if event.status != new_status:
            event.status = new_status
            updated += 1
    if updated:
        db.commit()
    return updated


def list_events(
    db: Session,
    status: str | None = None,
    event_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Event], int]:
    update_all_event_statuses(db)

    query = select(Event).options(selectinload(Event.registrations))

    if status:
        query = query.where(Event.status == status)

    if event_type:
        query = query.where(Event.type == event_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    # Per-status ordering: upcoming/ongoing soonest-start first,
    # ended most-recently-finished first, unfiltered lists recent-first.
    start_cols = (Event.event_date, Event.start_time)
    if status in ("upcoming", "ongoing"):
        query = query.order_by(*[col.asc() for col in start_cols])
    elif status == "past":
        query = query.order_by(*[col.desc() for col in start_cols])
    else:
        query = query.order_by(Event.event_date.desc(), Event.start_time.desc())

    events = list(
        db.scalars(query.offset(offset).limit(limit)).all()
    )
    return events, int(total)


def get_event(db: Session, event_id: uuid.UUID) -> Event | None:
    update_all_event_statuses(db)
    return db.scalar(
        select(Event)
        .options(selectinload(Event.registrations))
        .where(Event.id == event_id)
    )


def create_event(db: Session, data: EventCreate) -> Event:
    values = data.model_dump()
    values["prizes"] = _json_safe_prizes(values.get("prizes"))

    event = Event(**values)
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(event)
    return event


def update_event(
    db: Session, event: Event, data: EventUpdate
) -> Event | None:
    updates = data.model_dump(exclude_unset=True)

    if "prizes" in updates:
        updates["prizes"] = _json_safe_prizes(updates["prizes"])

    if "type" in updates and updates["type"] == "workshop":
        updates["prize_structure"] = None
        updates["prizes"] = None

    for field, value in updates.items():
        setattr(event, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(event)
    return event


# --- Lifecycle: end / reopen / permanent delete ---


def end_event(db: Session, event: Event) -> Event | None:
    if event.ended_at is not None or compute_event_status(event) == "past":
        return None
    event.ended_at = datetime.now()
    event.status = "past"
    db.commit()
    db.refresh(event)
    return event


def reopen_event(db: Session, event: Event) -> Event | str:
    """Undo a manual 'End event'. Only within 24h of ending."""
    if event.ended_at is None:
        return "Event is not ended"
    elapsed = datetime.now() - event.ended_at
    if elapsed > timedelta(hours=REOPEN_WINDOW_HOURS):
        return "Reopen window has expired (24 hours after ending)"
    # A naturally-past schedule stays past; clearing the flag lets the
    # auto-sync decide from date/time again.
    event.ended_at = None
    event.status = compute_event_status(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event_permanently(db: Session, event: Event) -> bool:
    """Hard-delete an event plus its registrations and stored media.

    Storage cleanup is best-effort: the DB row is removed regardless.
    """
    urls = list(event.photos) + list(event.videos)
    if event.cover_image_url:
        urls.append(event.cover_image_url)
    for url in urls:
        try:
            bucket = config.supabase_events_bucket
            if f"/{bucket}/" in url:
                path = url.split(f"/{bucket}/", 1)[1]
                delete_file(path)
        except Exception:
            pass

    db.delete(event)
    db.commit()
    return True


# --- Media ---


def add_event_media(
    db: Session,
    event: Event,
    files: list,
    media_type: str,
) -> Event:
    for file in files:
        data = file.file.read()
        content_type = file.content_type or ""

        if media_type == "photos":
            if content_type not in ALLOWED_IMAGE_TYPES:
                raise ValueError(
                    f"Unsupported image type '{content_type}'. "
                    f"Allowed: {sorted(ALLOWED_IMAGE_TYPES)}"
                )
            if len(data) > MAX_IMAGE_SIZE_BYTES:
                raise ValueError("Image exceeds maximum size of 5 MB")
            extension = content_type.split("/")[-1]
            path = f"events/{event.id}/photos/{uuid.uuid4()}.{extension}"
        else:
            if content_type not in ALLOWED_VIDEO_TYPES:
                raise ValueError(
                    f"Unsupported video type '{content_type}'. "
                    f"Allowed: {sorted(ALLOWED_VIDEO_TYPES)}"
                )
            if len(data) > MAX_VIDEO_SIZE_BYTES:
                raise ValueError("Video exceeds maximum size of 100 MB")
            extension = content_type.split("/")[-1]
            path = f"events/{event.id}/videos/{uuid.uuid4()}.{extension}"

        upload_file(path, data, content_type)
        url = public_url(path)

        if media_type == "photos":
            event.photos = event.photos + [url]
        else:
            event.videos = event.videos + [url]

    db.commit()
    db.refresh(event)
    return event


def remove_event_media(
    db: Session,
    event: Event,
    urls: list[str],
    media_type: str,
) -> Event:
    if media_type == "photos":
        current = list(event.photos)
    else:
        current = list(event.videos)

    for url in urls:
        if url in current:
            current.remove(url)
            # Try to delete from storage, best-effort
            try:
                bucket = config.supabase_events_bucket
                if f"/{bucket}/" in url:
                    path = url.split(f"/{bucket}/", 1)[1]
                    delete_file(path)
            except Exception:
                pass

    if media_type == "photos":
        event.photos = current
    else:
        event.videos = current

    db.commit()
    db.refresh(event)
    return event


# --- Cover image ---


def set_event_cover(
    db: Session, event: Event, data: bytes, content_type: str
) -> Event:
    """Upload a banner image and store its public URL.

    Always uploads to the same path per extension (upsert) so replacing
    the cover keeps a single canonical URL.
    """
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(
            f"Unsupported image type '{content_type}'. "
            f"Allowed: {sorted(ALLOWED_IMAGE_TYPES)}"
        )
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image exceeds maximum size of 5 MB")

    extension = content_type.split("/")[-1]
    path = f"events/{event.id}/cover.{extension}"
    upload_file(path, data, content_type)

    event.cover_image_url = public_url(path)
    db.commit()
    db.refresh(event)
    return event


def remove_event_cover(db: Session, event: Event) -> Event:
    """Clear the cover; best-effort storage delete of known extensions."""
    for extension in ("jpeg", "png", "webp"):
        try:
            delete_file(f"events/{event.id}/cover.{extension}")
        except Exception:
            pass
    event.cover_image_url = None
    db.commit()
    db.refresh(event)
    return event


# --- Registration functions ---


def _resolve_payment_status(
    event: Event, requested: str | None
) -> tuple[str, bool]:
    """Returns (payment_status, mark_paid_now)."""
    if event.is_free:
        return "waived", False
    if requested == "paid":
        # Cash received in person at registration time.
        return "paid", True
    if requested == "waived":
        return "waived", False
    return "pending", False


def register_participant_for_event(
    db: Session,
    event: Event,
    data: EventRegistrationCreate,
) -> EventRegistration | str:
    if event.status != "upcoming":
        return "Can only register for upcoming events"

    # Registration closes 2 hours before the event starts.
    if not event.registration_open:
        return "Registration is closed"

    count = get_event_registration_count(db, event.id)
    if count >= event.max_capacity:
        return "Event is at full capacity"

    email = data.email.lower()
    existing = get_registration(db, event.id, email)
    if existing and existing.status != "cancelled":
        return "This email is already registered for this event"

    # Unique constraint allows only one row per (event, email), so
    # re-registration after cancellation reactivates the same row.
    requested_payment = getattr(data, "payment_status", None)
    payment_status, mark_paid = _resolve_payment_status(event, requested_payment)
    values = dict(
        participant_name=data.name.strip(),
        participant_email=email,
        participant_phone=data.phone,
        participant_college=data.college,
        participant_roll_no=data.roll_no,
        fee_amount=event.fee_amount or 0,
        payment_status=payment_status,
        paid_at=datetime.now() if mark_paid else None,
        payment_reference=getattr(data, "payment_reference", None),
    )

    if existing is not None:
        for field, value in values.items():
            setattr(existing, field, value)
        existing.status = "registered"
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "Registration failed"
        db.refresh(existing)
        return existing

    registration = EventRegistration(event_id=event.id, **values)
    db.add(registration)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return "Registration failed"
    db.refresh(registration)
    return registration


def cancel_registration(
    db: Session, registration: EventRegistration
) -> EventRegistration | None:
    event = db.get(Event, registration.event_id)
    if (
        event is not None
        and compute_event_status(event) == "past"
        and event.attendance_submitted_at is not None
    ):
        # Final records: attendance has been submitted for a finished event.
        return None
    if registration.status == "cancelled":
        return None
    registration.status = "cancelled"
    db.commit()
    db.refresh(registration)
    return registration


def submit_attendance(db: Session, event: Event) -> Event | None:
    """Lock in attendance.

    - First submission stamps attendance_submitted_at.
    - Resubmission is allowed during the 24h edit window; the deadline
      stays anchored to the FIRST submission (no extension).
    - After 24h the attendance is locked and resubmission is rejected.
    """
    if event.attendance_submitted_at is not None:
        if event.attendance_locked:
            return None
        # Resubmit within the window — keep original stamp, no extension.
        db.commit()
        db.refresh(event)
        return event
    event.attendance_submitted_at = datetime.now()
    db.commit()
    db.refresh(event)
    return event


def get_registration(
    db: Session, event_id: uuid.UUID, participant_email: str
) -> EventRegistration | None:
    return db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.participant_email == participant_email.lower(),
        )
    )


def get_registration_by_id(
    db: Session, registration_id: uuid.UUID
) -> EventRegistration | None:
    return db.scalar(
        select(EventRegistration).where(
            EventRegistration.id == registration_id
        )
    )


def list_event_registrations(
    db: Session,
    event_id: uuid.UUID,
    status: str | None = None,
) -> list[EventRegistration]:
    query = select(EventRegistration).where(
        EventRegistration.event_id == event_id
    )
    if status:
        query = query.where(EventRegistration.status == status)
    return list(db.scalars(query.order_by(EventRegistration.registered_at)).all())


def get_event_registration_count(db: Session, event_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count())
        .select_from(EventRegistration)
        .where(
            EventRegistration.event_id == event_id,
            EventRegistration.status != "cancelled",
        )
    ) or 0


def update_registration(
    db: Session,
    registration: EventRegistration,
    status: str | None = None,
    attendance: str | None = None,
    payment_status: str | None = None,
    payment_reference: str | None = None,
) -> EventRegistration | None:
    # Attendance edits freeze 24h after submission (payment/status still fine).
    if attendance is not None and attendance != registration.attendance:
        event = db.get(Event, registration.event_id)
        if event is not None and event.attendance_locked:
            return None
    if status is not None:
        registration.status = status
    if attendance is not None:
        registration.attendance = attendance
        if attendance == "present" and registration.checked_in_at is None:
            registration.checked_in_at = datetime.now()
    if payment_status is not None:
        registration.payment_status = payment_status
        if payment_status == "paid" and registration.paid_at is None:
            registration.paid_at = datetime.now()
    if payment_reference is not None:
        registration.payment_reference = payment_reference

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(registration)
    return registration


# --- Check-in (participants scan the screen QR, then enter their email) ---


def get_checkin_event_info(db: Session, token: str) -> Event | None:
    return db.scalar(select(Event).where(Event.check_in_token == token))


def check_in_participant(
    db: Session, token: str, email: str
) -> tuple[EventRegistration, bool] | str:
    """Mark a participant present.

    Returns (registration, already_checked_in) on success, or an error
    string for user display.
    """
    event = get_checkin_event_info(db, token)
    if event is None:
        return "unknown-token"

    update_all_event_statuses(db)
    if event.status != "ongoing":
        return "not-open"

    registration = get_registration(db, event.id, email)
    if registration is None or registration.status == "cancelled":
        return "not-registered"

    if registration.attendance == "present":
        return registration, True

    registration.attendance = "present"
    registration.checked_in_at = datetime.now()
    db.commit()
    db.refresh(registration)
    return registration, False


# --- Emails (best-effort) ---


def _smtp_configured() -> bool:
    return all(
        (
            config.smtp_host,
            config.smtp_username,
            config.smtp_password,
            config.smtp_from,
        )
    )


def _send_email(message: EmailMessage) -> None:
    with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
        server.starttls()
        server.login(config.smtp_username, config.smtp_password)
        server.send_message(message)


def _when_line(event: Event) -> str:
    when = f"{event.event_date.isoformat()} {event.start_time.strftime('%H:%M')}"
    if event.end_time:
        when += f" - {event.end_time.strftime('%H:%M')}"
    return when


def send_registration_confirmation(
    event: Event, registration: EventRegistration
) -> None:
    """Email the participant after signup. Best-effort: never raises."""
    if not _smtp_configured():
        return

    fee_line = "Entry: FREE" if event.is_free else (
        f"Entry fee: {event.currency} {event.fee_amount} "
        f"(currently {registration.payment_status})"
    )

    message = EmailMessage()
    message["From"] = config.smtp_from
    message["To"] = registration.participant_email
    message["Subject"] = f"Registration confirmed: {event.name}"
    message.set_content(
        f"Hi {registration.participant_name},\n"
        "\n"
        f"You're registered for {event.name}!\n"
        "\n"
        f"When: {_when_line(event)}\n"
        f"Where: {event.venue}\n"
        f"{fee_line}\n"
        "\n"
        "We'll see you there!\n"
        "- XDEV Club\n"
    )

    try:
        _send_email(message)
    except Exception:
        # Never let mail delivery problems fail a successful registration.
        pass


def send_starting_soon_reminder(
    event: Event, registration: EventRegistration
) -> None:
    """Email a participant 1-2 hours before the event starts. Best-effort."""
    if not _smtp_configured():
        return

    message = EmailMessage()
    message["From"] = config.smtp_from
    message["To"] = registration.participant_email
    message["Subject"] = f"Starting soon: {event.name}"
    message.set_content(
        f"Hi {registration.participant_name},\n"
        "\n"
        f"{event.name} starts in less than two hours!\n"
        "\n"
        f"When: {_when_line(event)}\n"
        f"Where: {event.venue}\n"
        "\n"
        "Please arrive on time. During the event, scan the QR code shown "
        "on the screen to mark your attendance.\n"
        "\n"
        "See you there!\n"
        "- XDEV Club\n"
    )

    try:
        _send_email(message)
    except Exception:
        pass


def send_due_reminders(db: Session) -> int:
    """Email reminders for events starting within 1-2 hours, then stamp.

    Called periodically by the background scheduler. Returns the number
    of events that were processed.
    """
    now = datetime.now()
    processed = 0

    events = list(
        db.scalars(
            select(Event).where(Event.reminder_sent_at.is_(None))
        ).all()
    )
    for event in events:
        start_dt = datetime.combine(event.event_date, event.start_time)
        delta = start_dt - now
        if not timedelta(0) <= delta <= timedelta(hours=2):
            continue

        registrations = list_event_registrations(db, event.id, status="registered")
        for registration in registrations:
            send_starting_soon_reminder(event, registration)

        event.reminder_sent_at = now
        processed += 1

    if processed:
        db.commit()
    return processed
