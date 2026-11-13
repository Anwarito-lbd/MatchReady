import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const OUT_PATH = path.join(process.cwd(), 'docs', 'images', 'architecture-diagram.png');
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
  body { margin: 0; padding: 28px; background: #F3F2EF; color: #1D2226; width: 1280px; }
  .frame { background: #FFFFFF; border: 1px solid #D9D7D2; border-radius: 18px; padding: 26px 28px; box-shadow: 0 12px 32px rgba(10,102,194,0.08); }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E8E6E1; padding-bottom: 14px; margin-bottom: 22px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 38px; height: 38px; border-radius: 9px; background: #0A66C2; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .sub { font-size: 12px; color: #5E6B73; margin-top: 2px; }
  .pill { background: #EDF3F8; color: #0A66C2; border: 1px solid rgba(10,102,194,0.2); padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 38px 1.25fr 38px 1.15fr; align-items: stretch; gap: 0; }
  .col { background: #FAF9F7; border: 1px solid #E0DFDC; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 11px; }
  .col-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; color: #0A66C2; margin-bottom: 2px; }
  .box { background: #FFFFFF; border: 1px solid #E0DFDC; border-radius: 10px; padding: 11px 12px; }
  .box-blue { border-left: 4px solid #0A66C2; }
  .box-green { border-left: 4px solid #057642; }
  .box-red { border-left: 4px solid #B24020; }
  .box h4 { margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #1D2226; }
  .box p { margin: 0; font-size: 11.2px; color: #5E6B73; line-height: 1.42; }
  .tag { display: inline-block; margin-top: 6px; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; font-family: ui-monospace, monospace; background: #EDF3F8; color: #0A66C2; }
  .tag-red { background: #FCE8E6; color: #B24020; }
  .tag-green { background: #E6F4EA; color: #057642; }
  .arrow-col { display: flex; align-items: center; justify-content: center; color: #0A66C2; font-size: 22px; font-weight: 800; }
  .footer { margin-top: 18px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat { background: #EDF3F8; border: 1px solid rgba(10,102,194,0.16); border-radius: 10px; padding: 10px 12px; }
  .stat b { display: block; font-size: 12px; color: #0A66C2; }
  .stat span { font-size: 11px; color: #5E6B73; }
</style>
</head>
<body>
  <div class="frame">
    <div class="header">
      <div class="brand">
        <div class="logo">in</div>
        <div>
          <div class="title">MatchReady — Full-Stack LinkedIn Portrait Studio Architecture</div>
          <div class="sub">Zero-Trust Image Ingestion · Idempotent Credit Ledger · isActive Gate · Hybrid AI &amp; Deterministic Studio Pipeline</div>
        </div>
      </div>
      <div class="pill">React 19 + FastAPI + SQLite WAL</div>
    </div>

    <div class="grid">
      <div class="col">
        <div class="col-title">1. Client SPA (Vite + TS)</div>
        <div class="box box-blue">
          <h4>Client Pre-Flight Validator</h4>
          <p>Reads leading 12 bytes via File slice before network upload; blocks .txt, .exe, and MIME mismatches.</p>
          <span class="tag">JPEG · PNG · WebP &le; 10 MiB</span>
        </div>
        <div class="box box-red">
          <h4>isActive Profile Gate UI</h4>
          <p>Live activation switch + HTTP 403 lock banner preventing generation &amp; LinkedIn publish when inactive.</p>
          <span class="tag tag-red">isActive: boolean</span>
        </div>
        <div class="box box-green">
          <h4>Checkout &amp; Profile Preview</h4>
          <p>Starter / Pro / Team packs, session creation, idempotent receipt view, and 1:1 circular LinkedIn crop preview.</p>
          <span class="tag tag-green">#0A66C2 Brand UI</span>
        </div>
      </div>

      <div class="arrow-col">&rarr;</div>

      <div class="col">
        <div class="col-title">2. FastAPI Security &amp; State Engine</div>
        <div class="box box-blue">
          <h4>5-Layer Upload Firewall</h4>
          <p>Extension allowlist &rarr; MIME check &rarr; Binary magic bytes &rarr; Pillow full pixel decode &rarr; Resolution &amp; SHA-256 bounds.</p>
          <span class="tag tag-red">HTTP 400 / 415 Rejection</span>
        </div>
        <div class="box box-red">
          <h4>Strict isActive Enforcement</h4>
          <p>Evaluated BEFORE credit deduction on /generate and /publish endpoints.</p>
          <span class="tag tag-red">HTTP 403 PROFILE_INACTIVE</span>
        </div>
        <div class="box box-green">
          <h4>Atomic SQLite Credit Ledger</h4>
          <p>BEGIN IMMEDIATE transactions with unique idempotency_key prevent double-crediting and race conditions.</p>
          <span class="tag tag-green">HTTP 402 Insufficient Credits</span>
        </div>
      </div>

      <div class="arrow-col">&rarr;</div>

      <div class="col">
        <div class="col-title">3. AI Portrait Adapter &amp; Storage</div>
        <div class="box box-blue">
          <h4>Provider Strategy Router</h4>
          <p>Routes to Gemini Imagen or HuggingFace when API keys are present; seamless deterministic local fallback.</p>
          <span class="tag">Gemini / HF / Local Studio</span>
        </div>
        <div class="box box-blue">
          <h4>Deterministic Studio DSP</h4>
          <p>YCbCr skin-centroid face crop &rarr; Elliptical Gaussian bokeh matte &rarr; 3-point key light &rarr; UnsharpMask.</p>
          <span class="tag">Pillow + NumPy + SciPy</span>
        </div>
        <div class="box box-green">
          <h4>Dual-Format Output Vault</h4>
          <p>Persists path-traversal-guarded 600&times;800 (3:4) portrait &amp; 800&times;800 (1:1) circular LinkedIn avatar PNGs.</p>
          <span class="tag tag-green">/api/media/generations/*</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="stat"><b>Upload Integrity</b><span>Magic-byte + full pixel decode</span></div>
      <div class="stat"><b>Checkout Safety</b><span>Idempotent replay returns 0 extra</span></div>
      <div class="stat"><b>Access Control</b><span>isActive=false &rarr; 403 before billing</span></div>
      <div class="stat"><b>Offline Guarantee</b><span>100% deterministic local studio mode</span></div>
    </div>
  </div>
</body>
</html>`;

function resolveExecutablePath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return undefined;
  const msPlaywright = path.join(localAppData, 'ms-playwright');
  if (!fs.existsSync(msPlaywright)) return undefined;
  const dirs = fs
    .readdirSync(msPlaywright)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse();
  for (const dir of dirs) {
    const candidate = path.join(msPlaywright, dir, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function main() {
  const executablePath = resolveExecutablePath();
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    const frame = page.locator('.frame');
    await frame.screenshot({ path: OUT_PATH });
    console.log('Generated architecture-diagram.png');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
