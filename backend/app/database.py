"""SQLite persistence layer for profiles, validated uploads, checkout sessions, and portrait generations."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


def utc_now_iso() -> str:
    """Return an ISO-8601 UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    credits INTEGER NOT NULL DEFAULT 0,
    published_generation_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    pack_name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    credits_granted INTEGER NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed')),
    idempotency_key TEXT NOT NULL UNIQUE,
    receipt_id TEXT,
    created_at TEXT NOT NULL,
    confirmed_at TEXT,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    upload_id TEXT NOT NULL,
    style_id TEXT NOT NULL,
    style_label TEXT NOT NULL,
    provider TEXT NOT NULL,
    output_path TEXT NOT NULL,
    avatar_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    processing_ms REAL NOT NULL,
    metrics_json TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);
"""


def init_db(db_path: str) -> None:
    """Create SQLite schema and seed deterministic demo profiles if absent."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path, timeout=15.0) as conn:
        conn.executescript(SCHEMA_SQL)
        now = utc_now_iso()
        conn.execute(
            """
            INSERT OR IGNORE INTO profiles
            (id, full_name, headline, email, is_active, credits, published_generation_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
            """,
            (
                "demo-anwar",
                "Anwar Haddad",
                "AI Systems Architect & Full-Stack Engineer",
                "anwar@matchready.studio",
                1,
                6,
                now,
                now,
            ),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO profiles
            (id, full_name, headline, email, is_active, credits, published_generation_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
            """,
            (
                "demo-inactive",
                "Pending Candidate Profile",
                "Awaiting Profile Activation",
                "pending@matchready.studio",
                0,
                4,
                now,
                now,
            ),
        )
        conn.commit()


@contextmanager
def get_connection(db_path: str) -> Iterator[sqlite3.Connection]:
    """Yield a SQLite connection configured with Row factory and foreign keys."""
    conn = sqlite3.connect(db_path, timeout=15.0, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
    finally:
        conn.close()
