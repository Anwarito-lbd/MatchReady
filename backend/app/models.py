"""Pydantic API schemas for MatchReady LinkedIn Studio."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class ProfileOut(BaseModel):
    id: str
    fullName: str
    headline: str
    email: str
    isActive: bool
    credits: int
    publishedGenerationId: str | None = None
    createdAt: str
    updatedAt: str


class ProfileCreateRequest(BaseModel):
    fullName: str = Field(min_length=2, max_length=120)
    headline: str = Field(min_length=2, max_length=200)
    email: str = Field(min_length=5, max_length=160)
    isActive: bool = False


class ProfileStatusUpdateRequest(BaseModel):
    isActive: bool


class UploadOut(BaseModel):
    id: str
    profileId: str
    filename: str
    mimeType: str
    width: int
    height: int
    sizeBytes: int
    sha256: str
    previewUrl: str
    createdAt: str


class PackOut(BaseModel):
    id: Literal["starter", "pro", "team"]
    name: str
    priceUsd: float
    amountCents: int
    credits: int
    badge: str | None = None
    description: str
    features: list[str]


class CheckoutSessionCreateRequest(BaseModel):
    profileId: str = "demo-anwar"
    packId: Literal["starter", "pro", "team"]
    email: str = Field(min_length=5, max_length=160)
    idempotencyKey: str | None = Field(default=None, max_length=128)


class CheckoutSessionOut(BaseModel):
    sessionId: str
    profileId: str
    packId: str
    packName: str
    amountCents: int
    currency: str
    creditsGranted: int
    email: str
    status: Literal["pending", "confirmed"]
    idempotencyKey: str
    receiptId: str | None = None
    createdAt: str
    confirmedAt: str | None = None


class CheckoutConfirmRequest(BaseModel):
    sessionId: str
    paymentToken: str = Field(default="tok_demo_visa_4242", min_length=4, max_length=128)


class CheckoutReceiptOut(BaseModel):
    receiptId: str
    sessionId: str
    profileId: str
    packId: str
    amountCents: int
    currency: str
    creditsAdded: int
    creditsBalance: int
    idempotentReplay: bool
    confirmedAt: str


class StylePresetOut(BaseModel):
    id: str
    label: str
    subtitle: str
    backdropHex: str
    accentHex: str
    attireNote: str


class PortraitGenerateRequest(BaseModel):
    profileId: str = "demo-anwar"
    uploadId: str
    styles: list[str] = Field(default_factory=lambda: ["executive_navy", "charcoal_founder"])
    provider: Literal["auto", "gemini", "huggingface", "local"] = "auto"


class GenerationOut(BaseModel):
    id: str
    profileId: str
    uploadId: str
    styleId: str
    styleLabel: str
    provider: str
    imageUrl: str
    squareAvatarUrl: str
    width: int
    height: int
    processingMs: float
    metrics: dict[str, float | int | str]
    isPublished: bool
    createdAt: str


class PortraitGenerateResponse(BaseModel):
    profileId: str
    creditsRemaining: int
    creditsSpent: int
    generations: list[GenerationOut]


class PublishPortraitResponse(BaseModel):
    profile: ProfileOut
    publishedGeneration: GenerationOut
