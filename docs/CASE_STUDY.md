# Engineering Case Study: MatchReady LinkedIn Portrait Studio

## 1. Context & Architectural Transformation

MatchReady originated as a minimal single-page frontend prototype ("Dynamic Card Reveal") featuring dark/red styling, external placeholder URLs, naive `file.type.startsWith('image/')` validation, an unused `isActive` boolean on `ProfileCard`, and a stubbed `console.log` checkout handler.

We re-architected MatchReady into a production-structured, full-stack **LinkedIn Professional Headshot & Portrait Studio** following LinkedIn's brand system (`#0A66C2` primary blue, `#004182` hover blue, `#F3F2EF` warm canvas, `#FFFFFF` elevated cards) backed by a stateful FastAPI + SQLite WAL service.

---

## 2. Security & Integrity Engineering

### 2.1 Threat Model: Image Upload Spoofing
Relying solely on `<input accept="image/*">` or `file.type` trusts client-supplied metadata. Attackers can rename `payload.exe` or `script.txt` to `avatar.png` and spoof `Content-Type: image/png`.

**Mitigation (`backend/app/validation.py` & `src/lib/validation.ts`):**
- **Client Pre-Flight (`readLeadingBytes`)**: Reads the first 12 bytes in-browser before transmitting bytes over HTTP, immediately blocking `.txt`, `.exe` (`MZ`), empty files, and MIME/extension mismatches.
- **Server Zero-Trust Firewall (`validate_image_upload`)**:
  1. Bounds check: `0 < size_bytes <= 10 MiB`.
  2. Strict allowlists for extension (`.jpg`, `.jpeg`, `.png`, `.webp`) and `Content-Type`.
  3. Magic-byte signature extraction (`\xff\xd8\xff`, `\x89PNG\r\n\x1a\n`, `RIFF....WEBP`) cross-checked against both declared MIME and filename extension.
  4. Full structural verification (`Image.verify()`) and pixel decode (`Image.load()`) with `Image.MAX_IMAGE_PIXELS = 67_108_864` to neutralize decompression bombs.
  5. Dimension clamping (`128 <= w, h <= 8192`) and `SHA-256` content hashing.

### 2.2 Authorization Boundary: `isActive` Profile Gating
An inactive LinkedIn profile (`isActive = false`) must never consume rendering compute, spend credits, or publish headshots.
- **Order of Checks**: `POST /api/portraits/generate` checks `_require_active_profile(profile)` **prior** to credit sufficiency checks or SQLite credit deduction, returning `HTTP 403 Forbidden` (`PROFILE_INACTIVE`).
- **Publish Guard**: `POST /api/portraits/{generation_id}/publish` enforces the exact same `isActive` guard.
- **Database Transaction Re-Verification**: Inside `BEGIN IMMEDIATE`, `is_active` and `credits` are re-read atomically to prevent TOCTOU (time-of-check to time-of-use) races.

### 2.3 Idempotent Checkout & Atomic Credit Accounting
Network retries during payment confirmation must never double-credit a user's portrait balance.
- `POST /api/checkout/sessions` enforces a `UNIQUE` `idempotency_key` constraint in SQLite `checkout_sessions`, returning the existing pending/confirmed session on retry.
- `POST /api/checkout/confirm` locks via `BEGIN IMMEDIATE`. If `status == 'confirmed'`, it commits cleanly and returns `idempotentReplay: true`, `creditsAdded: 0`, and the persisted `receiptId`.
- Declined payment tokens (`tok_fail*`) fail with `HTTP 402 Payment Required` without mutating balances.

---

## 3. Deterministic Studio DSP & Hybrid AI Adapter

To guarantee deterministic offline operation alongside optional cloud generative backends:
- `PortraitProvider` defines a clean interface implemented by `GeminiImagenAdapter`, `HuggingFaceAdapter`, and `DeterministicStudioAdapter`.
- `DeterministicStudioAdapter` computes an automated face/headroom anchor in $\text{Y}C_bC_r$ skin-chroma space, performs aspect-preserving crops for both `600×800` (3:4 editorial) and `800×800` (1:1 LinkedIn circular avatar), applies an elliptical Gaussian-feathered bokeh backdrop composite, adds radial three-point studio key lighting, and records processing latency and Rec. 709 luminance metrics per generation.

---

## 4. Visual Audit & Defect Resolution During Build

During end-to-end headless Chromium verification (`scripts/capture_screenshots.mjs`), visual inspection of the initial screenshots surfaced three real defects that were resolved before final release:
1. **jsdom `Blob.slice().arrayBuffer()` Compatibility**: Vitest's `jsdom` environment lacked `.arrayBuffer()` on sliced `Blob` objects. Adding a `FileReader` fallback in `src/lib/validation.ts` ensured identical behavior in browsers and jsdom.
2. **Sticky Header Stitch Artifact & Missing Favicon**: Scrolling prior to Playwright `fullPage: true` capture caused the `sticky top-0` header to appear mid-page, and missing `<link rel="icon">` caused a `/favicon.ico` `404`. Adding an inline LinkedIn-blue SVG favicon in `index.html` and resetting scroll to `(0, 0)` resolved both cleanly.
3. **Subject Matte Radius on Tightly Cropped Selfies**: Widening the elliptical preservation mask in `backend/app/pipeline.py` (`0.34 -> 0.42` horizontal, `0.68 -> 0.78` inner threshold) prevented hair/ear feathering on tight headshots such as `demo-input.png`.
