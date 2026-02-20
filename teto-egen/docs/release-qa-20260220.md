# teto-egen 릴리즈 QA (2026-02-20)

## 반려 사유
- 로고 이미지 호스팅 미확인/접근 불가로 심사 반려

## 조치 내용
1. 공개 호스팅 저장소 생성: `https://github.com/jino123413/teto-egen-hosting`
2. GitHub Pages 배포: `https://jino123413.github.io/teto-egen-hosting/`
3. 로고/약관/개인정보 URL 고정
   - 로고: `https://jino123413.github.io/teto-egen-hosting/teto-egen-logo-600.png`
   - 이용약관: `https://jino123413.github.io/teto-egen-hosting/terms.html`
   - 개인정보처리방침: `https://jino123413.github.io/teto-egen-hosting/privacy.html`
4. 앱 설정 반영
   - `granite.config.ts`의 `brand.icon`을 Pages 로고 URL로 변경

## 워크플로우 체크리스트 기반 검증
- [x] `displayName`이 콘솔 등록 이름과 일치
- [x] `brand.icon`이 공개 URL(200 응답) 사용
- [x] 이용약관/개인정보처리방침 URL 공개 접근 가능(200 응답)
- [x] `docs/terms.html`, `docs/privacy.html` 로컬 원본 유지
- [x] `npm run build` 성공 (`.ait` 빌드 완료)

## 재제출 전 최종 확인
1. 콘솔 앱 정보의 로고 URL을 위 Pages URL로 입력/동기화
2. 콘솔 약관/개인정보 URL을 위 Pages URL로 입력
3. 새 번들 업로드 후 검토 재요청

