import pytest
import app.db.session as session_module

pytestmark = pytest.mark.integration


class FakeSession:
    def __init__(self):
        self.closed = False

    def close(self):
        self.closed = True


def test_get_db_yields_session_and_closes_it(monkeypatch):
    fake = FakeSession()
    monkeypatch.setattr(session_module, "SessionLocal", lambda: fake)

    gen = session_module.get_db()
    yielded = next(gen)

    assert yielded is fake
    assert fake.closed is False

    gen.close()
    assert fake.closed is True
