"""Application configuration for the TrustDesk backend."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """Runtime settings required by the Phase 1 backend foundation."""

    database_url: str = "sqlite:///./trustdesk.db"
    api_token: str = "trustdesk-demo-token"


def get_settings() -> Settings:
    """Read settings from the environment with local SQLite defaults."""

    return Settings(
        database_url=os.getenv("TRUSTDESK_DATABASE_URL", "sqlite:///./trustdesk.db"),
        api_token=os.getenv("TRUSTDESK_API_TOKEN", "trustdesk-demo-token"),
    )
