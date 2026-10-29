"""Add cover_image_url to the events table.

Non-destructive: only adds a nullable column.
Usage: uv run python -m app.scripts.add_event_cover
"""

from sqlalchemy import text

from app.db.session import SessionLocal


def main() -> None:
    with SessionLocal() as s:
        s.execute(
            text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS "
                "cover_image_url VARCHAR(500)"
            )
        )
        s.commit()

    print("events table now includes: cover_image_url")


if __name__ == "__main__":
    main()
