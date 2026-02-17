# 넌 테토야 에겐이야

테토/에겐 성향을 가볍게 확인하는 Apps in Toss 웹뷰 미니앱입니다.

## 핵심 기능

- 이름 + 3문항으로 성향 분석
- 날짜 기반 일일 변동 분석 (같은 날 동일 결과)
- 무료 핵심 결과 + 심층 단면은 광고 시청 후 열람
- 연속 방문 스트릭과 최근 기록 저장

## 광고 정책

- 핵심 기능(기본 결과)은 광고 없이 제공
- 부가 기능(심층 단면 열기)에만 전면 광고 노출
- 광고 버튼에 AD 배지와 사전 고지 문구 표시

## 개발

```bash
npm install --legacy-peer-deps
npm run dev
npm run build
```

## 기술 스택

- Granite (웹뷰 모드, Rsbuild)
- React + TypeScript
- Tailwind CSS v3
- @apps-in-toss/web-framework (Storage, GoogleAdMob)
