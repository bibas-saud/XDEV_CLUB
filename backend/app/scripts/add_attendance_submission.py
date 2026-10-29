"""Add attendance submission tracking to the events table.

Non-destructive: only adds a nullable column.
Usage: uv run python -m app.scripts.add_attendance_submission
"""

from sqlalchemy import text

from app.db.session import SessionLocal

COLUMNS = [
    ("attendance_submitted_at", "TIMESTAMP"),
]


def main() -> None:
    with SessionLocal() as s:
        for name, col_type in COLUMNS:
            s.execute(
                text(
                    f"ALTER TABLE events ADD COLUMN IF NOT EXISTS {name} {col_type}"
                )
            )
        s.commit()

    added = ", ".join(name for name, _ in COLUMNS)
    print(f"events table now includes: {added}")


if __name__ == "__main__":
    main()
