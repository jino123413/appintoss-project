# 편혜 (pyeonhye)

편의점 행사상품 모아보기 미니앱입니다.

## 핵심 기능
- 브랜드 탭: `ALL`, `CU`, `GS25`, `SEVEN`, `EMART24`
- 행사 필터: `ALL`, `1+1`, `2+1`, `DISCOUNT`
- 키워드 검색
- 메인 탭: `목록(핵심)`, `비교(부가)`, `북마크`
- 목록 탭은 광고 없이 탐색 가능
- 비교 탭 첫 진입 시 세션당 1회 자연 광고
- 추가 광고 게이트
  - 비교 상세 확장
  - 북마크 일괄 갱신 체크

## 백엔드 연동
- 기본 API 주소: `http://localhost:3000`
- 환경변수
  - `VITE_API_BASE_URL`: API base URL
  - `VITE_AD_GROUP_ID`: 광고 그룹 ID (미지정 시 테스트 ID 사용)
- 요청 엔드포인트 우선순위
  - `GET {VITE_API_BASE_URL}/promos`
  - `GET {VITE_API_BASE_URL}/v1/offers`
  - `GET {VITE_API_BASE_URL}/offers`

## 로컬 실행
```bash
cd pyeonhye
npm install --legacy-peer-deps
npm run dev
```

## 빌드
```bash
cd pyeonhye
npm run build
```

## 배포 메모
- 프론트 배포: `pyeonhye/DEPLOY.md`
- 백엔드 배포: `pyeonhye-backend/deploy/DO_DROPLET_SETUP.md`

## 기술 메모
- 광고 훅: `useInterstitialAd`
- 저장소 훅: `useJsonStorage`
- 기본 광고 그룹 ID: `ait-ad-test-interstitial-id`
