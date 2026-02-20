# 넌 테토야 에겐이야

Apps in Toss 미니앱 `teto-egen`의 운영 문서입니다.

## 1) 앱 개요
- 목적: 테토 에겐 성향 실험
- 분류: 테스트/게임
- 디렉터리: `teto-egen`

## 2) 식별 정보
| 항목 | 값 |
|---|---|
| displayName | 넌 테토야 에겐이야 |
| appName | teto-egen |
| package name | teto-egen |
| version | 1.0.0 |
| primaryColor | #007779 |
| icon | https://jino123413.github.io/teto-egen-hosting/teto-egen-logo-600.png |

## 2-1) 공개 호스팅 URL (심사 제출용)
- 로고: `https://jino123413.github.io/teto-egen-hosting/teto-egen-logo-600.png`
- 이용약관: `https://jino123413.github.io/teto-egen-hosting/terms.html`
- 개인정보처리방침: `https://jino123413.github.io/teto-egen-hosting/privacy.html`

## 3) 개발/빌드/배포
```bash
npm install --legacy-peer-deps
npm run dev
npm run build
npm run deploy
```

### 스크립트 목록
| script | command |
|---|---|
| build | `granite build` |
| capture:submission | `node capture-submission.js` |
| deploy | `ait deploy` |
| dev | `granite dev` |

## 4) 기술 스냅샷
- dependencies: 6개
- devDependencies: 7개
- 주요 의존성: @apps-in-toss/web-framework, @granite-js/native, react, react-dom, remixicon, tailwindcss

## 5) 문서/정책 체크
- 이용약관(`docs/terms.html`): True
- 개인정보처리방침(`docs/privacy.html`): True
- 레이아웃 구조(`docs/layout-structure.md`): True
- 아키텍처(`docs/architecture.md`): True
- 차별화(`docs/differentiation.md`): True
- 앱 내부 `.git`: False

## 6) docs 파일
- docs/architecture.md
- docs/differentiation.md
- docs/layout-structure.md
- docs/privacy.html
- docs/terms.html

## 7) 릴리즈 감독
- 루트에서 아래 명령으로 전체 게이트 점검:
```powershell
powershell -ExecutionPolicy Bypass -File .\audit-release-gates.ps1 -RootPath . -VaultPath .\wlsgh
```
