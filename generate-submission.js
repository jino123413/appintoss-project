// generate-submission.js — 토스 콘솔 제출 이미지 자동 생성
// 15개 앱 × 6종 이미지 = 90장
// 사용법: node generate-submission.js [앱이름]  (앱이름 생략 시 전체)

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = __dirname;

const apps = [
  { name: 'dday-calculator', displayName: '하루모아', color: '#7C3AED', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/dday-calculator.png', desc: 'D-Day까지 하루 얼마 모을까', captions: ['목표 금액과 D-Day를 설정하세요', '매일 자동으로 계산해드려요', '한눈에 보는 저축 현황'], landscapeLayout: 'tilted-single' },
  { name: 'one-line-diary', displayName: '오늘 한 줄', color: '#FF6B6B', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/one-line-diary.png', desc: '오늘 하루, 한 문장으로 남기면', captions: ['오늘 하루를 한 줄로 기록하세요', '감정 이모지로 하루를 표현해요', '소중한 일상이 모여 이야기가 됩니다'], landscapeLayout: 'overlap-duo' },
  { name: 'balance-game', displayName: '이거 저거', color: '#00BFA5', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/balance-game.png', desc: 'A vs B, 당신의 선택은', captions: ['둘 중 하나, 당신의 선택은?', '실시간 투표 결과를 확인하세요', '매일 새로운 밸런스 게임'], landscapeLayout: 'overlap-duo' },
  { name: 'quiz-king', displayName: '상식왕', color: '#F59E0B', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/quiz-king.png', desc: '나의 상식 등급은 몇일까', captions: ['다양한 분야의 상식 퀴즈', '10문제로 실력을 확인하세요', '친구와 점수를 비교해보세요'], landscapeLayout: 'flow-story' },
  { name: 'today-fortune', displayName: '오늘 어때', color: '#6C3CE1', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/today-fortune.png', desc: '매일 새로운 운세가 기다리고 있어요', captions: ['오늘의 운세를 확인하세요', '매일 다른 운세가 기다려요', '연속 방문하면 특별한 메시지가!'], landscapeLayout: 'spotlight' },
  { name: 'star-fortune', displayName: '별이 뭐래', color: '#1A237E', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/star-fortune.png', desc: '내 별자리가 말하는 오늘은', captions: ['12개 별자리 중 나의 별자리는?', '오늘의 별자리 운세를 확인하세요', '연애·금전·건강 운세 한눈에'], landscapeLayout: 'tilted-single' },
  { name: 'tarot-pick', displayName: '타로 한 장', color: '#6A1B4D', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/tarot-pick.png', desc: '딱 한 장, 뭐가 나올까', captions: ['오늘의 타로 카드 한 장을 뽑으세요', '카드가 전하는 메시지를 읽어보세요', '매일 새로운 카드가 기다려요'], landscapeLayout: 'spotlight' },
  { name: 'love-fortune', displayName: '연애 몇 점', color: '#E91E63', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/love-fortune.png', desc: '오늘 내 연애 점수는 몇 점일까', captions: ['이름을 입력하면 연애 점수가!', '오늘의 연애 운세를 확인하세요', '친구에게 공유해보세요'], landscapeLayout: 'overlap-duo' },
  { name: 'dubai-cookie', displayName: '내가 두쫀쿠?', color: '#8B6914', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/dubai-cookie.png', desc: '이름 속에 숨은 감정, 쫀쿠로 태어나다', captions: ['이름을 입력하면 쫀쿠가 탄생!', '나만의 감정 쿠키를 만나보세요', '친구와 쿠키를 비교해보세요'], landscapeLayout: 'triple-fan' },
  { name: 'where-to-go', displayName: '운명의 나침반', color: '#0D9488', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/where-to-go.png', desc: '나침반이 가리키는 오늘의 여행지', captions: ['나침반을 돌려 여행지를 정하세요', '운명이 가리키는 곳으로 떠나볼까요', '매번 새로운 여행지를 추천해드려요'], landscapeLayout: 'spotlight' },
  { name: 'aura-spoon', displayName: '나만의 기운이', color: '#7B61FF', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/aura-spoon.png', desc: '이름으로 만나는 나만의 기운', captions: ['이름을 입력하면 기운이 탄생!', '나만의 기운 캐릭터를 만나보세요', '친구에게 기운을 나눠주세요'], landscapeLayout: 'overlap-duo' },
  { name: 'random-picker', displayName: '골라줘', color: '#FF4081', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/random-picker.png', desc: '결정 못 할 때 대신 골라줘', captions: ['선택지를 입력하면 대신 골라줘요', '룰렛을 돌려 결정하세요', '점심 메뉴부터 중요한 결정까지'], landscapeLayout: 'spotlight' },
  { name: 'spelling-master', displayName: '맞춤법 달인', color: '#6366F1', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/spelling-master.png', desc: '맞춤법, 자신 있으세요', captions: ['헷갈리는 맞춤법 문제를 풀어보세요', '10문제로 실력을 확인해요', '맞춤법 달인에 도전하세요'], landscapeLayout: 'flow-story' },
  { name: 'name-chemi', displayName: '우리 케미', color: '#FF7043', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/name-chemi.png', desc: '이름 속 끌림, 얼마나 강할까', captions: ['두 사람의 이름을 입력하세요', '이름 속 케미 점수를 확인해요', '친구, 연인, 가족과 케미를 비교!'], landscapeLayout: 'overlap-duo' },
  { name: 'nostalgia-gacha', displayName: '추억 뽑기', color: '#E87C5D', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/nostalgia-gacha.png', desc: '오늘의 추억 한 캡슐, 뭐가 나올까?', captions: ['100원을 넣고 뽑기를 돌려보세요', '90년대 추억 아이템이 쏟아져요', '30종 아이템을 모두 수집하세요'], landscapeLayout: 'triple-fan' },
  { name: 'personality-test', displayName: '진짜 나', color: '#7C4DFF', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/personality-test.png', desc: '숨겨진 내 성격은 뭘까', captions: ['나를 알아가는 심리테스트 시작', '질문에 답하며 나의 유형 찾기', '내 성격 유형과 상세 분석 확인'], landscapeLayout: 'tilted-single' },
  { name: 'sleep-formula', displayName: '수면 공식', color: '#4F46E5', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/sleep-formula.png', desc: '몇 시에 자야 개운할까', captions: ['수면 주기 기반 최적 시간 계산', '카페인 섭취량 추적하기', '수면 분석으로 수면 습관 개선'], landscapeLayout: 'tilted-single' },
  { name: 'reaction-test', displayName: '번개손', color: '#7C3AED', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/reaction-test.png', desc: '나의 반응 속도를 테스트해요', captions: ['3가지 반응 테스트 모드 선택', '화면 터치로 반응속도 측정', '번개 레벨 결과와 종합 프로필'], landscapeLayout: 'flow-story' },
  { name: 'sense-test', displayName: '눈치 있는 사람', color: '#0EA5E9', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/sense-test.png', desc: '당신의 감각은 얼마나 정확할까', captions: ['감각 테스트 3가지 모드 선택', '시간 감각 측정 중 추정하기', '눈 레벨 결과와 홍채 프로필'], landscapeLayout: 'spotlight' },
  { name: 'political-test', displayName: '정치 성향 좌표', color: '#6366F1', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/political-test.png', desc: '나의 정치 성향 위치를 알아봐요', captions: ['정치 성향 테스트 시작하기', '12가지 질문에 동의 정도 선택', '2차원 좌표에서 나의 성향 위치'], landscapeLayout: 'tilted-single' },
  { name: 'salary-calculator', displayName: '페이체크', color: '#1B9C85', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/salary-calculator.png', desc: '연봉 실수령액, 한눈에 확인하세요', captions: ['연봉을 입력하면 실수령액이!', '4대보험·세금 상세 공제 내역', '희망 실수령액으로 연봉 역산'], landscapeLayout: 'tilted-single' },
  { name: 'health-index', displayName: '헬스인덱스', color: '#00BFA5', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/health-index.png', desc: '나의 건강 지수를 계산해보세요', captions: ['키·몸무게로 건강 지수 측정', 'BMI·기초대사량·활동대사량 분석', '목표 체중 달성 시뮬레이션'], landscapeLayout: 'triple-fan' },
  { name: 'receipt-static', displayName: '나만의 복리계산기', color: '#3182F6', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/receipt-static.png', desc: '복리의 마법을 직접 확인하세요', captions: ['원금과 이율을 입력하세요', '복리 수익 변화를 한눈에', '월 적립금으로 미래 자산 계산'], landscapeLayout: 'overlap-duo' },
  { name: 'unit-converter', displayName: '단위변환기', color: '#5C6BC0', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/unit-converter.png', desc: '모든 단위를 한 번에 변환하세요', captions: ['7가지 카테고리 단위 변환', '퀵 프리셋으로 빠른 변환', '변환 기록 저장 및 재사용'], landscapeLayout: 'spotlight' },
  { name: 'lotto-generator', displayName: '로또메이트', color: '#FF6B35', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/lotto-generator.png', desc: '통계 기반 로또 번호 생성기', captions: ['4가지 모드로 번호 생성', '최신 당첨 통계 분석', '번호 제외·포함 필터 설정'], landscapeLayout: 'triple-fan' },
  { name: 'exchange-calculator', displayName: '나만의 환율계산기', color: '#3182F6', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/exchange-calculator.png', desc: '실시간 환율로 간편 계산', captions: ['7개 통화 실시간 환율 계산', '환율 추이 차트 확인', '통화 쌍 스왑으로 간편 비교'], landscapeLayout: 'overlap-duo' },
  { name: 'color-mood', displayName: '컬러 무드', color: '#A78BFA', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/color-mood.png', desc: '하루 한 색, 감정을 칠해보세요', captions: ['오늘의 감정을 색으로 담아보세요', '시적 한국어 이름으로 색을 기록해요', '월간 팔레트로 감정 변화를 한눈에'], landscapeLayout: 'spotlight' },
  { name: 'dream-interpret', displayName: '간밤의 꿈', color: '#1A1B4B', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/dream-interpret.png', desc: '간밤에 꾼 꿈, 수정구슬이 읽어줄게', captions: ['꿈 내용을 자유롭게 적어보세요', '수정구슬이 꿈을 해석하고 있어요', '성운 맵으로 꿈의 상징을 한눈에'], landscapeLayout: 'tilted-single' },
  { name: 'daily-idiom', displayName: '오늘의 사자성어', color: '#B91C1C', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/daily-idiom.png', desc: '하루 한 문제, 사자성어 도감', captions: ['오늘의 두루마리를 펼쳐보세요', '한자 빈칸에 정답을 채워보세요', '인장함에 사자성어를 수집하세요'], landscapeLayout: 'triple-fan' },
  { name: 'menu-today', displayName: '밥심', color: '#F10803', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/menu-today.png', desc: '오늘 뭐 먹지? 조건만 골라봐', captions: ['7가지 조건으로 딱 맞는 메뉴를 추천받으세요', '추천 결과와 대안 메뉴를 한 번에 확인', '기록·즐겨찾기로 나만의 메뉴 스타일을 정리'], landscapeLayout: 'triple-fan' },
  { name: 'hangul-word-chain', displayName: '한글 끝말잇기', color: '#0EA5A4', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/hangul-word-chain.png', desc: '혼자서 즐기는 한글 끝말잇기', captions: ['오늘의 시작 단어로 끝말잇기를 시작하세요', '단어를 이어 기록과 수집을 쌓아보세요', '게임 종료 후 AD 이어하기로 한 번 더 도전'], landscapeLayout: 'flow-story' },
  { name: 'teto-egen', displayName: '넌 테토야 에겐이야', color: '#0F766E', icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/teto-egen.png', desc: '오늘의 테토·에겐 결을 분석해요', captions: ['이름과 3문항으로 오늘의 성향 분석', '지층 단면으로 테토·에겐 축을 확인', '심층 리포트로 오늘의 결을 더 자세히'], landscapeLayout: 'flow-story' },
  ];

// --- Color utilities ---
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

function isLightColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// --- Shared CSS ---
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

// iPhone frame CSS component
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
  box-shadow: 0 ${Math.round(phoneW*0.06)}px ${Math.round(phoneW*0.15)}px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.1);
  position:relative;
}
.phone::before {
  content:''; position:absolute;
  top:${framePad}px; left:50%; transform:translateX(-50%);
  width:${notchW}px; height:${notchH}px;
  background:#1a1a1a; border-radius:0 0 ${Math.round(notchH*0.6)}px ${Math.round(notchH*0.6)}px;
  z-index:10;
}
.phone .screen {
  border-radius:${screenR}px; overflow:hidden;
  background:#fff;
}
.phone .screen img {
  display:block; width:100%; height:auto;
}`;
}

// --- Templates ---

function thumbSquareHTML(app) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1000, 1000, app.color)}
.icon {
  width:260px; height:260px; border-radius:58px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.25);
  margin-bottom:36px; object-fit:cover;
}
h1 { color:#fff; font-size:68px; font-weight:700; margin-bottom:14px; text-shadow:0 2px 8px rgba(0,0,0,0.15); }
p { color:rgba(255,255,255,0.85); font-size:30px; font-weight:500; }
.deco { position:absolute; border-radius:50%; opacity:0.08; background:#fff; }
.d1 { width:400px; height:400px; top:-100px; right:-80px; }
.d2 { width:250px; height:250px; bottom:-60px; left:-40px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<img class="icon" src="${app.icon}" />
<h1>${app.displayName}</h1>
<p>${app.desc}</p>
</body></html>`;
}

function thumbLandscapeHTML(app, screenshotB64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1932, 828, app.color)}
body { flex-direction:row; justify-content:space-between; padding:0 100px; position:relative; }
.left { display:flex; flex-direction:column; justify-content:center; flex:1; max-width:800px; }
.icon { width:160px; height:160px; border-radius:36px; box-shadow:0 12px 36px rgba(0,0,0,0.2); margin-bottom:28px; object-fit:cover; }
h1 { color:#fff; font-size:64px; font-weight:700; margin-bottom:12px; text-shadow:0 2px 6px rgba(0,0,0,0.12); }
p { color:rgba(255,255,255,0.85); font-size:28px; font-weight:500; max-width:600px; line-height:1.4; }
.right { display:flex; align-items:center; justify-content:center; }
${phoneFrameCSS(260)}
.deco { position:absolute; border-radius:50%; opacity:0.07; background:#fff; }
.d1 { width:500px; height:500px; top:-180px; right:200px; }
.d2 { width:300px; height:300px; bottom:-100px; left:300px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="left">
  <img class="icon" src="${app.icon}" />
  <h1>${app.displayName}</h1>
  <p>${app.desc}</p>
</div>
<div class="right">
  <div class="phone"><div class="screen"><img src="data:image/png;base64,${screenshotB64}" /></div></div>
</div>
</body></html>`;
}

function screenshotPortraitHTML(app, screenshotB64, caption) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(636, 1048, app.color)}
body { justify-content:flex-start; padding-top:80px; position:relative; }
.caption {
  color:#fff; font-size:26px; font-weight:700; text-align:center;
  margin-bottom:32px; text-shadow:0 1px 4px rgba(0,0,0,0.15);
  line-height:1.4; padding:0 40px;
}
.sub { font-size:18px; font-weight:500; color:rgba(255,255,255,0.7); margin-top:8px; display:block; }
${phoneFrameCSS(290)}
.deco { position:absolute; border-radius:50%; opacity:0.06; background:#fff; }
.d1 { width:300px; height:300px; top:-80px; right:-60px; }
.d2 { width:200px; height:200px; bottom:40px; left:-40px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="caption">${caption}<span class="sub">${app.displayName}</span></div>
<div class="phone"><div class="screen"><img src="data:image/png;base64,${screenshotB64}" /></div></div>
</body></html>`;
}

// --- Landscape layout variants (폰 중심 — 썸네일 "좌텍스트/우폰"과 완전 차별화) ---

// triple-fan: 3대 부채꼴 배치, 중앙 폰 크게, 좌우 기울임
function landscapeTripleFan(app, homeB64, midB64, fullB64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1504, 741, app.color)}
body { position:relative; overflow:hidden; }
.brand { position:absolute; top:28px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; z-index:10; }
.brand img { width:40px; height:40px; border-radius:10px; }
.brand span { color:#fff; font-size:22px; font-weight:700; }
.sub { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,0.7); font-size:16px; font-weight:500; white-space:nowrap; }
.phones { position:absolute; top:50%; left:50%; transform:translate(-50%,-46%); display:flex; align-items:center; gap:20px; }
${phoneFrameCSS(180)}
.phones .side-l { transform:rotate(-7deg); opacity:0.85; }
.phones .center { transform:scale(1.12); z-index:5; box-shadow:0 20px 60px rgba(0,0,0,0.4); }
.phones .side-r { transform:rotate(7deg); opacity:0.85; }
.glow { position:absolute; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%); top:50%; left:50%; transform:translate(-50%,-50%); }
.deco { position:absolute; border-radius:50%; opacity:0.05; background:#fff; }
.d1 { width:400px; height:400px; top:-120px; left:-80px; }
.d2 { width:300px; height:300px; top:-60px; right:-60px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div><div class="glow"></div>
<div class="brand"><img src="${app.icon}"><span>${app.displayName}</span></div>
<div class="phones">
  <div class="phone side-l"><div class="screen"><img src="data:image/png;base64,${homeB64}"/></div></div>
  <div class="phone center"><div class="screen"><img src="data:image/png;base64,${midB64}"/></div></div>
  <div class="phone side-r"><div class="screen"><img src="data:image/png;base64,${fullB64}"/></div></div>
</div>
<div class="sub">${app.desc}</div>
</body></html>`;
}

// spotlight: 중앙 대형 폰 + 주변 피처 필 뱃지 원형 배치
function landscapeSpotlight(app, homeB64, fullB64) {
  const caps = app.captions || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1504, 741, app.color)}
body { position:relative; overflow:hidden; }
${phoneFrameCSS(260)}
.phone { z-index:5; }
.glow { position:absolute; width:600px; height:600px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 65%); top:50%; left:50%; transform:translate(-50%,-50%); }
.ring { position:absolute; width:560px; height:560px; border-radius:50%; border:1px solid rgba(255,255,255,0.08); top:50%; left:50%; transform:translate(-50%,-50%); }
.pill { position:absolute; background:rgba(255,255,255,0.13); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.18); color:#fff; font-size:13px; font-weight:600; padding:10px 22px; border-radius:999px; white-space:nowrap; z-index:6; }
.p1 { top:80px; left:100px; }
.p2 { top:200px; left:40px; }
.p3 { top:80px; right:100px; }
.p4 { top:200px; right:40px; }
.p5 { bottom:100px; left:80px; }
.p6 { bottom:100px; right:80px; }
.brand { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; z-index:10; }
.brand img { width:36px; height:36px; border-radius:8px; }
.brand span { color:rgba(255,255,255,0.8); font-size:18px; font-weight:600; }
.deco { position:absolute; border-radius:50%; opacity:0.04; background:#fff; }
.d1 { width:450px; height:450px; top:-180px; right:-100px; }
.d2 { width:350px; height:350px; bottom:-140px; left:-80px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="glow"></div><div class="ring"></div>
<div class="pill p1">${caps[0] || app.displayName}</div>
<div class="pill p2">${caps[1] || app.desc}</div>
<div class="pill p3">${caps[2] || ''}</div>
<div class="phone"><div class="screen"><img src="data:image/png;base64,${fullB64}"/></div></div>
<div class="brand"><img src="${app.icon}"><span>${app.displayName} — ${app.desc}</span></div>
</body></html>`;
}

// flow-story: 3폰 수평 시퀀스 + 화살표 + 스텝 라벨
function landscapeFlowStory(app, homeB64, midB64, fullB64) {
  const steps = app.captions || ['시작', '진행', '결과'];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1504, 741, app.color)}
body { position:relative; flex-direction:column; gap:0; overflow:hidden; }
.brand { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.brand img { width:36px; height:36px; border-radius:8px; }
.brand span { color:#fff; font-size:20px; font-weight:700; }
.flow { display:flex; align-items:center; gap:0; }
.step { display:flex; flex-direction:column; align-items:center; gap:10px; }
.step-label { color:rgba(255,255,255,0.85); font-size:12px; font-weight:600; padding:5px 14px; background:rgba(255,255,255,0.12); border-radius:999px; }
${phoneFrameCSS(170)}
.arrow { color:rgba(255,255,255,0.35); font-size:36px; font-weight:300; padding:0 12px; margin-top:-20px; }
.sub { color:rgba(255,255,255,0.6); font-size:14px; margin-top:12px; }
.deco { position:absolute; border-radius:50%; opacity:0.05; background:#fff; }
.d1 { width:350px; height:350px; top:-100px; left:-60px; }
.d2 { width:280px; height:280px; bottom:-80px; right:-40px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div>
<div class="brand"><img src="${app.icon}"><span>${app.displayName}</span></div>
<div class="flow">
  <div class="step">
    <div class="step-label">STEP 1</div>
    <div class="phone"><div class="screen"><img src="data:image/png;base64,${homeB64}"/></div></div>
    <div class="sub">${steps[0]}</div>
  </div>
  <div class="arrow">›</div>
  <div class="step">
    <div class="step-label">STEP 2</div>
    <div class="phone"><div class="screen"><img src="data:image/png;base64,${midB64}"/></div></div>
    <div class="sub">${steps[1]}</div>
  </div>
  <div class="arrow">›</div>
  <div class="step">
    <div class="step-label">STEP 3</div>
    <div class="phone"><div class="screen"><img src="data:image/png;base64,${fullB64}"/></div></div>
    <div class="sub">${steps[2]}</div>
  </div>
</div>
</body></html>`;
}

// overlap-duo: 2폰 겹침 배치 (앞뒤로 살짝 겹침) + 하단 브랜드
function landscapeOverlapDuo(app, homeB64, fullB64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1504, 741, app.color)}
body { position:relative; overflow:hidden; }
.phones { position:relative; display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
${phoneFrameCSS(220)}
.phone-back { position:absolute; left:50%; top:50%; transform:translate(-70%,-52%) rotate(-6deg); opacity:0.75; z-index:1; }
.phone-front { position:absolute; left:50%; top:50%; transform:translate(-30%,-48%) rotate(3deg); z-index:3; box-shadow:0 24px 60px rgba(0,0,0,0.35); }
.brand { position:absolute; top:28px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; z-index:10; }
.brand img { width:40px; height:40px; border-radius:10px; }
.brand span { color:#fff; font-size:22px; font-weight:700; }
.sub { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,0.7); font-size:16px; font-weight:500; z-index:10; }
.glow { position:absolute; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%); top:45%; left:50%; transform:translate(-50%,-50%); }
.deco { position:absolute; border-radius:50%; opacity:0.05; background:#fff; }
.d1 { width:400px; height:400px; top:-130px; right:-80px; }
.d2 { width:300px; height:300px; bottom:-100px; left:-60px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div><div class="glow"></div>
<div class="brand"><img src="${app.icon}"><span>${app.displayName}</span></div>
<div class="phones">
  <div class="phone phone-back"><div class="screen"><img src="data:image/png;base64,${homeB64}"/></div></div>
  <div class="phone phone-front"><div class="screen"><img src="data:image/png;base64,${fullB64}"/></div></div>
</div>
<div class="sub">${app.desc}</div>
</body></html>`;
}

// tilted-single: 큰 폰 1대 기울임 + 피처 카드 떠다님
function landscapeTiltedSingle(app, homeB64, fullB64) {
  const caps = app.captions || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}
<style>
${baseStyle(1504, 741, app.color)}
body { position:relative; overflow:hidden; }
${phoneFrameCSS(260)}
.phone { position:absolute; right:120px; top:50%; transform:translateY(-50%) rotate(5deg); z-index:5; box-shadow:0 24px 60px rgba(0,0,0,0.35); }
.cards { position:absolute; left:60px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:14px; z-index:3; }
.card { background:rgba(255,255,255,0.12); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.15); border-radius:16px; padding:16px 24px; color:#fff; max-width:380px; }
.card .num { font-size:11px; font-weight:700; opacity:0.5; margin-bottom:4px; }
.card .txt { font-size:16px; font-weight:600; line-height:1.4; }
.brand { position:absolute; top:28px; left:60px; display:flex; align-items:center; gap:10px; z-index:10; }
.brand img { width:40px; height:40px; border-radius:10px; }
.brand span { color:#fff; font-size:22px; font-weight:700; }
.glow { position:absolute; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%); top:50%; right:200px; transform:translateY(-50%); }
.deco { position:absolute; border-radius:50%; opacity:0.05; background:#fff; }
.d1 { width:450px; height:450px; bottom:-180px; left:-100px; }
.d2 { width:250px; height:250px; top:-80px; right:400px; }
</style></head><body>
<div class="deco d1"></div><div class="deco d2"></div><div class="glow"></div>
<div class="brand"><img src="${app.icon}"><span>${app.displayName}</span></div>
<div class="cards">
  ${caps.map((c, i) => `<div class="card"><div class="num">0${i+1}</div><div class="txt">${c}</div></div>`).join('')}
</div>
<div class="phone"><div class="screen"><img src="data:image/png;base64,${fullB64}"/></div></div>
</body></html>`;
}

function screenshotLandscapeHTML(app, homeB64, fullB64, midB64) {
  const layout = app.landscapeLayout || 'overlap-duo';
  switch (layout) {
    case 'triple-fan': return landscapeTripleFan(app, homeB64, midB64 || homeB64, fullB64);
    case 'spotlight': return landscapeSpotlight(app, homeB64, fullB64);
    case 'flow-story': return landscapeFlowStory(app, homeB64, midB64 || homeB64, fullB64);
    case 'overlap-duo': return landscapeOverlapDuo(app, homeB64, fullB64);
    case 'tilted-single': return landscapeTiltedSingle(app, homeB64, fullB64);
    default: return landscapeOverlapDuo(app, homeB64, fullB64);
  }
}

// --- Icon resolver: use local app-logos file as base64 data URI ---
function resolveIconSrc(app) {
  const localPath = path.join(BASE, 'app-logos', `${app.name}.png`);
  if (fs.existsSync(localPath)) {
    const b64 = fs.readFileSync(localPath).toString('base64');
    return `data:image/png;base64,${b64}`;
  }
  // Fallback to GitHub URL
  return app.icon;
}

// --- Main ---
async function generateForApp(browser, app) {
  // Override icon with local file
  app.icon = resolveIconSrc(app);

  const subDir = path.join(BASE, app.name, 'submission');
  fs.mkdirSync(subDir, { recursive: true });

  // Read interactive screenshots (screen-1/2/3) with fallback to raw-home/raw-full
  const screenPaths = [1, 2, 3].map(i => path.join(BASE, app.name, 'raw', `screen-${i}.png`));
  const homePath = path.join(BASE, app.name, 'raw', 'raw-home.png');
  const fullPath = path.join(BASE, app.name, 'raw', 'raw-full.png');

  // Use screen-1/2/3 if available, otherwise fallback
  const hasScreens = screenPaths.every(p => fs.existsSync(p));
  let screenB64s;
  if (hasScreens) {
    screenB64s = screenPaths.map(p => fs.readFileSync(p).toString('base64'));
  } else if (fs.existsSync(homePath)) {
    const homeB64 = fs.readFileSync(homePath).toString('base64');
    const fullB64 = fs.existsSync(fullPath) ? fs.readFileSync(fullPath).toString('base64') : homeB64;
    screenB64s = [homeB64, fullB64, fullB64];
  } else {
    console.log(`  [SKIP] no screenshots found`); return;
  }

  const page = await browser.newPage();

  // 1. Thumbnail square (1000×1000)
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.setContent(thumbSquareHTML(app));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(subDir, 'thumb-square.png') });
  console.log(`  [OK] thumb-square.png`);

  // 2. Thumbnail landscape (1932×828)
  await page.setViewportSize({ width: 1932, height: 828 });
  await page.setContent(thumbLandscapeHTML(app, screenB64s[0]));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(subDir, 'thumb-landscape.png') });
  console.log(`  [OK] thumb-landscape.png`);

  // 3. Screenshot portrait ×3 (636×1048) — each uses different screen capture
  for (let i = 0; i < 3; i++) {
    const imgB64 = screenB64s[i];
    await page.setViewportSize({ width: 636, height: 1048 });
    await page.setContent(screenshotPortraitHTML(app, imgB64, app.captions[i]));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(subDir, `screenshot-${i + 1}.png`) });
    console.log(`  [OK] screenshot-${i + 1}.png`);
  }

  // 4. Screenshot landscape (1504×741) — uses app-specific layout
  await page.setViewportSize({ width: 1504, height: 741 });
  await page.setContent(screenshotLandscapeHTML(app, screenB64s[0], screenB64s[2], screenB64s[1]));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(subDir, 'screenshot-landscape.png') });
  console.log(`  [OK] screenshot-landscape.png`);

  await page.close();
}

async function main() {
  const targetApp = process.argv[2];
  const targetApps = targetApp ? apps.filter(a => a.name === targetApp) : apps;

  if (targetApps.length === 0) {
    console.log(`App not found: ${targetApp}`);
    console.log(`Available: ${apps.map(a => a.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`=== Generating submission images for ${targetApps.length} app(s) ===\n`);

  const browser = await chromium.launch();

  for (let i = 0; i < targetApps.length; i++) {
    const app = targetApps[i];
    console.log(`[${i + 1}/${targetApps.length}] ${app.name} (${app.displayName})`);
    try {
      await generateForApp(browser, app);
    } catch (e) {
      console.log(`  [ERROR] ${e.message}`);
    }
    console.log('');
  }

  await browser.close();

  // Summary
  console.log('=== Summary ===');
  for (const app of targetApps) {
    const subDir = path.join(BASE, app.name, 'submission');
    const files = ['thumb-square.png', 'thumb-landscape.png', 'screenshot-1.png', 'screenshot-2.png', 'screenshot-3.png', 'screenshot-landscape.png'];
    const status = files.map(f => fs.existsSync(path.join(subDir, f)) ? 'OK' : 'MISS').join(' ');
    console.log(`  ${app.name}: ${status}`);
  }
  console.log('\n=== Done ===');
}

main().catch(e => { console.error(e); process.exit(1); });
