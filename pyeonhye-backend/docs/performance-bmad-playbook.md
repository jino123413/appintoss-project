# 백엔드 성능 포트폴리오 준비 (BMAD 실행 가이드)

## 목표
- 면접에서 "성능 개선을 했다"가 아니라 "문제 정의부터 수치 개선까지 재현 가능하게 수행했다"를 증명한다.
- `pyeonhye-backend` 기준으로 1개 개선 스토리를 완성한다.

## BMAD 순서 (Build -> Measure -> Analyze -> Decide)

## 1) Build (준비)
1. 개선 대상 API를 1개 고정한다.
2. 성공 기준(SLO)을 먼저 적는다.
3. 측정 스크립트를 준비한다.
4. 측정 결과를 저장할 경로를 고정한다.

### 권장 대상
- API: `/promos?limit=50`
- 이유: 프론트 홈 진입 시 반복 호출되는 핵심 경로

### 권장 SLO 예시
- `p95 < 300ms`
- `error rate < 1%`
- `동일 조건 대비 처리량 +30% 이상`

### 실행 명령
```bash
npm run perf:collect
```

외부 HTTPS 기준으로 측정할 때:
```bash
PERF_BASE_URL=https://165.232.168.243.nip.io npm run perf:collect
```

---

## 2) Measure (기준선 수집)
1. 개선 전 수치를 최소 3회 수집한다.
2. 동일한 시간대/조건(샘플 수, 동시성, 엔드포인트)을 유지한다.
3. 산출물(JSON)을 커밋 가능한 형태로 보관한다.

### 수집 항목
- Sequential: avg, p50, p95, max
- Concurrent: avg, p50, p95, max, RPS
- 에러율(status 0 or non-2xx)

### 산출물 위치
- `test-results/perf/api-perf-*.json`

---

## 3) Analyze (병목 분석)
1. DB 쿼리 실행계획을 확인한다.
2. 페이로드 크기와 조회 건수(limit)를 점검한다.
3. 쓰기 경로에서 전체 삭제/재삽입 여부를 점검한다.
4. 스크래핑 실행 구조(순차/병렬)를 확인한다.

### 현재 코드 기준 체크 포인트
- `/promos` 대량 응답: `src/routes/registerRoutes.ts`
- 목록 조회 쿼리/정렬: `src/db/offersRepository.ts`
- 전체 delete 후 batch insert: `src/db/offersRepository.ts`
- 스크래퍼 순차 처리: `src/services/scrapeService.ts`

---

## 4) Decide (개선안 선택 및 실험)
1. 1차 실험은 한 가지 축만 고른다.
2. 개선 적용 후 같은 측정을 반복한다.
3. 전/후 수치를 표로 정리한다.
4. 한계와 부작용까지 명시한다.

### 추천 1차 실험 주제 (난이도/임팩트 균형)
- `/promos` 응답 캐시(짧은 TTL) 또는 limit 현실화

### 추천 2차 실험 주제
- 스크래핑 병렬화(브랜드별 bounded concurrency)

### 추천 3차 실험 주제
- `replaceOffers` 전체 삭제 방식 -> 델타 업서트/스테이징 스왑

---

## 포트폴리오 제출 템플릿
1. 문제: 어떤 트래픽/지표가 나빴는가
2. 가설: 왜 느렸다고 판단했는가
3. 실험: 어떤 변경을 했는가
4. 결과: 전/후 수치(표, 그래프)
5. 한계: 아직 남은 리스크와 다음 액션

예시 문장:
- "p95 412ms에서 238ms로 42.2% 개선, RPS 29.7 -> 41.9(+41.1%)"
- "대신 메모리 사용량이 12MB 증가해 TTL 정책을 추가함"
