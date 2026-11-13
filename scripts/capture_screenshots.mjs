import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'images');
fs.mkdirSync(OUT_DIR, { recursive: true });

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

async function waitForUrl(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const tmpDataDir = path.join(REPO_ROOT, 'backend', 'data', 'screenshot_run');
  const tmpVideoDir = path.join(REPO_ROOT, 'backend', 'data', 'video_tmp');
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
  fs.rmSync(tmpVideoDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDataDir, { recursive: true });
  fs.mkdirSync(tmpVideoDir, { recursive: true });

  const backendEnv = {
    ...process.env,
    MATCHREADY_DB_PATH: path.join(tmpDataDir, 'matchready.db'),
    MATCHREADY_MEDIA_DIR: path.join(tmpDataDir, 'media'),
    MATCHREADY_PREFERRED_PROVIDER: 'local',
  };

  const backend = spawn(
    'python',
    ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    { cwd: REPO_ROOT, env: backendEnv, stdio: 'pipe' }
  );

  const frontend = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
    { cwd: REPO_ROOT, shell: true, stdio: 'pipe' }
  );

  const unexpectedErrors = [];
  let allowExpected403 = false;
  let browser;

  try {
    await waitForUrl('http://127.0.0.1:8000/api/health');
    await waitForUrl('http://127.0.0.1:4173/');

    const executablePath = resolveExecutablePath();
    browser = await chromium.launch({ headless: true, executablePath });

    // 1. Desktop walkthrough WITH screen recording
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: tmpVideoDir,
        size: { width: 1280, height: 800 },
      },
    });
    const page = await desktopCtx.newPage();
    page.on('pageerror', (err) => unexpectedErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (allowExpected403 && text.includes('403')) return;
        unexpectedErrors.push(`console.error: ${text}`);
      }
    });

    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    await page.locator('#studio-workspace').scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);

    // Step A: Test isActive gating (toggle inactive -> attempt generate -> 403 -> re-activate)
    await page.getByTestId('banner-toggle-active').click();
    await page.waitForTimeout(400);
    await page.getByTestId('load-demo-portrait').click();
    await page.getByTestId('upload-success').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(350);

    allowExpected403 = true;
    await page.getByTestId('generate-portraits-btn').click();
    await page.getByTestId('generation-error').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(650);
    allowExpected403 = false;

    // Re-activate profile
    await page.getByTestId('banner-toggle-active').click();
    await page.waitForTimeout(400);

    // Step B: Generate 2 LinkedIn studio portraits & wait for button to finish
    await page.getByTestId('generate-portraits-btn').click();
    await page.locator('[data-testid^="generation-card-"]').first().waitFor({
      state: 'visible',
      timeout: 25000,
    });
    await page
      .getByTestId('generate-portraits-btn')
      .filter({ hasText: 'Generate 2 Portraits' })
      .waitFor({ state: 'visible', timeout: 25000 });
    await page.waitForTimeout(500);

    // Step C: Checkout Pro Pack + Confirm
    await page.getByTestId('pack-card-pro').click();
    await page.waitForTimeout(250);
    await page.getByTestId('create-checkout-btn').click();
    await page.getByTestId('checkout-session-box').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(350);
    await page.getByTestId('confirm-payment-btn').click();
    await page.getByTestId('checkout-receipt').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    // Publish first portrait
    const firstGenCard = page.locator('[data-testid^="generation-card-"]').first();
    await firstGenCard.scrollIntoViewIfNeeded();
    await firstGenCard.getByRole('button', { name: 'Publish' }).click();
    await page.waitForTimeout(800);

    const videoObj = page.video();
    await desktopCtx.close();

    if (videoObj) {
      const recordedPath = await videoObj.path();
      const targetWebm = path.join(OUT_DIR, 'studio-walkthrough.webm');
      fs.copyFileSync(recordedPath, targetWebm);

      const targetGif = path.join(OUT_DIR, 'studio-walkthrough.gif');
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-i',
          targetWebm,
          '-vf',
          'fps=8,scale=840:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer',
          targetGif,
        ],
        { stdio: 'ignore' }
      );
    }

    // 2. High-DPI Desktop Screenshots (1440x900)
    const shotCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const shotPage = await shotCtx.newPage();
    shotPage.on('pageerror', (err) => unexpectedErrors.push(`shot pageerror: ${err.message}`));
    shotPage.on('console', (msg) => {
      if (msg.type() === 'error') unexpectedErrors.push(`shot console.error: ${msg.text()}`);
    });

    await shotPage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await shotPage.getByTestId('load-demo-portrait').click();
    await shotPage.getByTestId('upload-success').waitFor({ state: 'visible', timeout: 15000 });

    // Scroll back to very top so sticky header renders cleanly at y=0 in fullPage screenshot
    await shotPage.evaluate(() => window.scrollTo(0, 0));
    await shotPage.waitForTimeout(300);

    const desktopOverflow = await shotPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    if (desktopOverflow) throw new Error('Desktop layout has horizontal overflow');

    await shotPage.screenshot({
      path: path.join(OUT_DIR, 'desktop-studio.png'),
      fullPage: true,
    });

    // Checkout screenshot
    await shotPage.getByTestId('pack-card-pro').click();
    await shotPage.getByTestId('create-checkout-btn').click();
    await shotPage.getByTestId('checkout-session-box').waitFor({ state: 'visible', timeout: 10000 });
    await shotPage.getByTestId('confirm-payment-btn').click();
    await shotPage.getByTestId('checkout-receipt').waitFor({ state: 'visible', timeout: 10000 });
    await shotPage.locator('#checkout-section').scrollIntoViewIfNeeded();
    await shotPage.waitForTimeout(300);
    await shotPage.screenshot({
      path: path.join(OUT_DIR, 'checkout-flow.png'),
      fullPage: false,
    });
    await shotCtx.close();

    // 3. Mobile 390x844 Screenshot
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileCtx.newPage();
    mobilePage.on('pageerror', (err) => unexpectedErrors.push(`mobile pageerror: ${err.message}`));
    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') unexpectedErrors.push(`mobile console.error: ${msg.text()}`);
    });

    await mobilePage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await mobilePage.evaluate(() => window.scrollTo(0, 0));
    await mobilePage.waitForTimeout(400);

    const mobileOverflow = await mobilePage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    if (mobileOverflow) throw new Error('Mobile 390x844 layout has horizontal overflow');

    await mobilePage.screenshot({
      path: path.join(OUT_DIR, 'mobile-studio.png'),
      fullPage: true,
    });
    await mobileCtx.close();

    if (unexpectedErrors.length > 0) {
      throw new Error(`Unexpected console/page errors detected:\n${unexpectedErrors.join('\n')}`);
    }

    console.log('All screenshots and walkthrough video/GIF captured with zero unexpected errors.');
  } finally {
    if (browser) await browser.close();
    backend.kill();
    frontend.kill();
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    fs.rmSync(tmpVideoDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
