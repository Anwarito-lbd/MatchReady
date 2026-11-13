export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export interface ClientValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
  detectedMime?: string;
}

async function readLeadingBytes(file: File, length: number): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  if (typeof slice.arrayBuffer === 'function') {
    const buffer = await slice.arrayBuffer();
    return new Uint8Array(buffer);
  }
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer.slice(0, length));
  }
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file bytes'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Inspect leading file header bytes for JPEG, PNG, or WebP signatures.
 */
export function detectMagicBytesMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Client-side multi-layer image validation before uploading to FastAPI.
 * Rejects .txt/.exe/empty/oversized/spoofed files before network transit.
 */
export async function validateImageFileClient(file: File): Promise<ClientValidationResult> {
  if (file.size === 0) {
    return {
      valid: false,
      code: 'EMPTY_FILE',
      message: `File "${file.name}" is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: `File "${file.name}" exceeds the 10 MB upload limit.`,
    };
  }

  const dotIdx = file.name.lastIndexOf('.');
  const ext = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      code: 'UNSUPPORTED_EXTENSION',
      message: `Unsupported file "${file.name}". Only JPEG (.jpg/.jpeg), PNG (.png), and WebP (.webp) portraits are accepted.`,
    };
  }

  const declaredMime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIMES.includes(declaredMime as (typeof ALLOWED_MIMES)[number])) {
    return {
      valid: false,
      code: 'UNSUPPORTED_MIME_TYPE',
      message: `Unsupported MIME type "${declaredMime || 'unknown'}" for "${file.name}".`,
    };
  }

  const bytes = await readLeadingBytes(file, 12);
  const detectedMime = detectMagicBytesMime(bytes);

  if (!detectedMime) {
    return {
      valid: false,
      code: 'INVALID_MAGIC_BYTES',
      message: `Security check failed: "${file.name}" does not have valid JPEG, PNG, or WebP magic bytes.`,
    };
  }

  if (detectedMime !== declaredMime) {
    return {
      valid: false,
      code: 'MIME_MAGIC_MISMATCH',
      message: `Spoofed file blocked: "${file.name}" declares ${declaredMime} but binary signature is ${detectedMime}.`,
    };
  }

  if (EXT_TO_MIME[ext] !== detectedMime) {
    return {
      valid: false,
      code: 'EXTENSION_MAGIC_MISMATCH',
      message: `Extension "${ext}" does not match binary signature (${detectedMime}).`,
    };
  }

  return { valid: true, detectedMime };
}
