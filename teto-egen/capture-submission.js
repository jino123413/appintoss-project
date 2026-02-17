const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const RAW_DIR = path.join(BASE, 'raw');
const APP_URL = process.env.TETO_EGEN_URL || 'http://localhost:3000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(1200);

    await page.screenshot({ path: path.join(RAW_DIR, 'raw-home.png') });
    await page.screenshot({ path: path.join(RAW_DIR, 'raw-full.png'), fullPage: true });

    await page.screenshot({ path: path.join(RAW_DIR, 'screen-1.png') });
    console.log('[OK] raw/screen-1.png');

    const nameInput = page.locator('input').first();
    if (!(await nameInput.isVisible())) {
      const retryButton = page.getByRole('button', { name: '다시 분석하기' });
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await sleep(500);
      }
    }
    await page.locator('input').first().fill('테토에겐');

    await page.getByRole('button', { name: '먼저 분위기를 띄운다' }).click();
    await page.getByRole('button', { name: '핵심만 바로 말한다' }).click();
    await page.getByRole('button', { name: '일단 해보고 조정한다' }).click();

    await page.getByRole('button', { name: '오늘 성향 분석하기' }).click();

    await page.getByText('오늘의 중심축', { exact: true }).waitFor({ timeout: 15000 });
    await sleep(600);

    await page.screenshot({ path: path.join(RAW_DIR, 'screen-2.png') });
    console.log('[OK] raw/screen-2.png');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(600);

    await page.screenshot({ path: path.join(RAW_DIR, 'screen-3.png') });
    console.log('[OK] raw/screen-3.png');
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
