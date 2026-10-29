"""Recreate the events lifecycle schema.

Development-phase migration: drops and recreates both event tables.
- events: deleted_at replaced by ended_at (+ reminder_sent_at, check_in_token)
- event_registrations: attendance model (pending/present/absent), no 'attended' status

Safe to run multiple times. Existing event data is discarded.
Usage: uv run python -m app.scripts.create_events_tables
"""

from sqlalchemy import text

from app.db.session import SessionLocal

EVENTS_TABLE = """
DROP TABLE IF EXISTS event_registrations;
DROP TABLE IF EXISTS events;
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    venue VARCHAR(300) NOT NULL,
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    fee_amount NUMERIC(10, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    max_capacity INTEGER NOT NULL,
    prize_structure VARCHAR(30),
    prizes JSON,
    has_certificates BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_details TEXT,
    photos JSON NOT NULL DEFAULT '[]',
    videos JSON NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    ended_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    check_in_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

REGISTRATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_name VARCHAR(120) NOT NULL,
    participant_email VARCHAR(255) NOT NULL,
    participant_phone VARCHAR(30),
    participant_college VARCHAR(200),
    participant_roll_no VARCHAR(50),
    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'registered',
    attendance VARCHAR(20) NOT NULL DEFAULT 'pending',
    checked_in_at TIMESTAMP,
    fee_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_participant_email UNIQUE (event_id, participant_email)
);
"""

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);",
    "CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);",
    "CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);",
    "CREATE INDEX IF NOT EXISTS idx_events_reminder ON events(reminder_sent_at);",
    "CREATE INDEX IF NOT EXISTS idx_event_reg_event ON event_registrations(event_id);",
    "CREATE INDEX IF NOT EXISTS idx_event_reg_email ON event_registrations(participant_email);",
    "CREATE INDEX IF NOT EXISTS idx_event_reg_status ON event_registrations(status);",
]


def main() -> None:
    with SessionLocal() as s:
        s.execute(text(EVENTS_TABLE))
        s.execute(text(REGISTRATIONS_TABLE))
        for idx in INDEXES:
            s.execute(text(idx))
        s.commit()

    print("events + event_registrations recreated with the lifecycle/attendance schema")
    print("Lifecycle: ended_at | reminder_sent_at | check_in_token; attendance tracking")


if __name__ == "__main__":
    main()
