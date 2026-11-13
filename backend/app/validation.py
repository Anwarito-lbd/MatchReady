"""Strict multi-layer image upload validation (extension, MIME, magic bytes, size, decode)."""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

# Guard against decompression-bomb PNG/JPEG payloads.
Image.MAX_IMAGE_PIXELS = 67_108_864  # ~64 MP

ALLOWED_EXTENSIONS: Final[set[str]] = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIMES: Final[set[str]] = {"image/jpeg", "image/png", "image/webp"}
EXTENSION_TO_MIME: Final[dict[str, str]] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
PIL_FORMAT_TO_MIME: Final[dict[str, str]] = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


@dataclass(frozen=True)
class ValidatedImage:
    """Metadata produced after an uploaded payload passes all validation layers."""

    filename: str
    mime_type: str
    format_name: str
    width: int
    height: int
    size_bytes: int
    sha256: str


def detect_magic_mime(payload: bytes) -> str | None:
    """Inspect leading magic bytes to identify JPEG, PNG, or WebP payloads."""
    if len(payload) >= 3 and payload[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(payload) >= 8 and payload[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return "image/webp"
    return None


def _validation_error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=http_status,
        detail={"code": code, "message": message},
    )


def validate_image_upload(
    *,
    filename: str | None,
    content_type: str | None,
    payload: bytes,
    max_bytes: int = 10 * 1024 * 1024,
    min_dim: int = 128,
    max_dim: int = 8192,
) -> ValidatedImage:
    """Validate an uploaded image across size, extension, MIME, magic bytes, and full decode.

    Rejects text files, executables, spoofed extensions/MIME headers, empty payloads,
    oversized uploads, and corrupt/truncated images with structured HTTP 400/415 errors.
    """
    safe_name = Path(filename or "").name.strip()
    if not safe_name:
        raise _validation_error(
            status.HTTP_400_BAD_REQUEST,
            "MISSING_FILENAME",
            "Uploaded file must include a valid filename.",
        )

    size_bytes = len(payload)
    if size_bytes == 0:
        raise _validation_error(
            status.HTTP_400_BAD_REQUEST,
            "EMPTY_FILE",
            "Uploaded file is empty (0 bytes).",
        )
    if size_bytes > max_bytes:
        raise _validation_error(
            status.HTTP_400_BAD_REQUEST,
            "FILE_TOO_LARGE",
            f"File size ({size_bytes} bytes) exceeds the {max_bytes // (1024 * 1024)} MB limit.",
        )

    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_EXTENSION",
            f"Unsupported file extension '{ext or '(none)'}'. Allowed: .jpg, .jpeg, .png, .webp.",
        )

    normalized_mime = (content_type or "").split(";")[0].strip().lower()
    if normalized_mime not in ALLOWED_MIMES:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_MIME_TYPE",
            f"Unsupported Content-Type '{normalized_mime or 'missing'}'. Allowed: image/jpeg, image/png, image/webp.",
        )

    detected_mime = detect_magic_mime(payload)
    if detected_mime is None:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "INVALID_MAGIC_BYTES",
            "File magic bytes do not match a valid JPEG, PNG, or WebP image signature.",
        )

    if detected_mime != normalized_mime:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "MIME_MAGIC_MISMATCH",
            f"Spoofed upload detected: Content-Type '{normalized_mime}' does not match binary signature '{detected_mime}'.",
        )

    expected_ext_mime = EXTENSION_TO_MIME[ext]
    if expected_ext_mime != detected_mime:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "EXTENSION_MAGIC_MISMATCH",
            f"File extension '{ext}' does not match binary signature '{detected_mime}'.",
        )

    # Full structural + pixel decode verification via Pillow
    try:
        with Image.open(io.BytesIO(payload)) as img:
            img.verify()
        with Image.open(io.BytesIO(payload)) as img_decoded:
            img_decoded.load()
            fmt = (img_decoded.format or "").upper()
            width, height = img_decoded.size
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError) as exc:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "CORRUPT_IMAGE_PAYLOAD",
            f"Image payload failed structural decode: {exc}",
        ) from exc

    decoded_mime = PIL_FORMAT_TO_MIME.get(fmt)
    if decoded_mime != detected_mime:
        raise _validation_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "FORMAT_SIGNATURE_MISMATCH",
            f"Decoded image format '{fmt}' does not match expected '{detected_mime}'.",
        )

    if width < min_dim or height < min_dim:
        raise _validation_error(
            status.HTTP_400_BAD_REQUEST,
            "IMAGE_TOO_SMALL",
            f"Image resolution {width}x{height} is below the {min_dim}x{min_dim}px minimum for studio portraits.",
        )
    if width > max_dim or height > max_dim:
        raise _validation_error(
            status.HTTP_400_BAD_REQUEST,
            "IMAGE_DIMENSIONS_TOO_LARGE",
            f"Image resolution {width}x{height} exceeds the {max_dim}x{max_dim}px maximum.",
        )

    sha256 = hashlib.sha256(payload).hexdigest()
    return ValidatedImage(
        filename=safe_name,
        mime_type=detected_mime,
        format_name=fmt,
        width=width,
        height=height,
        size_bytes=size_bytes,
        sha256=sha256,
    )
