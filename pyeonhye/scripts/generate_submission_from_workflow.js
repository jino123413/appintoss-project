const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.resolve(ROOT, 'pyeonhye');
const SUBMISSION_DIR = path.resolve(APP, 'submission');
const CAPTURE_DIR = path.resolve(APP, 'docs', 'ux-captures');
const ICON_PATH = path.resolve(ROOT, 'app-logos', 'pyeonhye.png');

const appMeta = {
  displayName: '편혜',
  color: '#0EA5A4',
  desc: '브랜드별 1+1/2+1/할인 상품 빠른 비교',
  captions: [
    '발견: 지금 필요한 행사상품을 빠르게 찾기',
    '비교: 같은 상품을 브랜드별로 비교',
    '저장: 북마크 갱신 체크로 변동 확인',
  ],
};

function readB64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function darken(hex, f = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
}

function lighten(hex, f = 0.25) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
}

const FONTS = `
<link href="https://cdn.jsdelivr.net/gh/webfontworld/gmarket/GmarketSans.css" rel="stylesheet">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
`;

function baseStyle(w, h, color) {
  return `
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width:${w}px; height:${h}px; overflow:hidden;
  background: linear-gradient(135deg, ${lighten(color, 0.1)}, ${color}, ${darken(color, 0.3)});
  font-family: 'GmarketSans', 'Pretendard Variable', sans-serif;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}`;
}

function phoneFrameCSS(phoneW) {
  const frameR = Math.round(phoneW * 0.135);
  const screenR = Math.round(phoneW * 0.11);
  const framePad = Math.round(phoneW * 0.032);
  const notchW = Math.round(phoneW * 0.33);
  const notchH = Math.round(phoneW * 0.075);
  return `
.phone {
  width:${phoneW}px; padding:${framePad}px;
  background:#1a1a1a; border-radius:${frameR}px;
  box-shadow: 0 ${Math.round(phoneW * 0.06)}px ${Math.round(phoneW * 0.15)}px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.1);
  position:relative;
}
.phone::before {
  content:''; position:absolute;
  top:${framePad}px; left:50%; transform:translateX(-50%);
  width:${notchW}px; height:${notchH}px;
  background:#1a1a1a; border-radius:0 0 ${Math.round(notchH * 0.6)}px ${Math.round(notchH * 0.6)}px;
  z-index:10;
}
.phone .screen { border-radius:${screenR}px; overflow:hidden; background:#fff; }
.phone .screen img { display:block; width:100%; height:auto; }
`;
}

function thumbSquareHTML(iconB64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1000, 1000, appMeta.color)}
.icon-wrap {
  width:296px; height:296px; border-radius:64px;
  display:flex; align-items:center; justify-content:center;
  background: rgba(255,255,255,0.10);
  box-shadow: 0 16px 48px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.22);
  margin-bottom:36px;
}
.icon { width:236px; height:236px; border-radius:52px; object-fit:cover; }
h1 { color:#fff; font-size:72px; font-weight:700; margin-bottom:14px; text-shadow:0 2px 8px rgba(0,0,0,0.15); }
p { color:rgba(255,255,255,0.88); font-size:31px; font-weight:500; text-align:center; }
.deco { position:absolute; border-radius:50%; opacity:0.08; background:#fff; }
.d1 { width:400px; height:400px; top:-100px; right:-80px; }
.d2 { width:250px; height:250px; bottom:-60px; left:-40px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="icon-wrap"><img class="icon" src="data:image/png;base64,${iconB64}" /></div>
<h1>${appMeta.displayName}</h1>
<p>${appMeta.desc}</p>
</body></html>`;
}

function thumbLandscapeHTML(iconB64, screenshotB64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1932, 828, appMeta.color)}
body { flex-direction:row; align-items:center; justify-content:space-between; gap:56px; padding:0 120px; position:relative; }
.left { display:flex; flex-direction:column; justify-content:center; flex:1; min-width:0; max-width:900px; }
.icon { width:160px; height:160px; border-radius:34px; box-shadow:0 12px 36px rgba(0,0,0,0.2); margin-bottom:24px; object-fit:cover; }
h1 { color:#fff; font-size:62px; font-weight:700; margin-bottom:10px; text-shadow:0 2px 6px rgba(0,0,0,0.12); }
p { color:rgba(255,255,255,0.88); font-size:30px; font-weight:500; max-width:780px; line-height:1.4; }
.right { display:flex; align-items:center; justify-content:flex-end; flex:0 0 340px; width:340px; }
${phoneFrameCSS(248)}
.deco { position:absolute; border-radius:50%; opacity:0.07; background:#fff; }
.d1 { width:500px; height:500px; top:-180px; right:200px; }
.d2 { width:300px; height:300px; bottom:-100px; left:300px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="left">
  <img class="icon" src="data:image/png;base64,${iconB64}" />
  <h1>가격 비교, 바로 결정</h1>
  <p>찾기 → 비교 → 저장, 필요한 흐름만 남겼습니다.</p>
</div>
<div class="right"><div class="phone"><div class="screen"><img src="data:image/png;base64,${screenshotB64}" /></div></div></div>
</body></html>`;
}

function screenshotPortraitHTML(screenshotB64, caption) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(636, 1048, appMeta.color)}
body { justify-content:flex-start; padding-top:80px; position:relative; }
.caption {
  color:#fff; font-size:26px; font-weight:700; text-align:center;
  margin-bottom:32px; text-shadow:0 1px 4px rgba(0,0,0,0.15);
  line-height:1.4; padding:0 40px;
}
.sub { font-size:18px; font-weight:500; color:rgba(255,255,255,0.72); margin-top:8px; display:block; }
${phoneFrameCSS(290)}
.deco { position:absolute; border-radius:50%; opacity:0.06; background:#fff; }
.d1 { width:300px; height:300px; top:-80px; right:-60px; }
.d2 { width:200px; height:200px; bottom:40px; left:-40px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="caption">${caption}<span class="sub">${appMeta.displayName}</span></div>
<div class="phone"><div class="screen"><img src="data:image/png;base64,${screenshotB64}" /></div></div>
</body></html>`;
}

function screenshotLandscapeFlowHTML(iconB64, homeB64, midB64, fullB64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1504, 741, appMeta.color)}
body { position:relative; flex-direction:column; gap:0; overflow:hidden; }
.brand { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.brand img { width:36px; height:36px; border-radius:8px; }
.brand span { color:#fff; font-size:20px; font-weight:700; }
.flow { display:flex; align-items:center; gap:0; }
.step { display:flex; flex-direction:column; align-items:center; gap:10px; }
.step-label { color:rgba(255,255,255,0.86); font-size:12px; font-weight:600; padding:5px 14px; background:rgba(255,255,255,0.14); border-radius:999px; }
${phoneFrameCSS(170)}
.arrow { color:rgba(255,255,255,0.36); font-size:34px; font-weight:600; padding:0 12px; margin-top:-20px; }
.sub { color:rgba(255,255,255,0.66); font-size:14px; margin-top:12px; }
.deco { position:absolute; border-radius:50%; opacity:0.05; background:#fff; }
.d1 { width:350px; height:350px; top:-100px; left:-60px; }
.d2 { width:280px; height:280px; bottom:-80px; right:-40px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="brand"><img src="data:image/png;base64,${iconB64}"><span>편혜 UX 흐름</span></div>
<div class="flow">
  <div class="step">
    <div class="step-label">STEP 1</div>
    <div class="phone"><div class="screen"><img src="data:image/png;base64,${homeB64}"/></div></div>
    <div class="sub">발견</div>
  </div>
  <div class="arrow">→</div>
  <div class="step">
    <div class="step-label">STEP 2</div>
    <div class="phone"><div class="screen"><img src="data:image/png;base64,${midB64}"/></div></div>
    <div class="sub">비교</div>
  </div>
  <div class="arrow">→</div>
  <div class="step">
    <div class="step-label">STEP 3</div>
    <div class="phone"><div class="screen"><img src="data:image/png;base64,${fullB64}"/></div></div>
    <div class="sub">재확인</div>
  </div>
</div>
</body></html>`;
}

async function screenshotHTML(page, width, height, html, outputPath) {
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outputPath });
}

async function main() {
  if (!fs.existsSync(ICON_PATH)) {
    throw new Error(`Icon not found: ${ICON_PATH}`);
  }
  const homeViewport = path.resolve(CAPTURE_DIR, '01-home-list-viewport.png');
  const required = [
    fs.existsSync(homeViewport) ? homeViewport : path.resolve(CAPTURE_DIR, '01-home-list.png'),
    path.resolve(CAPTURE_DIR, '04-compare-expanded.png'),
    path.resolve(CAPTURE_DIR, '06-bookmark-refresh-result.png'),
  ];
  for (const p of required) {
    if (!fs.existsSync(p)) throw new Error(`Capture not found: ${p}`);
  }

  fs.mkdirSync(SUBMISSION_DIR, { recursive: true });
  const iconB64 = readB64(ICON_PATH);
  const homeB64 = readB64(required[0]);
  const midB64 = readB64(required[1]);
  const fullB64 = readB64(required[2]);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await screenshotHTML(page, 1000, 1000, thumbSquareHTML(iconB64), path.resolve(SUBMISSION_DIR, 'thumb-square.png'));
  await screenshotHTML(page, 1932, 828, thumbLandscapeHTML(iconB64, homeB64), path.resolve(SUBMISSION_DIR, 'thumb-landscape.png'));
  await screenshotHTML(page, 636, 1048, screenshotPortraitHTML(homeB64, appMeta.captions[0]), path.resolve(SUBMISSION_DIR, 'screenshot-1.png'));
  await screenshotHTML(page, 636, 1048, screenshotPortraitHTML(midB64, appMeta.captions[1]), path.resolve(SUBMISSION_DIR, 'screenshot-2.png'));
  await screenshotHTML(page, 636, 1048, screenshotPortraitHTML(fullB64, appMeta.captions[2]), path.resolve(SUBMISSION_DIR, 'screenshot-3.png'));
  await screenshotHTML(page, 1504, 741, screenshotLandscapeFlowHTML(iconB64, homeB64, midB64, fullB64), path.resolve(SUBMISSION_DIR, 'screenshot-landscape.png'));

  await page.close();
  await browser.close();

  console.log(`Generated submission assets in ${SUBMISSION_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
