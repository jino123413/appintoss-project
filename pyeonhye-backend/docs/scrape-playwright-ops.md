# Scrape QA with Playwright CLI

## 목적
- 실제 브랜드 페이지가 렌더되는지 점검
- 현재 셀렉터가 유효한지 점검
- 노이즈 텍스트 비율/UNKNOWN 비율을 정량 확인

## 대상 파일
- Spec: `scripts/playwright/brand-render.spec.ts`
- Selector source: `src/scrapers/*.ts`
- Parser logic: `src/scrapers/parser.ts`

## 설치

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## 실행

```bash
npx playwright test scripts/playwright/brand-render.spec.ts --project=chromium --reporter=list
```

## 출력 지표
각 브랜드별로 아래를 출력한다.
- matched: item selector에 매칭된 노드 수
- checked: 실제 분석한 노드 수
- titleCoverage: 제목 추출 성공 비율
- promoCoverage: 프로모션 텍스트 추출 성공 비율
- unknownRatio: 프로모션 타입 추론 실패 비율
- noiseRatio: 노이즈 텍스트 비율
- sample: 샘플 타이틀

## 판정 규칙
- Hard fail
  - 페이지 응답 비정상(2xx 아님)
  - item selector가 하나도 매칭되지 않음
  - titleCoverage < 0.5
- Warning (test annotation)
  - `unknownRatio > PW_WARNING_UNKNOWN_RATIO` (기본 0.85)
  - `noiseRatio > PW_WARNING_NOISE_RATIO` (기본 0.10)

## 환경 변수(선택)
- `PW_WARNING_UNKNOWN_RATIO`
- `PW_WARNING_NOISE_RATIO`
- `PW_MAX_ITEMS_TO_CHECK`

예시:

```bash
PW_WARNING_UNKNOWN_RATIO=0.75 PW_WARNING_NOISE_RATIO=0.08 npx playwright test scripts/playwright/brand-render.spec.ts --project=chromium --reporter=list
```

## 운영 권장
- 주간 스크래핑 실행 전 1회 점검
- 셀렉터 변경 커밋마다 CI에서 실행
- warning 누적 시 selector 튜닝 우선순위 상향