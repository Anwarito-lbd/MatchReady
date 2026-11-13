"""Tiered LinkedIn portrait credit packs, idempotent checkout, and atomic credit accounting."""

from __future__ import annotations

import sqlite3
import uuid
from typing import Final

from fastapi import HTTPException, status

from .database import utc_now_iso
from .models import (
    CheckoutConfirmRequest,
    CheckoutReceiptOut,
    CheckoutSessionCreateRequest,
    CheckoutSessionOut,
    PackOut,
)

PORTRAIT_PACKS: Final[dict[str, PackOut]] = {
    "starter": PackOut(
        id="starter",
        name="Starter Pack",
        priceUsd=19.0,
        amountCents=1900,
        credits=4,
        badge=None,
        description="4 studio-lit LinkedIn portraits for quick profile upgrades.",
        features=[
            "4 HD LinkedIn portraits (800x800 + 3:4)",
            "3 executive backdrop presets",
            "Circular crop safe-zone verification",
        ],
    ),
    "pro": PackOut(
        id="pro",
        name="Executive Pro Pack",
        priceUsd=29.0,
        amountCents=2900,
        credits=8,
        badge="Most Popular",
        description="8 executive portraits across all studio lighting & attire styles.",
        features=[
            "8 HD LinkedIn portraits (800x800 + 3:4)",
            "All 4 studio lighting & office bokeh presets",
            "LinkedIn profile preview & instant publish",
        ],
    ),
    "team": PackOut(
        id="team",
        name="Team / Recruiting Pack",
        priceUsd=79.0,
        amountCents=7900,
        credits=30,
        badge="Best Value",
        description="30 consistent studio portraits for founders, teams, and cohorts.",
        features=[
            "30 HD LinkedIn portraits across styles",
            "Consistent brand backdrop calibration",
            "Priority studio queue & receipt audit trail",
        ],
    ),
}


def list_packs() -> list[PackOut]:
    """Return ordered pricing tiers."""
    return [PORTRAIT_PACKS["starter"], PORTRAIT_PACKS["pro"], PORTRAIT_PACKS["team"]]


def _row_to_session(row: sqlite3.Row) -> CheckoutSessionOut:
    return CheckoutSessionOut(
        sessionId=row["id"],
        profileId=row["profile_id"],
        packId=row["pack_id"],
        packName=row["pack_name"],
        amountCents=row["amount_cents"],
        currency=row["currency"],
        creditsGranted=row["credits_granted"],
        email=row["email"],
        status=row["status"],
        idempotencyKey=row["idempotency_key"],
        receiptId=row["receipt_id"],
        createdAt=row["created_at"],
        confirmedAt=row["confirmed_at"],
    )


def create_checkout_session(
    conn: sqlite3.Connection, req: CheckoutSessionCreateRequest
) -> CheckoutSessionOut:
    """Create (or replay by idempotencyKey) a checkout session in SQLite."""
    pack = PORTRAIT_PACKS.get(req.packId)
    if pack is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "UNKNOWN_PACK", "message": f"Unknown pack '{req.packId}'."},
        )

    profile = conn.execute(
        "SELECT id FROM profiles WHERE id = ?", (req.profileId,)
    ).fetchone()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_NOT_FOUND", "message": f"Profile '{req.profileId}' not found."},
        )

    idem_key = (req.idempotencyKey or f"idem_{uuid.uuid4().hex}").strip()

    conn.execute("BEGIN IMMEDIATE")
    try:
        existing = conn.execute(
            "SELECT * FROM checkout_sessions WHERE idempotency_key = ?", (idem_key,)
        ).fetchone()
        if existing is not None:
            conn.execute("COMMIT")
            return _row_to_session(existing)

        session_id = f"cs_{uuid.uuid4().hex[:16]}"
        now = utc_now_iso()
        conn.execute(
            """
            INSERT INTO checkout_sessions
            (id, profile_id, pack_id, pack_name, amount_cents, currency, credits_granted, email, status, idempotency_key, receipt_id, created_at, confirmed_at)
            VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 'pending', ?, NULL, ?, NULL)
            """,
            (
                session_id,
                req.profileId,
                pack.id,
                pack.name,
                pack.amountCents,
                pack.credits,
                req.email.strip(),
                idem_key,
                now,
            ),
        )
        created = conn.execute(
            "SELECT * FROM checkout_sessions WHERE id = ?", (session_id,)
        ).fetchone()
        conn.execute("COMMIT")
        assert created is not None
        return _row_to_session(created)
    except Exception:
        conn.execute("ROLLBACK")
        raise


def confirm_checkout_session(
    conn: sqlite3.Connection, req: CheckoutConfirmRequest
) -> CheckoutReceiptOut:
    """Idempotently confirm a checkout session and credit the user's balance once."""
    if req.paymentToken.startswith("tok_fail"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "PAYMENT_DECLINED", "message": "Payment authorization was declined."},
        )

    conn.execute("BEGIN IMMEDIATE")
    try:
        session = conn.execute(
            "SELECT * FROM checkout_sessions WHERE id = ?", (req.sessionId,)
        ).fetchone()
        if session is None:
            conn.execute("ROLLBACK")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "SESSION_NOT_FOUND", "message": f"Checkout session '{req.sessionId}' not found."},
            )

        profile = conn.execute(
            "SELECT id, credits FROM profiles WHERE id = ?", (session["profile_id"],)
        ).fetchone()
        if profile is None:
            conn.execute("ROLLBACK")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "PROFILE_NOT_FOUND", "message": "Associated profile no longer exists."},
            )

        if session["status"] == "confirmed":
            conn.execute("COMMIT")
            return CheckoutReceiptOut(
                receiptId=session["receipt_id"],
                sessionId=session["id"],
                profileId=session["profile_id"],
                packId=session["pack_id"],
                amountCents=session["amount_cents"],
                currency=session["currency"],
                creditsAdded=0,
                creditsBalance=int(profile["credits"]),
                idempotentReplay=True,
                confirmedAt=session["confirmed_at"],
            )

        receipt_id = f"rcpt_{uuid.uuid4().hex[:14]}"
        confirmed_at = utc_now_iso()
        credits_granted = int(session["credits_granted"])
        new_balance = int(profile["credits"]) + credits_granted

        conn.execute(
            """
            UPDATE checkout_sessions
            SET status = 'confirmed', receipt_id = ?, confirmed_at = ?
            WHERE id = ?
            """,
            (receipt_id, confirmed_at, session["id"]),
        )
        conn.execute(
            """
            UPDATE profiles
            SET credits = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_balance, confirmed_at, profile["id"]),
        )
        conn.execute("COMMIT")
        return CheckoutReceiptOut(
            receiptId=receipt_id,
            sessionId=session["id"],
            profileId=session["profile_id"],
            packId=session["pack_id"],
            amountCents=int(session["amount_cents"]),
            currency=session["currency"],
            creditsAdded=credits_granted,
            creditsBalance=new_balance,
            idempotentReplay=False,
            confirmedAt=confirmed_at,
        )
    except Exception:
        conn.execute("ROLLBACK")
        raise
