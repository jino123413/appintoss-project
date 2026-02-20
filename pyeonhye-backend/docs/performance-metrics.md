# 성능 측정 기록 (Baseline -> Improved)

## 측정 환경
- 서버: DigitalOcean Ubuntu 22.04 (1 vCPU / 2GB)
- API: `pyeonhye-backend`
- 측정 대상: `/promos?limit=50`
- 측정 방법: `npm run perf:collect` + 운영 서버 실측

## Baseline (2026-02-20)

### 내부 직접 호출 (http://127.0.0.1:3000)
| Metric | Value |
|---|---|
| avg | 21.2ms |
| p50 | 18.6ms |
| p95 | 34.3ms |
| max | 60.5ms |

### 외부 HTTPS 호출 (https://165.232.168.243.nip.io)
| Metric | Value |
|---|---|
| avg | 115.8ms |
| p50 | 114.9ms |
| p95 | 126.5ms |
| max | 128.6ms |

### 간이 동시부하
| Condition | Result |
|---|---|
| requests=200, concurrency=20 | ~29.7 RPS |

## 자동 측정 스크립트 실행 로그

### Run A (로컬 루프백)
- 명령: `npm run perf:collect`
- target: `http://127.0.0.1:3000/promos?limit=50`
- sequential: avg 1.33ms / p95 1.51ms
- concurrent: avg 5.58ms / p95 8.06ms / rps 2951.79
- output: `test-results/perf/api-perf-2026-02-20T06-53-52-484Z.json`

### Run B (외부 HTTPS 실측, 클라이언트=개발 PC)
- 명령: `PERF_BASE_URL=https://165.232.168.243.nip.io npm run perf:collect`
- target: `https://165.232.168.243.nip.io/promos?limit=50`
- sequential: avg 357.08ms / p95 465.85ms
- concurrent: avg 642.08ms / p95 1010.28ms / rps 25.94
- output: `test-results/perf/api-perf-2026-02-20T06-54-36-719Z.json`
- 주의: 이 값은 네트워크 구간이 포함된 E2E 체감 지표이며, 서버 내부 측정과 분리해서 봐야 한다.

## 개선 후 기록 (채우기)
| 항목 | Baseline | After | 개선율 |
|---|---:|---:|---:|
| avg latency (external) | 115.8ms | - | - |
| p95 latency (external) | 126.5ms | - | - |
| throughput (RPS) | 29.7 | - | - |
| error rate | - | - | - |

## 근거 파일
- raw 결과: `test-results/perf/api-perf-*.json`
- 개선 설명: `docs/performance-storyline.md`
- 실행 가이드: `docs/performance-bmad-playbook.md`
