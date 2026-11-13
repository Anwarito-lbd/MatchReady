import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';

const MOCK_PROFILES = [
  {
    id: 'demo-anwar',
    fullName: 'Anwar Haddad',
    headline: 'AI Systems Architect & Full-Stack Engineer',
    email: 'anwar@matchready.studio',
    isActive: true,
    credits: 6,
    publishedGenerationId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_PACKS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    priceUsd: 19,
    amountCents: 1900,
    credits: 4,
    badge: null,
    description: '4 portraits',
    features: [],
  },
  {
    id: 'pro',
    name: 'Executive Pro Pack',
    priceUsd: 29,
    amountCents: 2900,
    credits: 8,
    badge: 'Most Popular',
    description: '8 portraits',
    features: [],
  },
  {
    id: 'team',
    name: 'Team / Recruiting Pack',
    priceUsd: 79,
    amountCents: 7900,
    credits: 30,
    badge: 'Best Value',
    description: '30 portraits',
    features: [],
  },
];

const MOCK_STYLES = [
  {
    id: 'executive_navy',
    label: 'Executive Navy Studio',
    subtitle: 'Navy blazer + glass office bokeh',
    backdropHex: '#1B365D',
    accentHex: '#0A66C2',
    attireNote: 'Navy blazer',
  },
];

describe('MatchReady LinkedIn Studio App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/health')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            service: 'MatchReady LinkedIn Studio API',
            version: '1.0.0',
            activeProvider: 'local-studio-deterministic',
          }),
          { status: 200 }
        );
      }
      if (url.endsWith('/api/profiles')) {
        return new Response(JSON.stringify(MOCK_PROFILES), { status: 200 });
      }
      if (url.endsWith('/api/packs')) {
        return new Response(JSON.stringify(MOCK_PACKS), { status: 200 });
      }
      if (url.endsWith('/api/styles')) {
        return new Response(JSON.stringify(MOCK_STYLES), { status: 200 });
      }
      if (url.endsWith('/api/profiles/demo-anwar/generations')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.endsWith('/api/profiles/demo-anwar/status') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({ ...MOCK_PROFILES[0], isActive: body.isActive }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 });
    });
  });

  it('renders LinkedIn brand studio, packs, and enforces isActive toggle in UI', async () => {
    render(<App />);

    expect(await screen.findByText(/Studio-Grade/i)).toBeInTheDocument();
    expect(await screen.findByTestId('header-credits-pill')).toHaveTextContent('6 Credits');
    expect(await screen.findByTestId('pack-card-pro')).toBeInTheDocument();

    // Toggle isActive off via banner button
    const toggleBtn = await screen.findByTestId('banner-toggle-active');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('profile-gate-banner')).toHaveTextContent('isActive: false');
      expect(screen.getByTestId('generate-portraits-btn')).toHaveTextContent(
        'Generate Blocked (Profile Inactive)'
      );
    });
  });

  it('blocks spoofed .png file upload in UI before sending to server', async () => {
    render(<App />);
    const fileInput = (await screen.findByTestId('portrait-file-input')) as HTMLInputElement;

    const spoofedFile = new File(['MZ\x90\x00not-an-image'], 'malware.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [spoofedFile] } });

    const errorAlert = await screen.findByTestId('upload-error');
    expect(errorAlert).toHaveTextContent('INVALID_MAGIC_BYTES');
  });
});
