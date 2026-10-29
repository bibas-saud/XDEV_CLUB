"""Minimal in-memory sliding-window rate limiter for public endpoints.

Single-process only — sufficient for the club-scale traffic of this app.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    def __init__(self, max_events: int, per_seconds: float = 60.0):
        self.max_events = max_events
        self.per_seconds = per_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        """Raise 429 when `key` exceeds the allowed rate; otherwise record a hit."""
        now = time.monotonic()
        with self._lock:
            window = self._hits[key]
            cutoff = now - self.per_seconds
            while window and window[0] < cutoff:
                window.popleft()
            if len(window) >= self.max_events:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again shortly.",
                )
            window.append(now)


def client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
