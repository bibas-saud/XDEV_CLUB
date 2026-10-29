from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    database_url: str

    # Bootstrap admin account (created once by scripts/admin_bootstrap)
    admin_name: str
    admin_email: str
    admin_password: str = Field(min_length=1)

    # Authentication (JWT)
    jwt_secret_key: str = Field(min_length=32)
    jwt_expires_minutes: int = 1440
    cors_origins: list[str] = []

    # Supabase Storage
    supabase_project_url: str = ""
    supabase_secret_key: str = ""
    supabase_photos_bucket: str = "members"
    supabase_id_cards_bucket: str = "id-cards"
    supabase_events_bucket: str = "events"

    # Email / SMTP (ownership transfer invitations)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Admin ownership transfer
    frontend_base_url: str = ""
    invite_expiry_hours: int = 48

    # Public event registration
    registration_rate_limit_per_min: int = 10

    # Background reminder emails ("starting soon", 2h before start)
    reminders_enabled: bool = True
    reminder_interval_seconds: int = 300

    model_config = SettingsConfigDict(env_file=".env")


config = Config()
