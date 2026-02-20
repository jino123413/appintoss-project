# Backend Performance Metrics (BMAD)

## Scope
- Date: 2026-02-20
- Endpoint: `/promos?sort=popular`
- Target: `https://165.232.168.243.nip.io`
- Tool: `npm run perf:collect`
- Load profile: `PERF_REQUESTS=120`, `PERF_CONCURRENCY=20`
- Success criteria for comparison: `okCount=120`, `errorCount=0`

## Before Optimization (No `/promos` cache)
- Raw file: `test-results/perf/api-perf-2026-02-20T07-10-43-046Z.json`
- Commit context: `608fed9` deployment line

| Metric | Sequential | Concurrent |
|---|---:|---:|
| avg latency | 399.18ms | 560.96ms |
| p50 latency | 450.93ms | 515.14ms |
| p95 latency | 479.35ms | 884.70ms |
| max latency | 525.46ms | 1034.67ms |
| throughput | - | 33.69 RPS |
| errors | 0/120 | 0/120 |

## After Optimization (`/promos` in-memory TTL cache)
- Raw file: `test-results/perf/api-perf-2026-02-20T07-17-53-185Z.json`
- Commit context: `5968139` deployment line
- Cache config: `PROMOS_CACHE_TTL_MS=30000`

| Metric | Sequential | Concurrent |
|---|---:|---:|
| avg latency | 377.77ms | 307.73ms |
| p50 latency | 437.43ms | 232.78ms |
| p95 latency | 466.23ms | 529.12ms |
| max latency | 501.62ms | 566.53ms |
| throughput | - | 61.46 RPS |
| errors | 0/120 | 0/120 |

## Delta (After vs Before)
- Sequential avg latency: `-5.36%`
- Sequential p95 latency: `-2.74%`
- Concurrent avg latency: `-45.14%`
- Concurrent p95 latency: `-40.19%`
- Throughput (RPS): `+82.43%`

## Notes
- This optimization is strongest for repeated identical list queries (`brand + promoType + q + sort`) during burst traffic.
- Cache is cleared after successful `POST /v1/admin/scrape`.
- Future step: add cache hit ratio metric to `/v1/meta/refresh` for long-run production tracking.
