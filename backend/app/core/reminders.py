"""Background scheduler for "starting soon" reminder emails."""

import asyncio
import contextlib
import logging

from app.core.config import config
from app.db.session import SessionLocal
from app.services.events import send_due_reminders

logger = logging.getLogger(__name__)


async def reminder_loop() -> None:
    """Periodically send reminders for events starting within 2 hours."""
    logger.info("Reminder scheduler started (interval=%ss)", config.reminder_interval_seconds)
    while True:
        try:
            with SessionLocal() as db:
                processed = send_due_reminders(db)
            if processed:
                logger.info("Sent reminders for %s event(s)", processed)
        except Exception:
            logger.exception("Reminder pass failed")
        await asyncio.sleep(config.reminder_interval_seconds)


def start_reminder_task() -> asyncio.Task | None:
    if not config.reminders_enabled:
        logger.info("Reminder scheduler disabled via REMINDERS_ENABLED")
        return None
    return asyncio.create_task(reminder_loop())


def stop_reminder_task(task: asyncio.Task | None) -> None:
    if task is not None:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            pass
