from supabase import Client, create_client

from app.core.config import config

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024
ID_CARD_URL_EXPIRY_SECONDS = 3600


def get_storage_client() -> Client:
    if not config.supabase_project_url or not config.supabase_secret_key:
        raise RuntimeError(
            "Supabase storage is not configured. "
            "Set SUPABASE_PROJECT_URL and SUPABASE_SECRET_KEY in .env"
        )
    return create_client(config.supabase_project_url, config.supabase_secret_key)


def validate_image(
    content_type: str,
    size_bytes: int,
    allowed_types: set[str] | None = None,
) -> None:
    allowed = allowed_types if allowed_types is not None else ALLOWED_IMAGE_TYPES
    if content_type not in allowed:
        raise ValueError(
            f"Unsupported image type '{content_type}'. "
            f"Allowed: {sorted(allowed)}"
        )
    if size_bytes > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image exceeds maximum size of 5 MB")


def upload_file(
    path: str,
    data: bytes,
    content_type: str,
    bucket: str | None = None,
) -> None:
    bucket_name = bucket if bucket is not None else config.supabase_photos_bucket
    client = get_storage_client()
    client.storage.from_(bucket_name).upload(
        path,
        data,
        {"content-type": content_type, "upsert": "true"},
    )


def public_url(path: str) -> str:
    return (
        f"{config.supabase_project_url}/storage/v1/object/public/"
        f"{config.supabase_photos_bucket}/{path}"
    )


def delete_file(path: str, bucket: str | None = None) -> None:
    bucket_name = bucket if bucket is not None else config.supabase_photos_bucket
    client = get_storage_client()
    client.storage.from_(bucket_name).remove([path])


def create_signed_url(
    path: str,
    expires_in_seconds: int = ID_CARD_URL_EXPIRY_SECONDS,
) -> str:
    client = get_storage_client()
    response = client.storage.from_(
        config.supabase_id_cards_bucket
    ).create_signed_url(path, expires_in_seconds)

    signed = response.get("signedURL") or response.get("signedUrl")
    if not signed:
        raise RuntimeError(f"Failed to create signed URL for '{path}'")
    if signed.startswith("http"):
        return signed
    return f"{config.supabase_project_url}/storage/v1{signed}"



