"""Runtime configuration for the MatchReady LinkedIn Portrait Studio backend."""

from __future__ import annotations

import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="MATCHREADY_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "MatchReady LinkedIn Studio API"
    version: str = "1.0.0"
    db_path: str = Field(
        default_factory=lambda: str(
            Path(__file__).resolve().parents[1] / "data" / "matchready.db"
        )
    )
    media_dir: str = Field(
        default_factory=lambda: str(
            Path(__file__).resolve().parents[1] / "data" / "media"
        )
    )
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MiB hard ceiling
    min_image_dim: int = 128
    max_image_dim: int = 8192
    gemini_api_key: str | None = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    hf_api_token: str | None = Field(default_factory=lambda: os.getenv("HF_API_TOKEN"))
    preferred_provider: str = "auto"  # auto | gemini | huggingface | local
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )


def get_settings() -> Settings:
    """Return a fresh Settings instance (respects monkeypatched env vars in tests)."""
    return Settings()
