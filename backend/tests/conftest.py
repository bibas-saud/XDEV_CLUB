import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import config
from app.core.security import hash_password
from app.db.session import Base, get_db
from app.main import app
from app.models.admin import Admin
from app.models.member import Member

# Safe dummy test credentials
TEST_ADMIN_EMAIL = "admin@example.com"
TEST_ADMIN_PASSWORD = "TestPassword123!"
TEST_ADMIN_NAME = "Test Admin"
TEST_MEMBER_EMAIL = "member@example.com"


@pytest.fixture(autouse=True)
def env_setup(monkeypatch):
    """Sanitizes environment variables to ensure zero sensitive secrets leak into tests."""
    monkeypatch.setattr(config, "database_url", "sqlite://")
    monkeypatch.setattr(config, "admin_name", TEST_ADMIN_NAME)
    monkeypatch.setattr(config, "admin_email", TEST_ADMIN_EMAIL)
    monkeypatch.setattr(config, "admin_password", TEST_ADMIN_PASSWORD)
    monkeypatch.setattr(
        config, "jwt_secret_key", "test_secret_key_32_characters_long_12345"
    )
    monkeypatch.setattr(config, "jwt_expires_minutes", 1440)
    monkeypatch.setattr(config, "cors_origins", [])


@pytest.fixture
def db_engine():
    """Function-scoped in-memory SQLite engine using StaticPool for total test isolation."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(db_engine):
    """Function-scoped DB session with automatic cleanup per test."""
    session_factory = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden DB dependency."""
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    """Seeds the single admin account in the test database."""
    admin = Admin(
        full_name=TEST_ADMIN_NAME,
        email=TEST_ADMIN_EMAIL,
        password_hash=hash_password(TEST_ADMIN_PASSWORD),
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def member_user(db_session):
    """Seeds an active member record (members have no credentials)."""
    member = Member(
        full_name="Test Member",
        email=TEST_MEMBER_EMAIL,
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(member)
    return member


@pytest.fixture
def authenticated_client(client, admin_user):
    """TestClient pre-authenticated with a valid admin JWT cookie."""
    client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    return client



