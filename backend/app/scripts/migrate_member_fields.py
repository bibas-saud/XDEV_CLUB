"""One-time migration: add extended profile columns to the existing members table.

Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
Usage: uv run python -m app.scripts.migrate_member_fields
"""

from sqlalchemy import text

from app.db.session import SessionLocal

COLUMNS = [
    ("department", "VARCHAR(120)"),
    ("course", "VARCHAR(120)"),
    ("semester", "INTEGER"),
    ("roll_no", "VARCHAR(50)"),
    ("phone", "VARCHAR(30)"),
    ("description", "TEXT"),
    ("facebook_url", "VARCHAR(255)"),
    ("instagram_url", "VARCHAR(255)"),
    ("linkedin_url", "VARCHAR(255)"),
    ("twitter_url", "VARCHAR(255)"),
]


def main() -> None:
    with SessionLocal() as s:
        for name, col_type in COLUMNS:
            s.execute(
                text(
                    f"ALTER TABLE members ADD COLUMN IF NOT EXISTS {name} {col_type}"
                )
            )
        s.commit()

    added = ", ".join(name for name, _ in COLUMNS)
    print(f"members table now includes: {added}")


if __name__ == "__main__":
    main()
