"""Comprehensive backend unit & integration tests for MatchReady LinkedIn Studio API."""

from __future__ import annotations

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from backend.app.config import Settings
from backend.app.main import create_app


def _make_portrait_bytes(fmt: str = "PNG", size: tuple[int, int] = (320, 400)) -> bytes:
    """Create a synthetic portrait-like test image in memory."""
    im = Image.new("RGB", size, (220, 228, 238))
    draw = ImageDraw.Draw(im)
    w, h = size
    # Warm skin-toned oval face + navy torso block
    draw.ellipse([w * 0.30, h * 0.18, w * 0.70, h * 0.56], fill=(214, 168, 138))
    draw.rectangle([w * 0.20, h * 0.58, w * 0.80, h * 0.98], fill=(22, 46, 82))
    buf = io.BytesIO()
    im.save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    cfg = Settings(
        db_path=str(tmp_path / "test_matchready.db"),
        media_dir=str(tmp_path / "media"),
        max_upload_bytes=512 * 1024,  # 512 KiB for deterministic limit test
        preferred_provider="local",
    )
    app = create_app(custom_settings=cfg)
    with TestClient(app) as c:
        yield c


def test_health_and_seeded_profiles(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["activeProvider"] == "local-studio-deterministic"

    profs = client.get("/api/profiles").json()
    ids = {p["id"]: p for p in profs}
    assert ids["demo-anwar"]["isActive"] is True
    assert ids["demo-inactive"]["isActive"] is False


@pytest.mark.parametrize(
    ("fmt", "filename", "mime"),
    [
        ("PNG", "headshot.png", "image/png"),
        ("JPEG", "headshot.jpg", "image/jpeg"),
        ("WEBP", "headshot.webp", "image/webp"),
    ],
)
def test_upload_accepts_valid_images(
    client: TestClient, fmt: str, filename: str, mime: str
) -> None:
    payload = _make_portrait_bytes(fmt=fmt)
    resp = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": (filename, payload, mime)},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["mimeType"] == mime
    assert data["width"] == 320
    assert data["height"] == 400
    assert len(data["sha256"]) == 64

    media_resp = client.get(data["previewUrl"])
    assert media_resp.status_code == 200


def test_upload_rejects_txt_and_exe_and_spoofed_files(client: TestClient) -> None:
    # 1. Plain .txt upload
    r_txt = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("notes.txt", b"hello world not an image", "text/plain")},
    )
    assert r_txt.status_code == 415
    assert r_txt.json()["detail"]["code"] == "UNSUPPORTED_EXTENSION"

    # 2. Windows PE .exe upload
    r_exe = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("payload.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload")},
    )
    assert r_exe.status_code == 415

    # 3. Spoofed .png with text payload + image/png MIME
    r_spoof_txt = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("evil.png", b"#!/bin/sh\nrm -rf /\n", "image/png")},
    )
    assert r_spoof_txt.status_code == 415
    assert r_spoof_txt.json()["detail"]["code"] == "INVALID_MAGIC_BYTES"

    # 4. Spoofed .png with PE executable magic bytes
    r_spoof_exe = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("avatar.png", b"MZ\x90\x00fake-binary-exe", "image/png")},
    )
    assert r_spoof_exe.status_code == 415
    assert r_spoof_exe.json()["detail"]["code"] == "INVALID_MAGIC_BYTES"

    # 5. Spoofed MIME header (JPEG bytes labeled image/png)
    jpeg_bytes = _make_portrait_bytes(fmt="JPEG")
    r_mime_mismatch = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("mismatch.png", jpeg_bytes, "image/png")},
    )
    assert r_mime_mismatch.status_code == 415
    assert r_mime_mismatch.json()["detail"]["code"] == "MIME_MAGIC_MISMATCH"

    # 6. Spoofed extension (JPEG bytes with .png extension and image/jpeg MIME)
    r_ext_mismatch = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("fake.png", jpeg_bytes, "image/jpeg")},
    )
    assert r_ext_mismatch.status_code == 415
    assert r_ext_mismatch.json()["detail"]["code"] == "EXTENSION_MAGIC_MISMATCH"

    # 7. Empty file -> HTTP 400
    r_empty = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert r_empty.status_code == 400
    assert r_empty.json()["detail"]["code"] == "EMPTY_FILE"

    # 8. Oversized file -> HTTP 400
    r_big = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("huge.png", b"\x89PNG\r\n\x1a\n" + b"0" * (600 * 1024), "image/png")},
    )
    assert r_big.status_code == 400
    assert r_big.json()["detail"]["code"] == "FILE_TOO_LARGE"

    # 9. Too-small dimensions -> HTTP 400
    tiny_png = _make_portrait_bytes(fmt="PNG", size=(64, 64))
    r_tiny = client.post(
        "/api/uploads",
        data={"profileId": "demo-anwar"},
        files={"file": ("tiny.png", tiny_png, "image/png")},
    )
    assert r_tiny.status_code == 400
    assert r_tiny.json()["detail"]["code"] == "IMAGE_TOO_SMALL"


def test_checkout_packs_and_idempotent_confirmation(client: TestClient) -> None:
    packs = client.get("/api/packs").json()
    assert [p["id"] for p in packs] == ["starter", "pro", "team"]

    before_credits = client.get("/api/profiles/demo-anwar").json()["credits"]

    # Create session with explicit idempotencyKey
    s1 = client.post(
        "/api/checkout/sessions",
        json={
            "profileId": "demo-anwar",
            "packId": "pro",
            "email": "anwar@matchready.studio",
            "idempotencyKey": "idem-test-001",
        },
    )
    assert s1.status_code == 201
    session = s1.json()
    assert session["creditsGranted"] == 8
    assert session["status"] == "pending"

    # Replaying session creation with same idempotencyKey returns identical session
    s2 = client.post(
        "/api/checkout/sessions",
        json={
            "profileId": "demo-anwar",
            "packId": "pro",
            "email": "anwar@matchready.studio",
            "idempotencyKey": "idem-test-001",
        },
    )
    assert s2.status_code == 201
    assert s2.json()["sessionId"] == session["sessionId"]

    # Declined payment token does not grant credits
    declined = client.post(
        "/api/checkout/confirm",
        json={"sessionId": session["sessionId"], "paymentToken": "tok_fail_cvc"},
    )
    assert declined.status_code == 402

    # First confirmation credits balance exactly once
    c1 = client.post(
        "/api/checkout/confirm",
        json={"sessionId": session["sessionId"], "paymentToken": "tok_visa_4242"},
    )
    assert c1.status_code == 200
    r1 = c1.json()
    assert r1["idempotentReplay"] is False
    assert r1["creditsAdded"] == 8
    assert r1["creditsBalance"] == before_credits + 8

    # Second confirmation is idempotent replay with 0 additional credits
    c2 = client.post(
        "/api/checkout/confirm",
        json={"sessionId": session["sessionId"], "paymentToken": "tok_visa_4242"},
    )
    assert c2.status_code == 200
    r2 = c2.json()
    assert r2["idempotentReplay"] is True
    assert r2["creditsAdded"] == 0
    assert r2["creditsBalance"] == before_credits + 8
    assert r2["receiptId"] == r1["receiptId"]


def test_is_active_gating_for_generation_and_publish(client: TestClient) -> None:
    # Upload valid photo to inactive profile
    png_bytes = _make_portrait_bytes(fmt="PNG")
    up = client.post(
        "/api/uploads",
        data={"profileId": "demo-inactive"},
        files={"file": ("candidate.png", png_bytes, "image/png")},
    )
    assert up.status_code == 201
    upload_id = up.json()["id"]

    credits_before = client.get("/api/profiles/demo-inactive").json()["credits"]
    assert credits_before == 4

    # Attempt generation while isActive=False -> MUST return 403 and spend 0 credits
    gen_blocked = client.post(
        "/api/portraits/generate",
        json={
            "profileId": "demo-inactive",
            "uploadId": upload_id,
            "styles": ["executive_navy", "charcoal_founder"],
        },
    )
    assert gen_blocked.status_code == 403
    assert gen_blocked.json()["detail"]["code"] == "PROFILE_INACTIVE"
    assert client.get("/api/profiles/demo-inactive").json()["credits"] == credits_before

    # Activate profile -> generation succeeds and deducts 2 credits
    act = client.patch("/api/profiles/demo-inactive/status", json={"isActive": True})
    assert act.status_code == 200
    assert act.json()["isActive"] is True

    gen_ok = client.post(
        "/api/portraits/generate",
        json={
            "profileId": "demo-inactive",
            "uploadId": upload_id,
            "styles": ["executive_navy", "charcoal_founder"],
        },
    )
    assert gen_ok.status_code == 200
    body = gen_ok.json()
    assert body["creditsSpent"] == 2
    assert body["creditsRemaining"] == credits_before - 2
    assert len(body["generations"]) == 2
    first_gen = body["generations"][0]
    assert first_gen["provider"] == "local-studio-deterministic"
    assert client.get(first_gen["imageUrl"]).status_code == 200
    assert client.get(first_gen["squareAvatarUrl"]).status_code == 200

    # Deactivate profile again -> publish is blocked with 403
    client.patch("/api/profiles/demo-inactive/status", json={"isActive": False})
    pub_blocked = client.post(f"/api/portraits/{first_gen['id']}/publish")
    assert pub_blocked.status_code == 403
    assert pub_blocked.json()["detail"]["code"] == "PROFILE_INACTIVE"

    # Re-activate -> publish succeeds
    client.patch("/api/profiles/demo-inactive/status", json={"isActive": True})
    pub_ok = client.post(f"/api/portraits/{first_gen['id']}/publish")
    assert pub_ok.status_code == 200
    assert pub_ok.json()["profile"]["publishedGenerationId"] == first_gen["id"]
    assert pub_ok.json()["publishedGeneration"]["isPublished"] is True


def test_insufficient_credits_blocks_generation(client: TestClient) -> None:
    # Create fresh active profile with 0 credits
    prof = client.post(
        "/api/profiles",
        json={
            "fullName": "Zero Credit User",
            "headline": "Product Manager",
            "email": "zero@matchready.studio",
            "isActive": True,
        },
    ).json()
    up = client.post(
        "/api/uploads",
        data={"profileId": prof["id"]},
        files={"file": ("selfie.png", _make_portrait_bytes("PNG"), "image/png")},
    ).json()

    resp = client.post(
        "/api/portraits/generate",
        json={
            "profileId": prof["id"],
            "uploadId": up["id"],
            "styles": ["executive_navy"],
        },
    )
    assert resp.status_code == 402
    assert resp.json()["detail"]["code"] == "INSUFFICIENT_CREDITS"
