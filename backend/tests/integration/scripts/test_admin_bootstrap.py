import pytest
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

import app.scripts.admin_bootstrap as bootstrap
from app.core.config import config
from app.core.security import verify_password
from app.models.admin import Admin
from tests.conftest import TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD

pytestmark = pytest.mark.integration


@pytest.fixture
def bootstrap_env(db_engine, monkeypatch):
    monkeypatch.setattr(bootstrap, "engine", db_engine)
    monkeypatch.setattr(
        bootstrap,
        "SessionLocal",
        sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False),
    )


def _all_admins(session):
    return list(session.scalars(select(Admin)).all())


def test_create_admin_inserts_admin_row(db_session):
    admin = bootstrap.create_admin(db_session)
    assert admin.email == TEST_ADMIN_EMAIL
    assert admin.full_name == TEST_ADMIN_NAME
    assert verify_password(TEST_ADMIN_PASSWORD, admin.password_hash)


def test_get_existing_admin_returns_none_when_empty(db_session):
    assert bootstrap.get_existing_admin(db_session) is None


def test_get_existing_admin_returns_admin_row(db_session):
    bootstrap.create_admin(db_session)
    found = bootstrap.get_existing_admin(db_session)
    assert found is not None
    assert found.email == TEST_ADMIN_EMAIL


def test_main_creates_admin_on_empty_db(bootstrap_env):
    bootstrap.main()

    session = bootstrap.SessionLocal()
    admins = _all_admins(session)
    session.close()

    assert len(admins) == 1
    assert admins[0].email == TEST_ADMIN_EMAIL


def test_main_skips_when_admin_already_exists(bootstrap_env):
    session = bootstrap.SessionLocal()
    bootstrap.create_admin(session)
    session.close()

    bootstrap.main()

    session = bootstrap.SessionLocal()
    admins = _all_admins(session)
    session.close()

    assert len(admins) == 1
    assert admins[0].email == TEST_ADMIN_EMAIL


def test_main_skips_when_email_differs_but_admin_exists(bootstrap_env, monkeypatch):
    session = bootstrap.SessionLocal()
    bootstrap.create_admin(session)
    session.close()

    monkeypatch.setattr(config, "admin_email", "different@example.com")
    bootstrap.main()

    session = bootstrap.SessionLocal()
    admins = _all_admins(session)
    diff_admin = session.scalar(
        select(Admin).where(Admin.email == "different@example.com")
    )
    session.close()

    assert diff_admin is None
    assert len(admins) == 1
    assert admins[0].email == TEST_ADMIN_EMAIL
