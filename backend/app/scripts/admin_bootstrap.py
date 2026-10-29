from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401 - registers every model on Base.metadata
from app.core.config import config
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.admin import Admin


def get_existing_admin(session: Session) -> Admin | None:
    return session.scalar(select(Admin))


def create_admin(session: Session) -> Admin:
    admin = Admin(
        full_name=config.admin_name,
        email=config.admin_email,
        password_hash=hash_password(config.admin_password),
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


def main() -> None:
    Base.metadata.create_all(engine)

    with SessionLocal() as session:
        existing = get_existing_admin(session)
        if existing is not None:
            print(f"Admin already exists ({existing.email}), skipping...")
            return

        admin = create_admin(session)
        print(f"Admin user created: {admin.email} (full_name: {admin.full_name})")


if __name__ == "__main__":
    main()  # pragma: no cover

