import type {
  CheckoutReceipt,
  CheckoutSession,
  Generation,
  HealthStatus,
  Pack,
  PackId,
  PortraitGenerateResponse,
  Profile,
  PublishPortraitResponse,
  StylePreset,
  UploadRecord,
} from '../types';

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = `Request failed with status ${res.status}`;
    try {
      const payload = await res.json();
      if (payload?.detail) {
        if (typeof payload.detail === 'string') {
          message = payload.detail;
        } else {
          code = payload.detail.code || code;
          message = payload.detail.message || message;
        }
      }
    } catch {
      // keep fallback error
    }
    throw new ApiClientError(res.status, code, message);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => requestJson<HealthStatus>('/api/health'),
  listProfiles: () => requestJson<Profile[]>('/api/profiles'),
  getProfile: (profileId: string) => requestJson<Profile>(`/api/profiles/${profileId}`),
  updateProfileStatus: (profileId: string, isActive: boolean) =>
    requestJson<Profile>(`/api/profiles/${profileId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    }),
  uploadPortrait: (profileId: string, file: File) => {
    const form = new FormData();
    form.append('profileId', profileId);
    form.append('file', file);
    return requestJson<UploadRecord>('/api/uploads', {
      method: 'POST',
      body: form,
    });
  },
  listPacks: () => requestJson<Pack[]>('/api/packs'),
  createCheckoutSession: (payload: {
    profileId: string;
    packId: PackId;
    email: string;
    idempotencyKey?: string;
  }) =>
    requestJson<CheckoutSession>('/api/checkout/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  confirmCheckout: (payload: { sessionId: string; paymentToken?: string }) =>
    requestJson<CheckoutReceipt>('/api/checkout/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  listStyles: () => requestJson<StylePreset[]>('/api/styles'),
  listGenerations: (profileId: string) =>
    requestJson<Generation[]>(`/api/profiles/${profileId}/generations`),
  generatePortraits: (payload: {
    profileId: string;
    uploadId: string;
    styles: string[];
    provider?: 'auto' | 'gemini' | 'huggingface' | 'local';
  }) =>
    requestJson<PortraitGenerateResponse>('/api/portraits/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  publishPortrait: (generationId: string) =>
    requestJson<PublishPortraitResponse>(`/api/portraits/${generationId}/publish`, {
      method: 'POST',
    }),
};
