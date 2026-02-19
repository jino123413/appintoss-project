# 편혜 출시 전 체크리스트 (2026-02-20)

## 1) 워크플로/반려 리스크
- [x] 핵심 기능(목록/검색/필터)은 광고 없이 사용 가능
- [x] 광고는 부가 기능(비교 첫 진입/비교 상세/북마크 갱신 체크)에만 배치
- [x] 광고 트리거 UI에 AD 배지 노출
- [x] 광고 사전 고지 문구 노출
- [x] 운영 광고 ID 적용 (`ait.v2.live.012aa2a0d0b84229`)

## 2) QA 실행 결과
- [x] 프론트 빌드 통과 (`npm run build`, pyeonhye)
- [x] 백엔드 빌드 통과 (`npm run build`, pyeonhye-backend)
- [x] Playwright 크롤링 점검 통과 (`npm run crawl:check`, 4/4)
- [x] Playwright UX 흐름 캡처 통과 (`npm run ux:capture`)

## 3) 외부 링크/호스팅 검증
- [x] 아이콘 URL 200
  - `https://raw.githubusercontent.com/jino123413/appintoss-project/main/pyeonhye/assets/logo/pyeonhye-logo-600.png`
- [x] 이용약관 URL 200
  - `https://raw.githack.com/jino123413/appintoss-project/main/pyeonhye/docs/terms.html`
- [x] 개인정보처리방침 URL 200
  - `https://raw.githack.com/jino123413/appintoss-project/main/pyeonhye/docs/privacy.html`
- [ ] GitHub Pages 경로(`https://jino123413.github.io/pyeonhye/*`) 200 전환

## 4) 남은 운영 작업
- [ ] 토스 콘솔 앱 등록
- [ ] 기능 스킴 `intoss://pyeonhye/home` 등록
- [ ] `app-logos` 저장소에 `pyeonhye.png` 업로드
- [ ] 백엔드 HTTPS 도메인 연결 (현재 IP HTTP 기반)
