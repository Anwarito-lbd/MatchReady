export interface Profile {
  id: string;
  fullName: string;
  headline: string;
  email: string;
  isActive: boolean;
  credits: number;
  publishedGenerationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadRecord {
  id: string;
  profileId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
  previewUrl: string;
  createdAt: string;
}

export type PackId = 'starter' | 'pro' | 'team';

export interface Pack {
  id: PackId;
  name: string;
  priceUsd: number;
  amountCents: number;
  credits: number;
  badge: string | null;
  description: string;
  features: string[];
}

export interface CheckoutSession {
  sessionId: string;
  profileId: string;
  packId: PackId;
  packName: string;
  amountCents: number;
  currency: string;
  creditsGranted: number;
  email: string;
  status: 'pending' | 'confirmed';
  idempotencyKey: string;
  receiptId: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface CheckoutReceipt {
  receiptId: string;
  sessionId: string;
  profileId: string;
  packId: PackId;
  amountCents: number;
  currency: string;
  creditsAdded: number;
  creditsBalance: number;
  idempotentReplay: boolean;
  confirmedAt: string;
}

export interface StylePreset {
  id: string;
  label: string;
  subtitle: string;
  backdropHex: string;
  accentHex: string;
  attireNote: string;
}

export interface Generation {
  id: string;
  profileId: string;
  uploadId: string;
  styleId: string;
  styleLabel: string;
  provider: string;
  imageUrl: string;
  squareAvatarUrl: string;
  width: number;
  height: number;
  processingMs: number;
  metrics: Record<string, string | number>;
  isPublished: boolean;
  createdAt: string;
}

export interface PortraitGenerateResponse {
  profileId: string;
  creditsRemaining: number;
  creditsSpent: number;
  generations: Generation[];
}

export interface PublishPortraitResponse {
  profile: Profile;
  publishedGeneration: Generation;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  activeProvider: string;
}
