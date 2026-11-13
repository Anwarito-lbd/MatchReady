"""FastAPI application entrypoint for MatchReady LinkedIn Portrait Studio."""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image

from .checkout import confirm_checkout_session, create_checkout_session, list_packs
from .config import Settings, get_settings
from .database import get_connection, init_db, utc_now_iso
from .models import (
    CheckoutConfirmRequest,
    CheckoutReceiptOut,
    CheckoutSessionCreateRequest,
    CheckoutSessionOut,
    GenerationOut,
    PackOut,
    PortraitGenerateRequest,
    PortraitGenerateResponse,
    ProfileCreateRequest,
    ProfileOut,
    ProfileStatusUpdateRequest,
    PublishPortraitResponse,
    StylePresetOut,
    UploadOut,
)
from .pipeline import (
    STYLE_PRESETS,
    list_style_presets,
    resolve_provider,
    save_generated_images,
)
from .validation import validate_image_upload


def _row_to_profile(row: sqlite3.Row) -> ProfileOut:
    return ProfileOut(
        id=row["id"],
        fullName=row["full_name"],
        headline=row["headline"],
        email=row["email"],
        isActive=bool(row["is_active"]),
        credits=int(row["credits"]),
        publishedGenerationId=row["published_generation_id"],
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def _row_to_generation(row: sqlite3.Row) -> GenerationOut:
    gen_id = row["id"]
    return GenerationOut(
        id=gen_id,
        profileId=row["profile_id"],
        uploadId=row["upload_id"],
        styleId=row["style_id"],
        styleLabel=row["style_label"],
        provider=row["provider"],
        imageUrl=f"/api/media/generations/{gen_id}.png",
        squareAvatarUrl=f"/api/media/generations/{gen_id}_avatar.png",
        width=int(row["width"]),
        height=int(row["height"]),
        processingMs=float(row["processing_ms"]),
        metrics=json.loads(row["metrics_json"]),
        isPublished=bool(row["is_published"]),
        createdAt=row["created_at"],
    )


def _require_profile(conn: sqlite3.Connection, profile_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_NOT_FOUND", "message": f"Profile '{profile_id}' not found."},
        )
    return row


def _require_active_profile(row: sqlite3.Row) -> None:
    if not bool(row["is_active"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PROFILE_INACTIVE",
                "message": "Profile is inactive (isActive=false). Activate your LinkedIn profile before generating or publishing portraits.",
            },
        )


def create_app(custom_settings: Settings | None = None) -> FastAPI:
    """Application factory supporting isolated test settings and SQLite databases."""

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        cfg = custom_settings or get_settings()
        init_db(cfg.db_path)
        Path(cfg.media_dir, "uploads").mkdir(parents=True, exist_ok=True)
        Path(cfg.media_dir, "generations").mkdir(parents=True, exist_ok=True)
        yield

    cfg_boot = custom_settings or get_settings()
    init_db(cfg_boot.db_path)

    app = FastAPI(
        title=cfg_boot.app_name,
        version=cfg_boot.version,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg_boot.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def settings_dep() -> Settings:
        return custom_settings or get_settings()

    @app.get("/api/health")
    def health(cfg: Settings = Depends(settings_dep)) -> dict[str, object]:
        return {
            "status": "ok",
            "service": cfg.app_name,
            "version": cfg.version,
            "activeProvider": resolve_provider(cfg).name,
        }

    @app.get("/api/profiles", response_model=list[ProfileOut])
    def list_profiles(cfg: Settings = Depends(settings_dep)) -> list[ProfileOut]:
        with get_connection(cfg.db_path) as conn:
            rows = conn.execute("SELECT * FROM profiles ORDER BY created_at ASC").fetchall()
            return [_row_to_profile(r) for r in rows]

    @app.get("/api/profiles/{profile_id}", response_model=ProfileOut)
    def get_profile(profile_id: str, cfg: Settings = Depends(settings_dep)) -> ProfileOut:
        with get_connection(cfg.db_path) as conn:
            return _row_to_profile(_require_profile(conn, profile_id))

    @app.post("/api/profiles", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
    def create_profile(
        req: ProfileCreateRequest, cfg: Settings = Depends(settings_dep)
    ) -> ProfileOut:
        profile_id = f"prof_{uuid.uuid4().hex[:12]}"
        now = utc_now_iso()
        with get_connection(cfg.db_path) as conn:
            conn.execute(
                """
                INSERT INTO profiles
                (id, full_name, headline, email, is_active, credits, published_generation_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)
                """,
                (
                    profile_id,
                    req.fullName.strip(),
                    req.headline.strip(),
                    req.email.strip(),
                    1 if req.isActive else 0,
                    now,
                    now,
                ),
            )
            conn.commit()
            return _row_to_profile(_require_profile(conn, profile_id))

    @app.patch("/api/profiles/{profile_id}/status", response_model=ProfileOut)
    def update_profile_status(
        profile_id: str,
        req: ProfileStatusUpdateRequest,
        cfg: Settings = Depends(settings_dep),
    ) -> ProfileOut:
        now = utc_now_iso()
        with get_connection(cfg.db_path) as conn:
            _require_profile(conn, profile_id)
            conn.execute(
                "UPDATE profiles SET is_active = ?, updated_at = ? WHERE id = ?",
                (1 if req.isActive else 0, now, profile_id),
            )
            conn.commit()
            return _row_to_profile(_require_profile(conn, profile_id))

    @app.post("/api/uploads", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
    async def upload_portrait(
        file: UploadFile = File(...),
        profileId: str = Form(default="demo-anwar"),
        cfg: Settings = Depends(settings_dep),
    ) -> UploadOut:
        payload = await file.read()
        validated = validate_image_upload(
            filename=file.filename,
            content_type=file.content_type,
            payload=payload,
            max_bytes=cfg.max_upload_bytes,
            min_dim=cfg.min_image_dim,
            max_dim=cfg.max_image_dim,
        )

        upload_id = f"upl_{uuid.uuid4().hex[:14]}"
        ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
        stored_name = f"{upload_id}{ext_map[validated.mime_type]}"
        uploads_dir = Path(cfg.media_dir) / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        storage_path = uploads_dir / stored_name

        with get_connection(cfg.db_path) as conn:
            _require_profile(conn, profileId)
            storage_path.write_bytes(payload)
            now = utc_now_iso()
            conn.execute(
                """
                INSERT INTO uploads
                (id, profile_id, filename, mime_type, sha256, width, height, size_bytes, storage_path, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    upload_id,
                    profileId,
                    validated.filename,
                    validated.mime_type,
                    validated.sha256,
                    validated.width,
                    validated.height,
                    validated.size_bytes,
                    str(storage_path),
                    now,
                ),
            )
            conn.commit()

        return UploadOut(
            id=upload_id,
            profileId=profileId,
            filename=validated.filename,
            mimeType=validated.mime_type,
            width=validated.width,
            height=validated.height,
            sizeBytes=validated.size_bytes,
            sha256=validated.sha256,
            previewUrl=f"/api/media/uploads/{stored_name}",
            createdAt=now,
        )

    @app.get("/api/packs", response_model=list[PackOut])
    def get_packs() -> list[PackOut]:
        return list_packs()

    @app.post("/api/checkout/sessions", response_model=CheckoutSessionOut, status_code=status.HTTP_201_CREATED)
    def post_checkout_session(
        req: CheckoutSessionCreateRequest, cfg: Settings = Depends(settings_dep)
    ) -> CheckoutSessionOut:
        with get_connection(cfg.db_path) as conn:
            return create_checkout_session(conn, req)

    @app.post("/api/checkout/confirm", response_model=CheckoutReceiptOut)
    def post_checkout_confirm(
        req: CheckoutConfirmRequest, cfg: Settings = Depends(settings_dep)
    ) -> CheckoutReceiptOut:
        with get_connection(cfg.db_path) as conn:
            return confirm_checkout_session(conn, req)

    @app.get("/api/styles", response_model=list[StylePresetOut])
    def get_styles() -> list[StylePresetOut]:
        return list_style_presets()

    @app.get("/api/profiles/{profile_id}/generations", response_model=list[GenerationOut])
    def list_profile_generations(
        profile_id: str, cfg: Settings = Depends(settings_dep)
    ) -> list[GenerationOut]:
        with get_connection(cfg.db_path) as conn:
            _require_profile(conn, profile_id)
            rows = conn.execute(
                "SELECT * FROM generations WHERE profile_id = ? ORDER BY created_at DESC",
                (profile_id,),
            ).fetchall()
            return [_row_to_generation(r) for r in rows]

    @app.post("/api/portraits/generate", response_model=PortraitGenerateResponse)
    def generate_portraits(
        req: PortraitGenerateRequest, cfg: Settings = Depends(settings_dep)
    ) -> PortraitGenerateResponse:
        if not req.styles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "NO_STYLES_SELECTED", "message": "Select at least one LinkedIn studio style."},
            )
        unknown_styles = [s for s in req.styles if s not in STYLE_PRESETS]
        if unknown_styles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "UNKNOWN_STYLE", "message": f"Unknown style preset(s): {unknown_styles}"},
            )

        with get_connection(cfg.db_path) as conn:
            profile = _require_profile(conn, req.profileId)
            # Enforce isActive gating strictly BEFORE credit deduction or generation
            _require_active_profile(profile)

            upload = conn.execute(
                "SELECT * FROM uploads WHERE id = ? AND profile_id = ?",
                (req.uploadId, req.profileId),
            ).fetchone()
            if upload is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "code": "UPLOAD_NOT_FOUND",
                        "message": f"Upload '{req.uploadId}' was not found for profile '{req.profileId}'.",
                    },
                )

            credits_needed = len(req.styles)
            if int(profile["credits"]) < credits_needed:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "code": "INSUFFICIENT_CREDITS",
                        "message": f"Requires {credits_needed} credit(s), but profile only has {profile['credits']}. Purchase a pack to continue.",
                    },
                )

            source_path = Path(upload["storage_path"])
            if not source_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"code": "UPLOAD_FILE_MISSING", "message": "Uploaded image file is missing on disk."},
                )

            provider = resolve_provider(cfg, req.provider)
            with Image.open(source_path) as src_im:
                src_copy = src_im.copy()

            generated_rows: list[GenerationOut] = []
            now = utc_now_iso()

            conn.execute("BEGIN IMMEDIATE")
            try:
                # Re-check active status & atomically deduct credits inside transaction
                fresh = conn.execute(
                    "SELECT is_active, credits FROM profiles WHERE id = ?", (req.profileId,)
                ).fetchone()
                if fresh is None or not bool(fresh["is_active"]):
                    conn.execute("ROLLBACK")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "code": "PROFILE_INACTIVE",
                            "message": "Profile is inactive (isActive=false).",
                        },
                    )
                if int(fresh["credits"]) < credits_needed:
                    conn.execute("ROLLBACK")
                    raise HTTPException(
                        status_code=status.HTTP_402_PAYMENT_REQUIRED,
                        detail={
                            "code": "INSUFFICIENT_CREDITS",
                            "message": "Insufficient portrait credits.",
                        },
                    )

                new_credits = int(fresh["credits"]) - credits_needed
                conn.execute(
                    "UPDATE profiles SET credits = ?, updated_at = ? WHERE id = ?",
                    (new_credits, now, req.profileId),
                )

                for style_id in req.styles:
                    style_cfg = STYLE_PRESETS[style_id]
                    res = provider.generate(src_copy, style_cfg)
                    gen_id = f"gen_{uuid.uuid4().hex[:14]}"
                    editorial_path, avatar_path = save_generated_images(
                        res, cfg.media_dir, gen_id
                    )
                    w, h = res.editorial_image.size
                    conn.execute(
                        """
                        INSERT INTO generations
                        (id, profile_id, upload_id, style_id, style_label, provider, output_path, avatar_path, width, height, processing_ms, metrics_json, is_published, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                        """,
                        (
                            gen_id,
                            req.profileId,
                            req.uploadId,
                            style_cfg.id,
                            style_cfg.label,
                            res.provider,
                            str(editorial_path),
                            str(avatar_path),
                            w,
                            h,
                            res.processing_ms,
                            json.dumps(res.metrics),
                            now,
                        ),
                    )
                    row = conn.execute(
                        "SELECT * FROM generations WHERE id = ?", (gen_id,)
                    ).fetchone()
                    assert row is not None
                    generated_rows.append(_row_to_generation(row))

                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise

        return PortraitGenerateResponse(
            profileId=req.profileId,
            creditsRemaining=new_credits,
            creditsSpent=credits_needed,
            generations=generated_rows,
        )

    @app.post("/api/portraits/{generation_id}/publish", response_model=PublishPortraitResponse)
    def publish_portrait(
        generation_id: str, cfg: Settings = Depends(settings_dep)
    ) -> PublishPortraitResponse:
        with get_connection(cfg.db_path) as conn:
            gen_row = conn.execute(
                "SELECT * FROM generations WHERE id = ?", (generation_id,)
            ).fetchone()
            if gen_row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"code": "GENERATION_NOT_FOUND", "message": f"Generation '{generation_id}' not found."},
                )
            profile = _require_profile(conn, gen_row["profile_id"])
            _require_active_profile(profile)

            now = utc_now_iso()
            conn.execute("BEGIN IMMEDIATE")
            try:
                conn.execute(
                    "UPDATE generations SET is_published = 0 WHERE profile_id = ?",
                    (profile["id"],),
                )
                conn.execute(
                    "UPDATE generations SET is_published = 1 WHERE id = ?",
                    (generation_id,),
                )
                conn.execute(
                    "UPDATE profiles SET published_generation_id = ?, updated_at = ? WHERE id = ?",
                    (generation_id, now, profile["id"]),
                )
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise

            updated_profile = _row_to_profile(_require_profile(conn, profile["id"]))
            updated_gen = _row_to_generation(
                conn.execute("SELECT * FROM generations WHERE id = ?", (generation_id,)).fetchone()
            )
            return PublishPortraitResponse(
                profile=updated_profile,
                publishedGeneration=updated_gen,
            )

    @app.get("/api/media/{kind}/{filename}")
    def serve_media(
        kind: str, filename: str, cfg: Settings = Depends(settings_dep)
    ) -> FileResponse:
        if kind not in {"uploads", "generations"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown media bucket.")
        safe_name = Path(filename).name
        if safe_name != filename or ".." in filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
        target = (Path(cfg.media_dir) / kind / safe_name).resolve()
        root = (Path(cfg.media_dir) / kind).resolve()
        if not str(target).startswith(str(root)) or not target.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found.")
        return FileResponse(target)

    return app


app = create_app()
