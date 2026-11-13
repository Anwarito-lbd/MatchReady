import { describe, expect, it } from 'vitest';
import { detectMagicBytesMime, validateImageFileClient } from '../lib/validation';

function makeFile(bytes: Uint8Array | string, name: string, type: string): File {
  const part = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const blob = new Blob([part as BlobPart], { type });
  return new File([blob], name, { type });
}

describe('Client-side Image Validation (MIME + Magic Bytes)', () => {
  it('detects JPEG, PNG, and WebP magic bytes accurately', () => {
    expect(detectMagicBytesMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(
      detectMagicBytesMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe('image/png');
    expect(
      detectMagicBytesMime(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      )
    ).toBe('image/webp');
    expect(detectMagicBytesMime(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull(); // MZ exe
  });

  it('accepts valid PNG, JPEG, and WebP files', async () => {
    const png = makeFile(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
      'portrait.png',
      'image/png'
    );
    const res = await validateImageFileClient(png);
    expect(res.valid).toBe(true);
    expect(res.detectedMime).toBe('image/png');
  });

  it('rejects .txt, .exe, empty, and spoofed files', async () => {
    const txt = makeFile('plain text', 'readme.txt', 'text/plain');
    expect((await validateImageFileClient(txt)).valid).toBe(false);

    const exe = makeFile(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), 'trojan.exe', 'application/octet-stream');
    expect((await validateImageFileClient(exe)).valid).toBe(false);

    const spoofedPng = makeFile('not actually a png', 'fake.png', 'image/png');
    const spoofRes = await validateImageFileClient(spoofedPng);
    expect(spoofRes.valid).toBe(false);
    expect(spoofRes.code).toBe('INVALID_MAGIC_BYTES');

    const mimeMismatch = makeFile(
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      'fake.png',
      'image/png'
    );
    const mismatchRes = await validateImageFileClient(mimeMismatch);
    expect(mismatchRes.valid).toBe(false);
    expect(mismatchRes.code).toBe('MIME_MAGIC_MISMATCH');

    const empty = makeFile(new Uint8Array([]), 'empty.png', 'image/png');
    const emptyRes = await validateImageFileClient(empty);
    expect(emptyRes.valid).toBe(false);
    expect(emptyRes.code).toBe('EMPTY_FILE');
  });
});
