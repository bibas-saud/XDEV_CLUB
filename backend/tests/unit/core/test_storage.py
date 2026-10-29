import pytest

from app.core import storage
from app.core.config import config

pytestmark = pytest.mark.unit


class FakeStorageBucket:
    def __init__(self):
        self.calls = []

    def upload(self, path, data, file_options):
        self.calls.append((path, data, file_options))
        return {"Key": path}


class FakeStorageApi:
    def __init__(self):
        self.bucket_name = None
        self.bucket = FakeStorageBucket()

    def from_(self, bucket_name):
        self.bucket_name = bucket_name
        return self.bucket


def test_public_url_builds_correct_shape(monkeypatch):
    monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
    monkeypatch.setattr(config, "supabase_photos_bucket", "members")

    url = storage.public_url("photos/xyz/image.png")

    assert url == (
        "https://abc.supabase.co/storage/v1/object/public/members/photos/xyz/image.png"
    )


def test_validate_image_accepts_allowed_types():
    for content_type in ("image/jpeg", "image/png", "image/webp"):
        storage.validate_image(content_type, 1024)


def test_validate_image_rejects_disallowed_type():
    with pytest.raises(ValueError, match="Unsupported image type"):
        storage.validate_image("application/pdf", 1024)


def test_validate_image_rejects_oversized_file():
    with pytest.raises(ValueError, match="maximum size"):
        storage.validate_image("image/png", storage.MAX_IMAGE_SIZE_BYTES + 1)


def test_validate_image_restricted_types_rejects_others():
    with pytest.raises(ValueError, match="Unsupported image type"):
        storage.validate_image(
            "image/jpeg", 1024, allowed_types={"image/png"}
        )


def test_validate_image_restricted_types_accepts_match():
    storage.validate_image("image/png", 1024, allowed_types={"image/png"})


def test_get_storage_client_raises_when_unconfigured(monkeypatch):
    monkeypatch.setattr(config, "supabase_project_url", "")
    monkeypatch.setattr(config, "supabase_secret_key", "")

    with pytest.raises(RuntimeError, match="not configured"):
        storage.get_storage_client()


def test_upload_file_uses_bucket_and_upsert(monkeypatch):
    fake_api = FakeStorageApi()
    client = type("FakeClient", (), {"storage": fake_api})()
    monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
    monkeypatch.setattr(config, "supabase_secret_key", "service-key")
    monkeypatch.setattr(config, "supabase_photos_bucket", "members")
    monkeypatch.setattr(storage, "get_storage_client", lambda: client)

    storage.upload_file("photos/xyz/photo.png", b"bytes", "image/png")

    assert fake_api.bucket_name == "members"
    path, data, options = fake_api.bucket.calls[0]
    assert path == "photos/xyz/photo.png"
    assert data == b"bytes"
    assert options == {"content-type": "image/png", "upsert": "true"}


def test_upload_file_targets_explicit_private_bucket(monkeypatch):
    fake_api = FakeStorageApi()
    client = type("FakeClient", (), {"storage": fake_api})()
    monkeypatch.setattr(storage, "get_storage_client", lambda: client)

    storage.upload_file(
        "id-cards/xyz/card.png",
        b"bytes",
        "image/png",
        bucket="id-cards-private",
    )

    assert fake_api.bucket_name == "id-cards-private"
    path, _data, _options = fake_api.bucket.calls[0]
    assert path == "id-cards/xyz/card.png"


def test_create_signed_url_returns_absolute_url(monkeypatch):
    captured = {}

    class FakeBucket:
        def create_signed_url(self, path, expires_in):
            captured["path"] = path
            captured["expires_in"] = expires_in
            return {"signedURL": "/object/sign/id-cards/card.png?token=abc"}

    fake_api = type("FakeApi", (), {"from_": lambda self, name: FakeBucket()})()
    client = type("FakeClient", (), {"storage": fake_api})()
    monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
    monkeypatch.setattr(
        config, "supabase_id_cards_bucket", "id-cards"
    )
    monkeypatch.setattr(storage, "get_storage_client", lambda: client)

    url = storage.create_signed_url("card.png", 600)

    assert captured == {"path": "card.png", "expires_in": 600}
    assert url == (
        "https://abc.supabase.co/storage/v1/object/sign/id-cards/card.png?token=abc"
    )


def test_create_signed_url_passes_full_url_through(monkeypatch):
    class FakeBucket:
        def create_signed_url(self, path, expires_in):
            return {"signedURL": "https://cdn.example.com/full/url"}

    fake_api = type("FakeApi", (), {"from_": lambda self, name: FakeBucket()})()
    client = type("FakeClient", (), {"storage": fake_api})()
    monkeypatch.setattr(storage, "get_storage_client", lambda: client)

    assert storage.create_signed_url("card.png") == "https://cdn.example.com/full/url"


